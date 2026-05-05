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
} from '../../lib/monitor-types';
import { riskMeta } from '../../lib/risk';

export default function ManagementDetailPage() {
  const params = useParams<{ companyId: string }>();
  const router = useRouter();
  const { savedReports } = useApp();

  const companyId = params?.companyId || '';

  const [target, setTarget] = useState<MonitorTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [runResult, setRunResult] = useState<MonitorRunNowResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/mcp/monitor-list', { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MonitorListResponse;
        const found = data.targets.find((t) => t.company_id === companyId) || null;
        if (!cancelled) setTarget(found);
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
      setRunResult(data);
      setTarget(
        (prev) =>
          prev && {
            ...prev,
            last_risk_level: data.risk_level,
            last_run_at: new Date().toISOString(),
          }
      );
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

        {(running || runResult || runError) && (
          <div className="report-card">
            <div className="tab-bar">
              <button className="tab active" type="button">최근 재분석 결과</button>
            </div>
            <div className="tab-content">
              {running && (
                <div className="empty-panel" style={{ minHeight: 120 }}>
                  <div className="spinner" />
                  <p>최신 자료로 위험도를 다시 산정하고 있어요... (30~60초)</p>
                </div>
              )}
              {runError && (
                <div className="error-box">
                  <strong>재분석에 실패했어요</strong>
                  {runError}
                </div>
              )}
              {runResult && !running && <RunResultPanel result={runResult} />}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function RunResultPanel({ result }: { result: MonitorRunNowResponse }) {
  const meta = riskMeta(result.risk_level);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div className={`risk-badge-lg ${result.risk_level}`}>{meta.rating}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="muted-note">현재 위험도</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {meta.ratingName} · {meta.pillLabel}
          </span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className={`risk-pill ${result.risk_level}`}>{result.risk_level}</span>
        </div>
      </div>

      <div className="kv-row">
        <span className="kv-label">위험 점수</span>
        <span className="kv-value">{result.risk_score}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">실행 일자</span>
        <span className="kv-value">{result.run_date}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">이전 등급 대비</span>
        <span className="kv-value">
          {result.previous_risk_level
            ? `${result.previous_risk_level} → ${result.risk_level}${result.risk_changed ? ' (변동)' : ''}`
            : '첫 실행 (이전 기록 없음)'}
        </span>
      </div>
    </div>
  );
}
