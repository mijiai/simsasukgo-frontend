import Link from 'next/link';

export default function ReportPage() {
  return (
    <main className="main">
      <div className="topbar">
        <span className="topbar-title">여신심사 보고서</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <div className="empty-panel">
          <p>아직 분석 요청이 없습니다.</p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            (Step 2에서 4단계 파이프라인 + 결과 화면이 여기에 들어갑니다)
          </p>
          <Link href="/" className="teal-btn" style={{ marginTop: 8 }}>
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
