// MCP response shapes — mirror simsa-sukgo-agents tool contracts verbatim.

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CreateAnalysisJobResponse {
  job_id: string;
  company_id: string;
  status: 'ready';
  input_blob_paths: string[];
}

export interface CollectCompanyDataResponse {
  job_id: string;
  status: 'collect_done';
  company_name: string;
  company_id: string;
  news_count: number | null;
  uploaded_files: string[];
  extracted_table_count: number | null;
  extracted_image_count: number | null;
  extracted_doc_count: number | null;
  financial_years: string[];
  has_internal_credit_data: boolean | null;
  output_blob_path: string;
}

export interface AnalyzeFinancialsResponse {
  job_id: string;
  status: 'analyze_done';
  risk_level: RiskLevel;
  risk_score: number;
  key_risk_factors: unknown[];
  data_gaps: unknown[];
  output_blob_path: string;
}

export interface ReportGenerateResponse {
  job_id: string;
  status: 'done';
  risk_level: RiskLevel;
  risk_score: number;
  report_url: string;
  report_blob_path: string;
  docx_url: string;
  docx_blob_path: string;
}

export interface CreateUploadUrlResponse {
  upload_url: string;
  blob_path: string;
  required_headers: Record<string, string>;
  expires_at: string;
}

export interface CreateAnalysisJobRequestBody {
  companyName: string;
  customPrompt?: string;
  fileBlobPaths?: string[];
}

export type JobStatus =
  | 'pending'
  | 'collecting'
  | 'analyzing'
  | 'reporting'
  | 'done'
  | 'failed';

export type AgentName = 'collector' | 'financial' | 'report' | 'monitoring';

export interface ListedAnalysisJob {
  job_id: string;
  company_id: string | null;
  company_name: string;
  status: JobStatus;
  user_id: string | null;
  risk_level: RiskLevel | null;
  current_agent: AgentName | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  report_blob_path: string | null;
}

export interface ListAnalysisJobsResponse {
  jobs: ListedAnalysisJob[];
  total: number;
  limit: number;
  offset: number;
}
