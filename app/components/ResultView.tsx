'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SavedReport } from '../lib/state';
import type { CollectCompanyDataResponse } from '../lib/analysis-types';
import { riskMeta } from '../lib/risk';
import { logError } from '../lib/log';

type Tab = 'summary' | 'risk' | 'data' | 'report';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'summary', label: '요약' },
  { key: 'risk',    label: '위험 분석' },
  { key: 'data',    label: '수집 데이터' },
  { key: 'report',  label: '보고서 본문' },
];

function asFactorText(f: unknown): string {
  if (typeof f === 'string') return f;
  if (f && typeof f === 'object') {
    const o = f as Record<string, unknown>;
    return (
      (o.factor as string) ||
      (o.title as string) ||
      (o.description as string) ||
      JSON.stringify(o)
    );
  }
  return String(f);
}

export function ResultView({
  saved,
  collect,
}: {
  saved: SavedReport;
  collect: CollectCompanyDataResponse | null;
}) {
  const [tab, setTab] = useState<Tab>('summary');
  const meta = riskMeta(saved.riskLevel);
  const level = saved.riskLevel;

  return (
    <div className="report-card">
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'summary' && (
          <SummaryTab saved={saved} pillLabel={meta.pillLabel} level={level} />
        )}
        {tab === 'risk' && (
          <RiskTab saved={saved} level={level} pillLabel={meta.pillLabel} />
        )}
        {tab === 'data' && <DataTab saved={saved} collect={collect} />}
        {tab === 'report' && <ReportTab mdUrl={saved.reportUrl} />}
      </div>
    </div>
  );
}

function SummaryTab({
  saved,
  pillLabel,
  level,
}: {
  saved: SavedReport;
  pillLabel: string;
  level: SavedReport['riskLevel'];
}) {
  const factors = (saved.keyRiskFactors || []).slice(0, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className={`risk-badge-lg ${level}`}>{pillLabel}</div>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>{saved.name}</div>
          <div className="muted-note">분석일 {saved.date}</div>
        </div>
      </div>

      <div className="summary-meta-grid">
        <div className="summary-meta-card">
          <div className="summary-meta-label">위험 점수</div>
          <div className="summary-meta-value">
            {saved.riskScore !== null ? saved.riskScore : '—'}
          </div>
          <div className="summary-meta-sub">100점 만점</div>
        </div>
        <div className="summary-meta-card">
          <div className="summary-meta-label">주요 위험요인</div>
          <div className="summary-meta-value">
            {(saved.keyRiskFactors || []).length}
          </div>
          <div className="summary-meta-sub">건</div>
        </div>
        <div className="summary-meta-card">
          <div className="summary-meta-label">관련 뉴스</div>
          <div className="summary-meta-value">
            {saved.newsCount !== null ? saved.newsCount : '—'}
          </div>
          <div className="summary-meta-sub">건</div>
        </div>
      </div>

      {saved.customPrompt && (
        <div>
          <div className="section-title">사용자 추가 요청</div>
          <p className="summary-text">{saved.customPrompt}</p>
        </div>
      )}

      {factors.length > 0 && (
        <div>
          <div className="section-title">핵심 위험 요인</div>
          <ol className="factor-list">
            {factors.map((f, i) => (
              <li key={i} className="factor-item">
                <span className="factor-bullet">{i + 1}</span>
                <span className="factor-text">{asFactorText(f)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function RiskTab({
  saved,
  level,
  pillLabel,
}: {
  saved: SavedReport;
  level: SavedReport['riskLevel'];
  pillLabel: string;
}) {
  const factors = saved.keyRiskFactors || [];
  const gaps = saved.dataGaps || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={`risk-pill ${level}`}>{pillLabel}</span>
        <span className="muted-note">위험 점수 {saved.riskScore ?? '—'}</span>
      </div>

      <div>
        <div className="section-title">주요 위험 요인 ({factors.length})</div>
        {factors.length === 0 ? (
          <p className="muted-note">분석된 위험 요인이 없습니다.</p>
        ) : (
          <ol className="factor-list">
            {factors.map((f, i) => (
              <li key={i} className="factor-item">
                <span className="factor-bullet">{i + 1}</span>
                <span className="factor-text">{asFactorText(f)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <div className="section-title">데이터 공백 ({gaps.length})</div>
        {gaps.length === 0 ? (
          <p className="muted-note">감지된 데이터 공백이 없습니다.</p>
        ) : (
          <div className="gap-list">
            {gaps.map((g, i) => (
              <span key={i} className="gap-tag">{asFactorText(g)}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataTab({
  saved,
  collect,
}: {
  saved: SavedReport;
  collect: CollectCompanyDataResponse | null;
}) {
  const newsCount = collect?.news_count ?? saved.newsCount;
  const fmtNum = (n: number | null | undefined) => (n !== null && n !== undefined ? `${n}건` : '—');
  const fmtBool = (b: boolean | null | undefined) =>
    b === true ? '있음' : b === false ? '없음' : '—';
  const years = collect?.financial_years ?? [];
  const uploaded = collect?.uploaded_files ?? [];

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: '관련 뉴스',     value: newsCount !== null && newsCount !== undefined ? `${newsCount}건` : '—' },
    { label: '추출 표',       value: fmtNum(collect?.extracted_table_count) },
    { label: '추출 문서',     value: fmtNum(collect?.extracted_doc_count) },
    { label: '추출 이미지',   value: fmtNum(collect?.extracted_image_count) },
    { label: '재무 연도',     value: years.length > 0 ? years.join(', ') : '—' },
    { label: '내부 신용 데이터', value: fmtBool(collect?.has_internal_credit_data) },
    { label: '업로드 파일',   value: uploaded.length > 0 ? uploaded.join(', ') : '없음' },
  ];

  return (
    <div>
      <div className="section-title">수집 데이터</div>
      <div style={{ marginTop: 8 }}>
        {rows.map((r) => (
          <div key={r.label} className="kv-row">
            <span className="kv-label">{r.label}</span>
            <span className="kv-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportTab({ mdUrl }: { mdUrl: string | null }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mdUrl) {
      setText(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setText(null);
    fetch(mdUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((body) => {
        if (!cancelled) setText(body);
      })
      .catch((err) => {
        logError('report MD fetch failed', err);
        if (!cancelled) {
          // 7일 SAS 만료 후가 가장 흔한 케이스
          setError('보고서를 불러올 수 없어요. 다운로드 링크가 만료되었을 수 있습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mdUrl]);

  if (!mdUrl) {
    return <p className="muted-note">보고서 본문이 아직 준비되지 않았어요.</p>;
  }
  if (loading) {
    return (
      <div className="empty-panel" style={{ minHeight: 200 }}>
        <div className="spinner" />
        <p>보고서를 불러오는 중...</p>
      </div>
    );
  }
  if (error) {
    return <div className="error-box">{error}</div>;
  }
  if (!text) {
    return <p className="muted-note">보고서가 비어 있어요.</p>;
  }

  return (
    <article className="md-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </article>
  );
}
