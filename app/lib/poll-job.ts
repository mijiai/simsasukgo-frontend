import type {
  AnalyzeFinancialsResponse,
  CollectCompanyDataResponse,
  GetAnalysisJobDetailResponse,
  ReportGenerateResponse,
} from './analysis-types';
import { logError } from './log';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FetchJSON<T> = (path: string, body: unknown) => Promise<T>;

/**
 * Poll get_analysis_job_detail until status reaches done/failed. Used as a
 * recovery path when /api/mcp/{collect,analyze,report} 504s — the MCP backend
 * keeps running and persists the result, so we just wait for it to appear.
 */
export async function pollJobUntilDone(
  jobId: string,
  postJSON: FetchJSON<GetAnalysisJobDetailResponse>,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: (detail: GetAnalysisJobDetailResponse) => void;
    isComplete?: (detail: GetAnalysisJobDetailResponse) => boolean;
  }
): Promise<GetAnalysisJobDetailResponse> {
  const maxAttempts = options?.maxAttempts ?? 36;
  const intervalMs = options?.intervalMs ?? 5_000;
  const isComplete = options?.isComplete ?? ((d) => d.status === 'done');

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs);
    let detail: GetAnalysisJobDetailResponse;
    try {
      detail = await postJSON('/api/mcp/get-analysis-job-detail', { jobId });
    } catch (err) {
      logError(`poll attempt ${i + 1} failed (transient)`, err);
      continue;
    }
    options?.onProgress?.(detail);
    if (detail.status === 'failed') {
      throw new Error(detail.error_message || 'job failed');
    }
    if (isComplete(detail)) return detail;
  }
  throw new Error(
    `Job polling timed out after ${(maxAttempts * intervalMs) / 1000}s`
  );
}

export function detailToReportResponse(
  detail: GetAnalysisJobDetailResponse
): ReportGenerateResponse {
  if (!detail.report?.md_url || !detail.report?.docx_url) {
    throw new Error('Job done but report URLs missing');
  }
  return {
    job_id: detail.job_id,
    status: 'done',
    risk_level: detail.analyze?.risk_level || detail.risk_level || 'MEDIUM',
    risk_score: detail.analyze?.risk_score ?? 0,
    report_url: detail.report.md_url,
    report_blob_path: detail.report.md_blob_path || '',
    docx_url: detail.report.docx_url,
    docx_blob_path: detail.report.docx_blob_path || '',
  };
}

export function collectSummaryToCollectResponse(
  jobId: string,
  detail: GetAnalysisJobDetailResponse
): CollectCompanyDataResponse {
  if (!detail.collect) throw new Error('collect summary missing');
  return {
    job_id: jobId,
    status: 'collect_done',
    company_name: detail.company_name,
    company_id: detail.company_id || '',
    news_count: detail.collect.news_count,
    uploaded_files: detail.collect.uploaded_files,
    extracted_table_count: detail.collect.extracted_table_count,
    extracted_image_count: detail.collect.extracted_image_count,
    extracted_doc_count: detail.collect.extracted_doc_count,
    financial_years: detail.collect.financial_years.map((y) => String(y)),
    has_internal_credit_data: detail.collect.has_internal_credit_data,
    output_blob_path: '',
  };
}

export function analyzeSummaryToAnalyzeResponse(
  jobId: string,
  detail: GetAnalysisJobDetailResponse
): AnalyzeFinancialsResponse {
  if (!detail.analyze) throw new Error('analyze summary missing');
  return {
    job_id: jobId,
    status: 'analyze_done',
    risk_level: detail.analyze.risk_level || 'MEDIUM',
    risk_score: detail.analyze.risk_score ?? 0,
    key_risk_factors: detail.analyze.key_risk_factors,
    data_gaps: detail.analyze.data_gaps,
    output_blob_path: '',
  };
}

/**
 * Race a promise against a timeout. We abort ~50s into a 60s-cap call so the
 * client controls the recovery flow before Vercel itself returns 504.
 */
export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error('CLIENT_TIMEOUT')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isRecoverableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message === 'CLIENT_TIMEOUT' || /HTTP (502|503|504)/.test(message);
}
