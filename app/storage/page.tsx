'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useApp } from '../lib/state';
import { StorageCard } from '../components/StorageCard';
import { StorageEmptyState } from '../components/StorageEmptyState';
import type { RiskLevel } from '../lib/analysis-types';

type Filter = 'ALL' | RiskLevel;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL',      label: '전체' },
  { key: 'LOW',      label: '저위험' },
  { key: 'MEDIUM',   label: '중간 위험' },
  { key: 'HIGH',     label: '고위험' },
  { key: 'CRITICAL', label: '매우 위험' },
];

export default function StoragePage() {
  const { savedReports } = useApp();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return savedReports.filter((r) => {
      if (filter !== 'ALL' && r.riskLevel !== filter) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [savedReports, filter, query]);

  return (
    <main className="main">
      <div className="topbar">
        <span className="topbar-title">보관함</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          총 {savedReports.length}건
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

          {savedReports.length === 0 ? (
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
              hint="검색어나 필터를 변경해보세요."
            />
          ) : (
            <div className="storage-grid">
              {filtered.map((r) => (
                <StorageCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
