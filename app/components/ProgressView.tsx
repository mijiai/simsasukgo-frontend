'use client';

import Image from 'next/image';
import type { AnalysisRun } from '../lib/state';

const STEP_CONFIG: Record<string, { emoji: string; label: string }> = {
  upload:  { emoji: '📤', label: '파일 업로드' },
  create:  { emoji: '⚙️', label: '작업 생성' },
  collect: { emoji: '🔍', label: '데이터 수집' },
  analyze: { emoji: '📊', label: '위험 분석' },
  report:  { emoji: '📝', label: '보고서 생성' },
};

export function ProgressView({ run }: { run: AnalysisRun }) {
  const hasError = run.steps.some(s => s.status === 'error');
  const currentStep = run.steps.find(s => s.status === 'running');
  const stepCount = run.steps.length;
  const offset = `${100 / (2 * stepCount)}%`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight: 400,
        padding: '52px 40px',
        gap: 52,
      }}
    >
      {/* ── 헤더 ── */}
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {hasError ? (
          <span style={{ fontSize: 52, lineHeight: 1 }}>⚠️</span>
        ) : (
          <div style={{ animation: 'ddokdi-float 3.2s ease-in-out infinite' }}>
            <Image src="/ddokdi.png" alt="뚝디" width={170} height={170} style={{ objectFit: 'contain' }} />
          </div>
        )}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
            margin: 0,
          }}
        >
          {hasError
            ? '분석 중 오류가 발생했어요'
            : `${run.companyName} 분석하는 중이에요`}
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {hasError
            ? '잠시 후 다시 시도해주세요. 자세한 내용은 브라우저 Console을 확인해주세요.'
            : '심사숙고 AI가 데이터를 수집하고 위험도를 분석합니다. 1~2분 정도 소요돼요.'}
        </p>
      </div>

      {/* ── 가로 단계 표시 ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        {/* 배경 커넥터 라인 */}
        <div
          style={{
            position: 'absolute',
            top: 21,
            left: offset,
            right: offset,
            height: 2,
            background: 'var(--border)',
            zIndex: 0,
          }}
        />

        {run.steps.map((step, i) => {
          const config = STEP_CONFIG[step.key] ?? { emoji: '📌', label: step.title };
          const isDone    = step.status === 'done';
          const isRunning = step.status === 'running';
          const isError   = step.status === 'error';
          const isIdle    = step.status === 'idle';
          const prevDone  = i > 0 && run.steps[i - 1].status === 'done';

          return (
            <div
              key={step.key}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* 완료된 구간 컬러 오버레이 */}
              {i > 0 && prevDone && (
                <div
                  style={{
                    position: 'absolute',
                    top: 21,
                    left: '-50%',
                    width: '100%',
                    height: 2,
                    background: 'var(--teal)',
                    zIndex: 0,
                  }}
                />
              )}

              {/* 단계 원 */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDone    ? 'var(--risk-low-bg)'
                            : isRunning ? 'var(--teal)'
                            : isError   ? 'var(--risk-crit-bg)'
                            : '#F3F4F6',
                  border: `2px solid ${
                    isDone    ? 'var(--risk-low)'
                    : isRunning ? 'var(--teal)'
                    : isError   ? 'var(--risk-crit)'
                    : 'var(--border)'
                  }`,
                  boxShadow: isRunning ? '0 0 0 5px rgba(0,196,169,0.12)' : 'none',
                  transition: 'all 0.3s',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {isDone    && <span style={{ fontSize: 18 }}>✅</span>}
                {isRunning && <div className="spinner" />}
                {isError   && <span style={{ fontSize: 18 }}>❌</span>}
                {isIdle    && (
                  <span style={{ fontSize: 18, opacity: 0.45 }}>
                    {config.emoji}
                  </span>
                )}
              </div>

              {/* 단계 이름 */}
              <div
                style={{
                  marginTop: 10,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: isRunning ? 700 : 500,
                  color: isDone    ? 'var(--risk-low)'
                       : isRunning ? 'var(--teal)'
                       : isError   ? 'var(--risk-crit)'
                       : 'var(--text-muted)',
                  lineHeight: 1.4,
                }}
              >
                {config.label}
              </div>

              {/* 상태 텍스트 */}
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: isRunning ? 600 : 400,
                  color: isDone    ? 'var(--risk-low)'
                       : isRunning ? 'var(--teal)'
                       : isError   ? 'var(--risk-crit)'
                       : 'var(--text-muted)',
                }}
              >
                {isIdle    && '대기'}
                {isRunning && '진행 중'}
                {isDone    && '완료'}
                {isError   && '실패'}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 현재 단계 설명 카드 ── */}
      {!hasError && currentStep && (
        <div
          style={{
            background: 'var(--teal-light)',
            border: '1px solid var(--teal)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 28px',
            textAlign: 'center',
            maxWidth: 460,
            width: '100%',
          }}
        >
          <p
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: 'var(--teal)',
              margin: 0,
            }}
          >
            {currentStep.title}
          </p>
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--teal)',
              margin: '6px 0 0',
              opacity: 0.8,
            }}
          >
            {currentStep.desc}
          </p>
        </div>
      )}

      {/* ── 에러 박스 ── */}
      {hasError && run.error && (
        <div
          className="error-box"
          style={{ maxWidth: 460, width: '100%', textAlign: 'left' }}
        >
          <strong>분석 중 오류가 발생했어요</strong>
          잠시 후 다시 시도해주세요.
        </div>
      )}
    </div>
  );
}