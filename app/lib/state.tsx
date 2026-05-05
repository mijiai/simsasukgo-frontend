'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { logError } from './log';
import { riskMeta } from './risk';
import { uploadFilesSequentially } from './upload';
import type { Department } from './departments';
import type {
  RiskLevel,
  CreateAnalysisJobResponse,
  CollectCompanyDataResponse,
  AnalyzeFinancialsResponse,
  ReportGenerateResponse,
  GetAnalysisJobDetailResponse,
} from './analysis-types';
import {
  analyzeSummaryToAnalyzeResponse,
  collectSummaryToCollectResponse,
  detailToReportResponse,
  isRecoverableError,
  pollJobUntilDone,
  withTimeout,
} from './poll-job';

export type { RiskLevel };

// =============================================================
// Domain types — the shapes our UI passes around.
// =============================================================
export type StepStatus = 'idle' | 'running' | 'done' | 'error';
export type StepKey = 'upload' | 'create' | 'collect' | 'analyze' | 'report';

export interface PipelineStep {
  key: StepKey;
  title: string;
  desc: string;
  status: StepStatus;
}

export interface AnalysisRunResult {
  job: CreateAnalysisJobResponse;
  collect: CollectCompanyDataResponse;
  analysis: AnalyzeFinancialsResponse;
  report: ReportGenerateResponse;
}

export interface AnalysisRun {
  runId: number;
  companyName: string;
  customPrompt: string;
  fileNames: string[];
  steps: PipelineStep[];
  status: 'running' | 'done' | 'error';
  error: string | null;
  result: AnalysisRunResult | null;
  savedReportId: number | null;
}

export interface SavedReport {
  id: number;
  jobId: string | null;
  companyId: string | null;
  name: string;
  customPrompt: string;
  dept: string;
  rating: string;
  ratingName: string;
  riskLevel: RiskLevel;
  riskScore: number | null;
  keyRiskFactors: unknown[];
  dataGaps: unknown[];
  newsCount: number | null;
  reportUrl: string | null;
  docxUrl: string | null;
  date: string;
}

// 4 MCP-pipeline steps. The `upload` step is prepended dynamically when the
// user attaches files (Step 3).
const STEPS_TEMPLATE: PipelineStep[] = [
  { key: 'create',  title: '분석 작업 생성', desc: '심사숙고 작업을 시작하고 있어요.',           status: 'idle' },
  { key: 'collect', title: '기업 데이터 수집', desc: '뉴스와 재무 자료를 모으고 있어요.',         status: 'idle' },
  { key: 'analyze', title: '재무 위험 분석',   desc: 'AI가 위험 요인과 점수를 판단하고 있어요.', status: 'idle' },
  { key: 'report',  title: '보고서 생성',     desc: '여신심사 보고서를 작성하고 있어요.',         status: 'idle' },
];

const buildUploadStep = (fileCount: number): PipelineStep => ({
  key: 'upload',
  title: '파일 업로드',
  desc: `${fileCount}개 파일을 안전하게 업로드합니다.`,
  status: 'idle',
});

// =============================================================
// Context
// =============================================================
type AnalysisRunUpdater =
  | AnalysisRun
  | null
  | ((prev: AnalysisRun | null) => AnalysisRun | null);

export interface StartAnalysisInput {
  companyName: string;
  customPrompt: string;
  files: File[];
  dept?: Department | '';
}

