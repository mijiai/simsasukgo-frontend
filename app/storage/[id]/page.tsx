'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '../../lib/state';
import { ResultView } from '../../components/ResultView';
import { StorageEmptyState } from '../../components/StorageEmptyState';

export default function StorageDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { savedReports, deleteStoredReport } = useApp();

  const id = Number(params?.id);
  const report = Number.isFinite(id) ? savedReports.find((r) => r.id === id) : undefined;

  if (!report) {
    return (
      <main className="main">
        <div className="topbar">
          <span className="topbar-title">보관함</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <StorageEmptyState
            title="보고서를 찾을 수 없어요."
            hint="페이지를 새로고침하면 메모리에 저장된 보고서가 사라집니다. (영속화는 다음 단계)"
            cta={
              <Link href="/storage" className="teal-btn" style={{ marginTop: 8 }}>
                보관함으로
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const handleDelete = () => {
    if (!confirm(`"${report.name}" 보고서를 삭제할까요? 이 작업은 되돌릴 수 없어요.`)) return;
    deleteStoredReport(report.id);
    router.push('/storage');
  };

  return (
    <main className="main">
      <div className="topbar" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Link
            href="/storage"
            aria-label="보관함으로"
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="topbar-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {report.name}
          </span>
          <span className={`risk-pill ${report.riskLevel}`}>{report.riskLevel}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 14px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ResultView saved={report} collect={null} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'var(--white)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>저장일: {report.date}</span>
        <button
          className="action-btn"
          onClick={handleDelete}
          style={{ color: '#EF4444', borderColor: '#FECACA' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
          삭제
        </button>
      </div>
    </main>
  );
}
