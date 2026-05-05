'use client';

import type { ReactNode } from 'react';

interface Props {
  title: string;
  hint?: string;
  cta?: ReactNode;
}

export function StorageEmptyState({ title, hint, cta }: Props) {
  return (
    <div className="empty-panel" style={{ flex: 1 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44, opacity: 0.25 }}>
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" rx="1" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
      <p>{title}</p>
      {hint && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</p>}
      {cta}
    </div>
  );
}
