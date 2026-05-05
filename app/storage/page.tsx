export default function StoragePage() {
  return (
    <main className="main">
      <div className="topbar">
        <span className="topbar-title">보관함</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <div className="empty-panel">
          <p>저장된 보고서가 없습니다.</p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            (Step 4에서 카드 그리드 + 상세 페이지가 들어갑니다)
          </p>
        </div>
      </div>
    </main>
  );
}
