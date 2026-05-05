'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import type { SavedReport } from '../lib/state';
import type { MonitorRegisterResponse } from '../lib/monitor-types';
import { logError } from '../lib/log';

interface Props {
  open: boolean;
  onClose: () => void;
  saved: SavedReport;
  onSuccess?: (resp: MonitorRegisterResponse) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterMonitorModal({ open, onClose, saved, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!saved.jobId && !!saved.companyId && EMAIL_RE.test(email) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/mcp/monitor-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: saved.companyId,
          companyName: saved.name,
          recipientEmail: email,
          originJobId: saved.jobId,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as MonitorRegisterResponse;
      onSuccess?.(data);
      onClose();
    } catch (err) {
      logError('monitor_register failed', err);
      setError(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setSubmitting(false);
    }
  };

  if (!saved.jobId || !saved.companyId) {
    return (
      <Modal open={open} onClose={onClose} title="사후관리 등록 불가">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          이 보고서는 분석 메타데이터가 부족해서 사후관리 등록을 할 수 없어요.
          기업을 다시 분석한 보고서로 시도해주세요.
        </p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="사후관리 등록">
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>
        <strong style={{ color: 'var(--text-primary)' }}>{saved.name}</strong>의 위험 변동을
        분기마다(3개월) 자동 재분석하고, 등급이 상승하면 알림 이메일을 보냅니다.
      </p>
      <div className="form-group">
        <label className="form-label">알림 받을 이메일</label>
        <input
          className="form-input"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </div>
      {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose} disabled={submitting}>취소</button>
        <button className="btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? '등록 중...' : '등록하기'}
        </button>
      </div>
    </Modal>
  );
}
