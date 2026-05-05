'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../lib/state';
import { MonitorCard } from '../components/MonitorCard';
import { DEPARTMENTS, type DepartmentFilter } from '../lib/departments';
import type { MonitorListResponse, MonitorTarget } from '../lib/monitor-types';
import { logError } from '../lib/log';

const FILTERS: { key: DepartmentFilter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  ...DEPARTMENTS.map((d) => ({ key: d, label: d })),
];

export default function ManagementPage() {
  const { savedReports } = useApp();
  const [targets, setTargets] = useState<MonitorTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DepartmentFilter>('ALL');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/mcp/monitor-list', { method: 'POST' });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as MonitorListResponse;
        if (!cancelled) setTargets(data.targets || []);
      } catch (err) {
        logError('monitor_list failed', err);
        if (!cancelled) setError(err instanceof Error ? err.message : '목록 조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return targets;
    return targets.filter((t) => {
      const linked = savedReports.find(
        (r) => r.jobId === t.origin_job_id || r.companyId === t.company_id
      );
      return linked?.dept === filter;
    });
  }, [targets, filter, savedReports]);

  return (
    <main className="main">
      <div className="topbar">
        <span className="topbar-title">사후관리</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          총 {targets.length}건 · 분기마다 자동 재분석
        </span>
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
        <div className="storage-panel">
          <div className="filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-tab${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-panel" style={{ flex: 1 }}>
              <div className="spinner" />
              <p>모니터링 대상을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="empty-panel" style={{ flex: 1 }}>
              <p>목록을 불러오지 못했어요.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{error}</p>
            </div>
          ) : targets.length === 0 ? (
            <div className="empty-panel" style={{ flex: 1 }}>
              <p>등록된 모니터링 대상이 없어요.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                보관함의 보고서에서 &quot;사후관리 등록&quot;으로 시작하세요.
              </p>
              <Link href="/storage" className="teal-btn" style={{ marginTop: 8 }}>
                보관함으로
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-panel" style={{ flex: 1 }}>
              <p>해당 부서의 대상이 없어요.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                현 세션에서 등록한 카드만 부서 정보가 매핑됩니다.
              </p>
            </div>
          ) : (
            <div className="storage-grid">
              {filtered.map((t) => (
                <MonitorCard key={t.company_id} target={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