interface AppContextValue {
  analysisRun: AnalysisRun | null;
  savedReports: SavedReport[];
  setAnalysisRun: (updater: AnalysisRunUpdater) => void;
  setSavedReports: (
    updater: SavedReport[] | ((prev: SavedReport[]) => SavedReport[])
  ) => void;
  startAnalysis: (input: StartAnalysisInput) => void;
  deleteStoredReport: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// =============================================================
// Recovery wrappers — Vercel cap (Hobby 60s) can clip long MCP calls.
// We abort ~50s in and poll get_analysis_job_detail until the relevant stage
// is persisted by the backend, then synthesize the per-stage response shape.
// =============================================================

type StepUpdater = (key: StepKey, partial: Partial<PipelineStep>) => void;

async function runCollectWithRecovery(
  jobId: string,
  companyName: string,
  updateStep: StepUpdater
): Promise<CollectCompanyDataResponse> {
  try {
    return await withTimeout(
      postJSON<CollectCompanyDataResponse>('/api/mcp/collect', { jobId, companyName }),
      50_000
    );
  } catch (err) {
    if (!isRecoverableError(err)) throw err;
    updateStep('collect', { desc: '데이터 수집 결과를 기다리는 중...' });
    const detail = await pollJobUntilDone(
      jobId,
      (path, body) => postJSON<GetAnalysisJobDetailResponse>(path, body),
      {
        intervalMs: 4_000,
        maxAttempts: 30,
        isComplete: (d) => d.collect != null,
      }
    );
    return collectSummaryToCollectResponse(jobId, detail);
  }
}

async function runAnalyzeWithRecovery(
  jobId: string,
  updateStep: StepUpdater
): Promise<AnalyzeFinancialsResponse> {
  try {
    return await withTimeout(
      postJSON<AnalyzeFinancialsResponse>('/api/mcp/analyze', { jobId }),
      50_000
    );
  } catch (err) {
    if (!isRecoverableError(err)) throw err;
    updateStep('analyze', { desc: '재무 분석 결과를 기다리는 중...' });
    const detail = await pollJobUntilDone(
      jobId,
      (path, body) => postJSON<GetAnalysisJobDetailResponse>(path, body),
      {
        intervalMs: 4_000,
        maxAttempts: 30,
        isComplete: (d) => d.analyze != null,
      }
    );
    return analyzeSummaryToAnalyzeResponse(jobId, detail);
  }
}

async function runReportWithRecovery(
  jobId: string,
  updateStep: StepUpdater
): Promise<ReportGenerateResponse> {
  try {
    return await withTimeout(
      postJSON<ReportGenerateResponse>('/api/mcp/report', { jobId }),
      50_000
    );
  } catch (err) {
    if (!isRecoverableError(err)) throw err;
    updateStep('report', { desc: '보고서 생성이 길어지고 있어요. 결과를 기다리는 중...' });
    const detail = await pollJobUntilDone(
      jobId,
      (path, body) => postJSON<GetAnalysisJobDetailResponse>(path, body),
      {
        intervalMs: 5_000,
        maxAttempts: 36,
        onProgress: (d) => {
          if (d.report?.md_url) {
            updateStep('report', { desc: '보고서 생성 거의 완료' });
          }
        },
      }
    );
    return detailToReportResponse(detail);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [analysisRun, setAnalysisRunState] = useState<AnalysisRun | null>(null);
  const [savedReports, setSavedReportsState] = useState<SavedReport[]>([]);

  const setAnalysisRun = useCallback((updater: AnalysisRunUpdater) => {
    setAnalysisRunState((prev) =>
      typeof updater === 'function'
        ? (updater as (p: AnalysisRun | null) => AnalysisRun | null)(prev)
        : updater
    );
  }, []);

  const setSavedReports = useCallback(
    (updater: SavedReport[] | ((prev: SavedReport[]) => SavedReport[])) => {
      setSavedReportsState((prev) =>
        typeof updater === 'function'
          ? (updater as (p: SavedReport[]) => SavedReport[])(prev)
          : updater
      );
    },
    []
  );

  const deleteStoredReport = useCallback((id: number) => {
    setSavedReportsState((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const startAnalysis = useCallback(
    (input: StartAnalysisInput) => {
      const { companyName, customPrompt, files } = input;
      const dept = input.dept || '';
      const runId = Date.now();
      const hasFiles = files.length > 0;
      const fileNames = files.map((f) => f.name);

      const initialSteps: PipelineStep[] = [
        ...(hasFiles ? [buildUploadStep(files.length)] : []),
        ...STEPS_TEMPLATE.map((s) => ({ ...s, status: 'idle' as StepStatus })),
      ];

      setAnalysisRunState({
        runId,
        companyName,
        customPrompt,
        fileNames,
        steps: initialSteps,
        status: 'running',
        result: null,
        error: null,
        savedReportId: null,
      });
      router.push('/report');

      const updateStep = (key: StepKey, partial: Partial<PipelineStep>) =>
        setAnalysisRunState((prev) =>
          prev && prev.runId === runId
            ? {
                ...prev,
                steps: prev.steps.map((s) => (s.key === key ? { ...s, ...partial } : s)),
              }
            : prev
        );

      (async () => {
        try {
          let fileBlobPaths: string[] = [];
          if (hasFiles) {
            updateStep('upload', { status: 'running' });
            const uploaded = await uploadFilesSequentially(files, (cur, total, filename) => {
              updateStep('upload', { desc: `${cur}/${total} — ${filename}` });
            });
            fileBlobPaths = uploaded.map((r) => r.blobPath);
            updateStep('upload', {
              status: 'done',
              desc: `${files.length}개 파일 업로드 완료`,
            });
          }

          updateStep('create', { status: 'running' });
          const job = await postJSON<CreateAnalysisJobResponse>('/api/mcp/create-job', {
            companyName,
            customPrompt,
            fileBlobPaths: hasFiles ? fileBlobPaths : undefined,
          });
          updateStep('create', { status: 'done' });

          updateStep('collect', { status: 'running' });
          const collect = await runCollectWithRecovery(job.job_id, companyName, updateStep);
          updateStep('collect', { status: 'done' });

          updateStep('analyze', { status: 'running' });
          const analysis = await runAnalyzeWithRecovery(job.job_id, updateStep);
          updateStep('analyze', { status: 'done' });

          updateStep('report', { status: 'running' });
          const report = await runReportWithRecovery(job.job_id, updateStep);
          updateStep('report', { status: 'done' });

          const meta = riskMeta(analysis.risk_level);
          const saved: SavedReport = {
            id: Date.now(),
            jobId: job.job_id,
            companyId: job.company_id,
            name: companyName,
            customPrompt,
            dept,
            rating: meta.rating,
            ratingName: meta.ratingName,
            riskLevel: analysis.risk_level,
            riskScore: analysis.risk_score,
            keyRiskFactors: analysis.key_risk_factors,
            dataGaps: analysis.data_gaps,
            newsCount: collect.news_count,
            reportUrl: report.report_url,
            docxUrl: report.docx_url,
            date: new Date().toISOString().slice(0, 10),
          };
          setSavedReportsState((prev) => [saved, ...prev]);
          setAnalysisRunState((prev) =>
            prev && prev.runId === runId
              ? {
                  ...prev,
                  status: 'done',
                  result: { job, collect, analysis, report },
                  savedReportId: saved.id,
                }
              : prev
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logError('analysis pipeline failed', err);
          setAnalysisRunState((prev) => {
            if (!prev || prev.runId !== runId) return prev;
            const steps = prev.steps.map((s) =>
              s.status === 'running' ? { ...s, status: 'error' as StepStatus } : s
            );
            return { ...prev, status: 'error', error: message, steps };
          });
        }
      })();
    },
    [router]
  );

  return (
    <AppContext.Provider
      value={{
        analysisRun,
        savedReports,
        setAnalysisRun,
        setSavedReports,
        startAnalysis,
        deleteStoredReport,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
