'use client';

import Link from 'next/link';
import { useApp } from '../lib/state';
import { ProgressView } from '../components/ProgressView';
import { ResultView } from '../components/ResultView';

export default function ReportPage() {
  const { analysisRun, savedReports } = useApp();

  if (!analysisRun) {
    return (
      <main className="main">
        <div className="topbar"><span className="topbar-title">여신심사 보고서</span></div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <div className="empty-panel">
            <p>아직 분석 요청이 없습니다.</p>
            <Link href="/" className="teal-btn">홈으로</Link>
          </div>
        </div>
      </main>
    );
  }

  const isRunning = analysisRun.status === 'running';
  const isDone = analysisRun.status === 'done';
  const isError = analysisRun.status === 'error';
  const saved =
    isDone && analysisRun.savedReportId
      ? savedReports.find((r) => r.id === analysisRun.savedReportId) || null
      : null;
  const collect = analysisRun.result?.collect || null;

  return (
    <main className="main">
      <div className="topbar">
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>
          {analysisRun.companyName}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDone && analysisRun.savedReportId && (
            <Link href={`/storage/${analysisRun.savedReportId}`} className="action-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" rx="1" />
              </svg>
              보관함에서 열기
            </Link>
          )}
          <Link href="/" className="teal-btn">
            {isRunning ? '분석 중...' : '다른 기업 분석하기'}
          </Link>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {(isRunning || isError) && <ProgressView run={analysisRun} />}
        {isDone && saved && <ResultView saved={saved} collect={collect} />}
      </div>
    </main>
  );
}
