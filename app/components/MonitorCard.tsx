'use client';

import Link from 'next/link';
import type { MonitorTarget } from '../lib/monitor-types';
import { useApp } from '../lib/state';

export function MonitorCard({ target }: { target: MonitorTarget }) {
  const { savedReports } = useApp();

  // best-effort: cross-reference savedReports for dept (현 세션 등록건만 매핑)
  const linked = savedReports.find(
    (r) => r.jobId === target.origin_job_id || r.companyId === target.company_id
  );
  const dept = linked?.dept || '';

  const lastRunLabel = target.last_run_at
    ? new Date(target.last_run_at).toISOString().slice(0, 10)
    : '아직 없음';

  return (
    <Link href={`/management/${target.company_id}`} className="monitor-card">
      <div className="monitor-card-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span className="monitor-card-name">{target.company_name}</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {target.last_risk_level && (
              <span className={`risk-pill ${target.last_risk_level}`}>{target.last_risk_level}</span>
            )}
            {dept && <span className="dept-tag">{dept}</span>}
          </div>
        </div>
      </div>
      <div className="monitor-card-divider" />
      <div className="monitor-card-body">
        <div className="monitor-row">
          <span>알림 이메일</span>
          <strong>{target.recipient_email}</strong>
        </div>
        <div className="monitor-row">
          <span>마지막 재분석</span>
          <strong>{lastRunLabel}</strong>
        </div>
        <div className="monitor-row">
          <span>등록일</span>
          <strong>{new Date(target.registered_at).toISOString().slice(0, 10)}</strong>
        </div>
      </div>
    </Link>
  );
}
