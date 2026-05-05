'use client';

import Link from 'next/link';
import type { SavedReport } from '../lib/state';

export function StorageCard({ report }: { report: SavedReport }) {
  const factorCount = (report.keyRiskFactors || []).length;

  return (
    <Link href={`/storage/${report.id}`} className="storage-card">
      <div className="storage-card-head">
        <div className="storage-card-name-col">
          <span className="storage-card-name">{report.name}</span>
          <span className={`risk-pill ${report.riskLevel}`}>{report.riskLevel}</span>
        </div>
        <div className={`risk-badge-lg ${report.riskLevel} sm`}>{report.rating}</div>
      </div>
      <div className="storage-card-divider" />
      <div className="storage-card-body">
        <div className="storage-card-row">
          <span>위험 점수</span>
          <strong>{report.riskScore != null ? report.riskScore : '—'}</strong>
        </div>
        <div className="storage-card-row">
          <span>주요 위험요인</span>
          <strong>{factorCount}건</strong>
        </div>
        <div className="storage-card-row">
          <span>관련 뉴스</span>
          <strong>{report.newsCount != null ? `${report.newsCount}건` : '—'}</strong>
        </div>
      </div>
      <div className="storage-card-foot">
        <span>저장일: {report.date}</span>
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
