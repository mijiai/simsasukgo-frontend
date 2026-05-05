'use client';

import Link from 'next/link';
import type { ListedAnalysisJob } from '../lib/analysis-types';

export function StorageCard({
  job,
  dept,
}: {
  job: ListedAnalysisJob;
  dept?: string;
}) {
  const date = job.finished_at
    ? job.finished_at.slice(0, 10)
    : job.created_at.slice(0, 10);

  return (
    <Link href={`/storage/${job.job_id}`} className="storage-card">
      <div className="storage-card-head">
        <div className="storage-card-name-col">
          <span className="storage-card-name">{job.company_name}</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {job.risk_level && (
              <span className={`risk-pill ${job.risk_level}`}>{job.risk_level}</span>
            )}
            {dept && <span className="dept-tag">{dept}</span>}
          </div>
        </div>
      </div>
      <div className="storage-card-divider" />
      <div className="storage-card-body">
        <div className="storage-card-row">
          <span>위험 등급</span>
          <strong>{job.risk_level || '—'}</strong>
        </div>
        <div className="storage-card-row">
          <span>상태</span>
          <strong>{job.status === 'done' ? '완료' : job.status}</strong>
        </div>
        <div className="storage-card-row">
          <span>저장일</span>
          <strong>{date}</strong>
        </div>
      </div>
      <div className="storage-card-foot">
        <span style={{ fontFamily: 'SFMono-Regular, Menlo, monospace', fontSize: 10.5 }}>
          {job.job_id.slice(0, 8)}...
        </span>
        <span className="storage-card-cta">
          보고서 보기
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
