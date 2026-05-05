'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

// =============================================================
// Domain types — the shapes our UI passes around. We'll keep these
// small for Step 1 and grow them as steps 2-5 plug in real data.
// =============================================================
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type StepStatus = 'idle' | 'running' | 'done' | 'error';
export type StepKey = 'upload' | 'create' | 'collect' | 'analyze' | 'report';

export interface PipelineStep {
  key: StepKey;
  title: string;
  desc: string;
  status: StepStatus;
}

export interface AnalysisRun {
  runId: number;
  companyName: string;
  customPrompt: string;
  fileNames: string[];
  steps: PipelineStep[];
  status: 'running' | 'done' | 'error';
  error: string | null;
  // populated after success
  result: unknown;
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

// =============================================================
// Context
// =============================================================
interface AppContextValue {
  analysisRun: AnalysisRun | null;
  savedReports: SavedReport[];
  setAnalysisRun: (r: AnalysisRun | null) => void;
  setSavedReports: (
    updater: SavedReport[] | ((prev: SavedReport[]) => SavedReport[])
  ) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [analysisRun, setAnalysisRun] = useState<AnalysisRun | null>(null);
  const [savedReports, setSavedReportsState] = useState<SavedReport[]>([]);

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

  return (
    <AppContext.Provider
      value={{ analysisRun, savedReports, setAnalysisRun, setSavedReports }}
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
