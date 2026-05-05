'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '../../lib/state';
import { logError } from '../../lib/log';
import type {
  MonitorTarget,
  MonitorListResponse,
  MonitorRunNowResponse,
  MonitorGetLatestSnapshotResponse,
} from '../../lib/monitor-types';
import { riskMeta } from '../../lib/risk';

async function fetchLatestSnapshot(
  companyId: string
): Promise<MonitorGetLatestSnapshotResponse> {
  const res = await fetch('/api/mcp/monitor-get-latest-snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as MonitorGetLatestSnapshotResponse;
}

export default function ManagementDetailPage() {
  const params = useParams<{ companyId: string }>();
  const router = useRouter();
  const { savedReports } = useApp();

  const companyId = params?.companyId || '';

  const [target, setTarget] = useState<MonitorTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<MonitorGetLatestSnapshotResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [listRes, snap] = await Promise.all([
          fetch('/api/mcp/monitor-list', { method: 'POST' }).then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return (await res.json()) as MonitorListResponse;
          }),
          fetchLatestSnapshot(companyId).catch((err) => {
            logError('monitor_get_latest_snapshot failed', err);
            return null;
          }),
        ]);
        if (cancelled) return;
        const found = listRes.targets.find((t) => t.company_id === companyId) || null;
        setTarget(found);
        setSnapshot(snap);
      } catch (err) {
        logError('monitor_list (detail) failed', err);
        if (!cancelled) setError(err instanceof Error ? err.message : '조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleRunNow = async () => {
    if (!target || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch('/api/mcp/monitor-run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: target.company_id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as MonitorRunNowResponse;
      setTarget(
        (prev) =>
          prev && {
            ...prev,
            last_risk_level: data.risk_level,
            last_run_at: new Date().toISOString(),
          }
      );
      // Refetch the full snapshot — run_now's response doesn't include
      // news_top_titles / news_count etc. that we surface in the panel.
      try {
        const fresh = await fetchLatestSnapshot(target.company_id);
        setSnapshot(fresh);
      } catch (err) {
        logError('snapshot refetch after run_now failed', err);
        // best-effort — don't surface this as a hard error; the run itself succeeded
      }
    } catch (err) {
      logError('monitor_run_now failed', err);
      setRunError(err instanceof Error ? err.message : '재분석 실패');
    } finally {
      setRunning(false);
    }
  };

  const handleDeregister = async () => {
    if (!target) return;
    if (!confirm(`${target.company_name}을(를) 모니터링에서 해제할까요? 과거 스냅샷은 보존됩니다.`)) return;
    try {
      const res = await fetch('/api/mcp/monitor-deregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: target.company_id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      router.push('/management');
    } catch (err) {
      logError('monitor_deregister failed', err);
      alert(err instanceof Error ? err.message : '해제 실패');
    }
  };

  if (loading) {
    return (
      <main className="main">
        <div className="topbar">
          <span className="topbar-title">사후관리</span>
        </div>
        <div className="empty-panel" style={{ flex: 1 }}>
          <div className="spinner" />
          <p>불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (error || !target) {
    return (
      <main className="main">
        <div className="topbar">
          <Link href="/management" aria-label="뒤로" style={{ marginRight: 10, color: 'var(--text-muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="topbar-title">사후관리</span>
        </div>
        <div className="empty-panel" style={{ flex: 1 }}>
          <p>{error || '대상을 찾을 수 없어요.'}</p>
          <Link href="/management" className="teal-btn" style={{ marginTop: 8 }}>목록으로</Link>
        </div>
      </main>
    );
  }

  const linked = savedReports.find(
    (r) => r.jobId === target.origin_job_id || r.companyId === target.company_id
  );
  const meta = target.last_risk_level ? riskMeta(target.last_risk_level) : null;

  return (
    <main className="main">
      <div className="topbar" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Link href="/management" aria-label="뒤로" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="topbar-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {target.company_name}
          </span>
          {target.last_risk_level && (
            <span className={`risk-pill ${target.last_risk_level}`}>{target.last_risk_level}</span>
          )}
          {linked?.dept && <span className="dept-tag">{linked.dept}</span>}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 0,
        }}
      >
        <div className="report-card">
          <div className="tab-bar">
            <button className="tab active" type="button">모니터링 정보</button>
          </div>
          <div className="tab-content">
            <div className="kv-row">
              <span className="kv-label">알림 이메일</span>
              <span className="kv-value">{target.recipient_email}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">분석 주기</span>
              <span className="kv-value">분기 (3개월)</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">등록일</span>
              <span className="kv-value">
                {new Date(target.registered_at).toISOString().slice(0, 10)}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">마지막 재분석</span>
              <span className="kv-value">
                {target.last_run_at ? new Date(target.last_run_at).toISOString().slice(0, 10) : '아직 없음'}
              </span>
            </div>
            {meta && target.last_risk_level && (
              <div className="kv-row">
                <span className="kv-label">최근 위험 등급</span>
                <span className="kv-value">
                  {target.last_risk_level} · {meta.ratingName}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <button className="teal-btn" onClick={handleRunNow} disabled={running}>
                {running ? '재분석 중...' : '지금 재분석'}
              </button>
              <button
                className="action-btn"
                onClick={handleDeregister}
                style={{ color: '#EF4444', borderColor: '#FECACA' }}
              >
                모니터링 해제
              </button>
              {linked && (
                <Link href={`/storage/${linked.id}`} className="action-btn">
                  원본 보고서 보기
                </Link>
              )}
            </div>

            <p className="muted-note" style={{ marginTop: 14 }}>
              &quot;지금 재분석&quot;은 최신 자료로 위험도만 다시 산정합니다 (Markdown · DOCX 보고서는 재생성하지 않음).
              위험 등급이 상승하면 등록한 이메일로 알림이 발송됩니다.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div className="tab-bar">
            <button className="tab active" type="button">최근 모니터링 결과</button>
          </div>
          <div className="tab-content">
            {running ? (
              <div className="empty-panel" style={{ minHeight: 160 }}>
                <div className="spinner" />
                <p>최신 자료로 위험도를 다시 산정하고 있어요... (30~60초)</p>
              </div>
            ) : runError ? (
              <div className="error-box">
                <strong>재분석에 실패했어요</strong>
                {runError}
              </div>
            ) : snapshot && snapshot.available ? (
              <SnapshotPanel snapshot={snapshot} />
            ) : (
              <div className="empty-panel" style={{ minHeight: 160 }}>
                <p>아직 한 번도 재분석되지 않았어요.</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  분기 cron 이 자동 실행하기 전에 먼저 보고 싶다면 위의 &quot;지금 재분석&quot; 버튼을 누르세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function SnapshotPanel({ snapshot }: { snapshot: MonitorGetLatestSnapshotResponse }) {
  const level = snapshot.risk_level;
  const meta = level ? riskMeta(level) : null;
  const factors = snapshot.key_risk_factors || [];
  const signals = snapshot.positive_signals || [];
  const gaps = snapshot.data_gaps || [];
  const newsTitles = snapshot.news_top_titles || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {level && meta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className={`risk-badge-lg ${level}`}>{meta.rating}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="muted-note">현재 위험도</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {meta.ratingName} · {meta.pillLabel}
            </span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className={`risk-pill ${level}`}>{level}</span>
          </div>
        </div>
      )}

      {snapshot.summary && (
        <div>
          <div className="section-title">요약</div>
          <p className="summary-text">{snapshot.summary}</p>
        </div>
      )}

      <div>
        {snapshot.risk_score != null && (
          <div className="kv-row">
            <span className="kv-label">위험 점수</span>
            <span className="kv-value">{snapshot.risk_score}</span>
          </div>
        )}
        {snapshot.run_date && (
          <div className="kv-row">
            <span className="kv-label">실행 일자</span>
            <span className="kv-value">{snapshot.run_date}</span>
          </div>
        )}
        {level && (
          <div className="kv-row">
            <span className="kv-label">이전 등급 대비</span>
            <span className="kv-value">
              {snapshot.previous_risk_level
                ? `${snapshot.previous_risk_level} → ${level}${snapshot.risk_changed ? ' (변동)' : ''}`
                : '첫 실행 (이전 기록 없음)'}
            </span>
          </div>
        )}
        {(snapshot.news_count != null || snapshot.lawsuit_count != null) && (
          <div className="kv-row">
            <span className="kv-label">관련 자료</span>
            <span className="kv-value">
              뉴스 {snapshot.news_count ?? 0}건 · 소송 {snapshot.lawsuit_count ?? 0}건
            </span>
          </div>
        )}
      </div>

      {factors.length > 0 && (
        <div>
          <div className="section-title">위험 요인 ({factors.length})</div>
          <ol className="factor-list">
            {factors.map((f, i) => (
              <li key={i} className="factor-item">
                <span className="factor-bullet">{i + 1}</span>
                <span className="factor-text">{f}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {signals.length > 0 && (
        <div>
          <div className="section-title">긍정 신호 ({signals.length})</div>
          <ol className="factor-list">
            {signals.map((s, i) => (
              <li key={i} className="factor-item">
                <span className="factor-bullet positive">{i + 1}</span>
                <span className="factor-text">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {gaps.length > 0 && (
        <div>
          <div className="section-title">자료 부족 ({gaps.length})</div>
          <div className="gap-list">
            {gaps.map((g, i) => (
              <span key={i} className="gap-tag">{g}</span>
            ))}
          </div>
        </div>
      )}

      {newsTitles.length > 0 && (
        <div>
          <div className="section-title">관련 뉴스 헤드라인 ({newsTitles.length})</div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 0, listStyle: 'none' }}>
            {newsTitles.map((t, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: 16, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--text-muted)' }}>·</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
