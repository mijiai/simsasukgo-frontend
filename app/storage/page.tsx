'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/state';
import { StorageCard } from '../components/StorageCard';
import { StorageEmptyState } from '../components/StorageEmptyState';
import { DEPARTMENTS, type DepartmentFilter } from '../lib/departments';
import type {
  ListAnalysisJobsResponse,
  ListedAnalysisJob,
} from '../lib/analysis-types';
import { logError } from '../lib/log';

const FILTERS: { key: DepartmentFilter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  ...DEPARTMENTS.map((d) => ({ key: d, label: d })),
];

export default function StoragePage() {
  const { savedReports } = useApp();
  const [jobs, setJobs] = useState<ListedAnalysisJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DepartmentFilter>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/mcp/list-analysis-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done', limit: 200 }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ListAnalysisJobsResponse;
        if (!cancelled) setJobs(data.jobs || []);
      } catch (err) {
        logError('list_analysis_jobs failed', err);
        if (!cancelled) setError(err instanceof Error ? err.message : '목록 조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Best-effort dept lookup: only jobs analyzed in the current browser session
  // have a SavedReport entry with `dept` set. Other jobs show as "no dept".
  const deptByJobId = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of savedReports) {
      if (r.jobId && r.dept) map.set(r.jobId, r.dept);
    }
    return map;
  }, [savedReports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      const dept = deptByJobId.get(j.job_id) || '';
      if (filter !== 'ALL' && dept !== filter) return false;
      if (q && !j.company_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, filter, query, deptByJobId]);

  return (
    <main className="main">
      <div className="topbar">
        <span className="topbar-title">보관함</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {loading ? '불러오는 중...' : `총 ${jobs.length}건`}
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
        <div className="storage-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="22" y2="22" />
          </svg>
          <input
            type="text"
            placeholder="기업명으로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

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
              <p>보관함을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="empty-panel" style={{ flex: 1 }}>
              <p>목록을 불러오지 못했어요.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{error}</p>
            </div>
          ) : jobs.length === 0 ? (
            <StorageEmptyState
              title="저장된 보고서가 없습니다."
              hint="여신심사보고서에서 분석을 실행하면 자동으로 저장됩니다."
              cta={
                <Link href="/" className="teal-btn" style={{ marginTop: 8 }}>
                  분석 시작하기
                </Link>
              }
            />
          ) : filtered.length === 0 ? (
            <StorageEmptyState
              title="조건에 맞는 보고서가 없어요."
              hint={
                filter !== 'ALL'
                  ? '부서 정보는 본 세션에서 분석한 카드만 매핑됩니다.'
                  : '검색어를 변경해보세요.'
              }
            />
          ) : (
            <div className="storage-grid">
              {filtered.map((j) => (
                <StorageCard
                  key={j.job_id}
                  job={j}
                  dept={deptByJobId.get(j.job_id) || ''}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
