import type { RiskLevel } from './analysis-types';

export interface MonitorTarget {
  company_id: string;
  company_name: string;
  recipient_email: string;
  origin_job_id: string;
  registered_at: string;
  last_run_at?: string | null;
  last_risk_level?: RiskLevel | null;
}

export interface MonitorListResponse {
  count: number;
  targets: MonitorTarget[];
}

export interface MonitorRegisterResponse {
  company_id: string;
  company_name: string;
  recipient_email: string;
  status: 'registered';
}

export interface MonitorDeregisterResponse {
  company_id: string;
  status: 'deregistered';
}

export interface MonitorGetLatestSnapshotResponse {
  company_id: string;
  company_name: string;
  available: boolean;
  // available=true 일 때만 채워짐
  run_at?: string | null;
  run_date?: string | null;
  analysis_job_id?: string | null;
  previous_risk_level?: RiskLevel | null;
  risk_level?: RiskLevel | null;
  risk_score?: number | null;
  risk_changed?: boolean | null;
  summary?: string | null;
  key_risk_factors?: string[];
  positive_signals?: string[];
  data_gaps?: string[];
  news_count?: number;
  lawsuit_count?: number;
  news_top_titles?: string[];
  model?: string | null;
  snapshot_blob_path?: string | null;
}

export interface MonitorRunNowResponse {
  company_id: string;
  company_name: string;
  status: 'snapshot_done';
  analysis_job_id: string;
  run_date: string;
  risk_level: RiskLevel;
  risk_score: number;
  previous_risk_level: RiskLevel | null;
  risk_changed: boolean;
  snapshot_blob_path: string;
  // Optional snapshot details — backend started returning these after the
  // schema patch; older snapshots / older backend versions may omit them.
  summary?: string | null;
  key_risk_factors?: string[];
  positive_signals?: string[];
  data_gaps?: string[];
}
