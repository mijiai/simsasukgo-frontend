'use client';

import type { AnalysisRun } from '../lib/state';

export function ProgressView({ run }: { run: AnalysisRun }) {
  return (
    <div className="progress-wrap">
      <div className="progress-header">
        <div className="progress-title">분석 진행 상황</div>
        <div className="progress-subtitle">
          심사숙고가 {run.steps.length}단계로 기업을 분석합니다. 1~2분 정도 걸릴 수 있어요.
        </div>
      </div>

      {run.steps.map((s, i) => (
        <div key={s.key} className={`progress-step ${s.status}`}>
          <div className="step-icon">
            {s.status === 'running' ? (
              <div className="spinner" />
            ) : s.status === 'done' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : s.status === 'error' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          <div className="step-body">
            <div className="step-title">{s.title}</div>
            <div className="step-desc">
              {s.status === 'error' ? '잠시 후 다시 시도해주세요.' : s.desc}
            </div>
          </div>
          <div className="step-trailing">
            {s.status === 'idle' && '대기'}
            {s.status === 'running' && '진행 중'}
            {s.status === 'done' && '완료'}
            {s.status === 'error' && '실패'}
          </div>
        </div>
      ))}

      {run.error && (
        <div className="error-box">
          <strong>분석 중 오류가 발생했어요</strong>
          잠시 후 다시 시도해주세요. 자세한 내용은 브라우저 개발자 도구(Console)에서 확인할 수 있어요.
        </div>
      )}
    </div>
  );
}
