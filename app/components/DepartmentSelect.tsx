'use client';

import { useState, useRef, useEffect } from 'react';
import { DEPARTMENTS, type Department } from '../lib/departments';

interface Props {
  value: Department | '';
  onChange: (v: Department | '') => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = '부서 선택',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="dept-select-wrap">
      <button
        type="button"
        className="dept-select-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value || placeholder}
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="dropdown" style={{ width: '100%' }}>
          {value && (
            <div
              className="dropdown-item"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              style={{ color: 'var(--text-muted)' }}
            >
              선택 해제
            </div>
          )}
          {DEPARTMENTS.map((d) => (
            <div
              key={d}
              className="dropdown-item"
              onClick={() => {
                onChange(d);
                setOpen(false);
              }}
            >
              {d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
