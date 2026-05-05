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
}
