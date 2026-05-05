export default function ManagementPage() {
  return (
    <main className="main">
      <div className="topbar">
        <span className="topbar-title">사후관리</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <div className="empty-panel">
          <p>모니터링 대상이 없습니다.</p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            (Step 5에서 monitor_list/register/run_now/deregister 연결)
          </p>
        </div>
      </div>
    </main>
  );
}
