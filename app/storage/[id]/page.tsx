'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useApp } from '../../lib/state';
import type { SavedReport } from '../../lib/state';
import type {
  GetAnalysisJobDetailResponse,
  CollectCompanyDataResponse,
} from '../../lib/analysis-types';
import { ResultView } from '../../components/ResultView';
import { StorageEmptyState } from '../../components/StorageEmptyState';
import { RegisterMonitorModal } from '../../components/RegisterMonitorModal';
import { riskMeta } from '../../lib/risk';
import { logError } from '../../lib/log';

export default function StorageDetailPage() {
  const params = useParams<{ id: string }>();
  const { savedReports } = useApp();
  const [registerOpen, setRegisterOpen] = useState(false);

  const jobId = params?.id || '';

  const [detail, setDetail] = useState<GetAnalysisJobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/mcp/get-analysis-job-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as GetAnalysisJobDetailResponse;
        if (!cancelled) setDetail(data);
      } catch (err) {
        logError('get_analysis_job_detail failed', err);
        if (!cancelled) setError(err instanceof Error ? err.message : '조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Best-effort: dept only known for jobs analyzed in current session.
  const dept = useMemo(() => {
    const m = savedReports.find((r) => r.jobId === jobId);
    return m?.dept || '';
  }, [savedReports, jobId]);

  const adapted = useMemo(() => buildAdapters(detail, dept), [detail, dept]);

  if (loading) {
    return (
      <main className="main">
        <BackTopbar title="보관함" />
        <div className="empty-panel" style={{ flex: 1 }}>
          <div className="spinner" />
          <p>불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="main">
        <BackTopbar title="보관함" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <StorageEmptyState
            title="보고서를 불러오지 못했어요."
            hint={error || '잠시 후 다시 시도해주세요.'}
            cta={
              <Link href="/storage" className="teal-btn" style={{ marginTop: 8 }}>
                보관함으로
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  if (detail.status !== 'done' || !adapted) {
    return (
      <main className="main">
        <BackTopbar title={detail.company_name} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <StorageEmptyState
            title={detail.status === 'failed' ? '분석에 실패한 보고서예요.' : '아직 분석이 진행 중이에요.'}
            hint={
              detail.status === 'failed'
                ? detail.error_message || '잠시 후 다시 시도해주세요.'
                : `현재 단계: ${detail.current_agent || '시작 대기'}`
            }
            cta={
              <Link href="/storage" className="teal-btn" style={{ marginTop: 8 }}>
                보관함으로
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const { saved, collect } = adapted;

  return (
    <main className="main">
      <div className="topbar" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Link
            href="/storage"
            aria-label="보관함으로"
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="topbar-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {saved.name}
          </span>
          {saved.dept && <span className="dept-tag">{saved.dept}</span>}
          <span className={`risk-pill ${saved.riskLevel}`}>{saved.riskLevel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saved.docxUrl && (
            <a
              className="action-btn"
              href={saved.docxUrl}
              target="_blank"
              rel="noopener"
              title="DOCX 다운로드 (7일 만료)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              DOCX
            </a>
          )}
          {saved.reportUrl && (
            <a
              className="action-btn"
              href={saved.reportUrl}
              target="_blank"
              rel="noopener"
              title="Markdown 다운로드 (7일 만료)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              MD
            </a>
          )}
          <button
            className="teal-btn"
            onClick={() => setRegisterOpen(true)}
            disabled={!saved.jobId || !saved.companyId}
            title={!saved.jobId ? '분석 메타가 없어 등록 불가' : ''}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            모니터링 추가
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 14px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ResultView saved={saved} collect={collect} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'var(--white)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>저장일: {saved.date}</span>
      </div>

      <RegisterMonitorModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        saved={saved}
        onSuccess={() =>
          alert('사후관리에 등록되었습니다. 사이드바 "사후관리"에서 확인할 수 있어요.')
        }
      />
    </main>
  );
}

function BackTopbar({ title }: { title: string }) {
  return (
    <div className="topbar">
      <Link
        href="/storage"
        aria-label="보관함으로"
        style={{ marginRight: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Link>
      <span className="topbar-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
    </div>
  );
}

// Map detail response → ResultView props (SavedReport + CollectCompanyDataResponse).
// Returns null if detail can't be rendered (no risk_level / not done).
function buildAdapters(
  detail: GetAnalysisJobDetailResponse | null,
  dept: string
): { saved: SavedReport; collect: CollectCompanyDataResponse | null } | null {
  if (!detail) return null;
  const level = detail.analyze?.risk_level || detail.risk_level;
  if (!level) return null;
  const meta = riskMeta(level);

  const saved: SavedReport = {
    id: 0, // unused — detail page no longer uses local numeric id
    jobId: detail.job_id,
    companyId: detail.company_id,
    name: detail.company_name,
    customPrompt: detail.custom_prompt || '',
    dept,
    rating: meta.rating,
    ratingName: meta.ratingName,
    riskLevel: level,
    riskScore: detail.analyze?.risk_score ?? null,
    keyRiskFactors: detail.analyze?.key_risk_factors || [],
    dataGaps: detail.analyze?.data_gaps || [],
    newsCount: detail.collect?.news_count ?? null,
    reportUrl: detail.report?.md_url || null,
    docxUrl: detail.report?.docx_url || null,
    date: (detail.finished_at || detail.created_at).slice(0, 10),
  };

  const collect: CollectCompanyDataResponse | null = detail.collect
    ? {
        job_id: detail.job_id,
        status: 'collect_done',
        company_name: detail.company_name,
        company_id: detail.company_id || '',
        news_count: detail.collect.news_count,
        uploaded_files: detail.collect.uploaded_files,
        extracted_table_count: detail.collect.extracted_table_count,
        extracted_image_count: detail.collect.extracted_image_count,
        extracted_doc_count: detail.collect.extracted_doc_count,
        // backend sends int[] for years; existing type expects string[]
        financial_years: detail.collect.financial_years.map((y) => String(y)),
        has_internal_credit_data: detail.collect.has_internal_credit_data,
        output_blob_path: '',
      }
    : null;

  return { saved, collect };
}
