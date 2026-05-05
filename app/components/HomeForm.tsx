'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useApp } from '../lib/state';

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  file: File;
}

const SEARCH_TYPES = ['기업명', '사업자번호', '법인번호'] as const;
type SearchType = (typeof SEARCH_TYPES)[number];

export function HomeForm() {
  const { startAnalysis } = useApp();
  const [type, setType] = useState<SearchType>('기업명');
  const [company, setCompany] = useState('');
  const [memo, setMemo] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    const PER_FILE_MAX = 25 * 1024 * 1024;
    const TOTAL_MAX = 100 * 1024 * 1024;
    const MAX_COUNT = 20;
    const accepted: AttachedFile[] = [];
    let runningTotal = files.reduce((s, f) => s + (f.size || 0), 0);
    for (const f of arr) {
      if (files.length + accepted.length >= MAX_COUNT) {
        alert(`파일은 최대 ${MAX_COUNT}개까지 첨부할 수 있어요.`);
        break;
      }
      if (f.size > PER_FILE_MAX) {
        alert(`"${f.name}"이(가) 25MB를 초과해 첨부에서 제외했어요.`);
        continue;
      }
      if (runningTotal + f.size > TOTAL_MAX) {
        alert(`총 첨부 용량이 100MB를 초과해 일부 파일을 제외했어요.`);
        break;
      }
      runningTotal += f.size;
      accepted.push({ name: f.name, type: f.type, size: f.size, file: f });
    }
    setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const canSend = company.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    startAnalysis(
      company.trim(),
      memo.trim(),
      files.map((f) => f.file)
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 60px 32px',
      }}
    >
      <div style={{ marginBottom: 16, animation: 'float 3.6s ease-in-out infinite' }}>
        <Image
          src="/dandi.png"
          alt="단디"
          width={230}
          height={230}
          priority
          style={{
            width: 'clamp(180px, 16vh, 230px)',
            height: 'clamp(180px, 16vh, 230px)',
            objectFit: 'contain',
          }}
        />
      </div>

      <p
        style={{
          fontSize: 'clamp(15px, 1.3vw, 18px)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 28,
          letterSpacing: '-0.2px',
          textAlign: 'center',
        }}
      >
        AI로 심사숙고한 여신심사 보고서를 만들어보세요
      </p>

      <div
        style={{
          width: '100%',
          maxWidth: 700,
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '13px 15px',
                borderRight: '1px solid var(--border)',
                cursor: 'pointer',
                minWidth: 106,
                userSelect: 'none',
                transition: 'background 0.15s',
                borderRadius: 'var(--radius-lg) 0 0 0',
              }}
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{type}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {dropdownOpen && (
              <div className="dropdown">
                {SEARCH_TYPES.map((t) => (
                  <div
                    key={t}
                    className="dropdown-item"
                    onClick={() => {
                      setType(t);
                      setDropdownOpen(false);
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              padding: '13px 15px',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-primary)',
              background: 'transparent',
            }}
            placeholder={type === '기업명' ? '기업명을 검색하세요' : `${type}를 입력하세요`}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '13px 18px',
              borderLeft: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              background: 'transparent',
              borderRadius: '0 var(--radius-lg) 0 0',
            }}
            htmlFor="fileInput"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            참조 문서 업로드
          </label>
          <input
            id="fileInput"
            type="file"
            style={{ display: 'none' }}
            ref={fileRef}
            multiple
            onChange={(e) => {
              handleFiles(e.target.files);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
        </div>

        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', padding: '8px 14px 0' }}>
            {files.map((f, i) => (
              <span key={i} className="file-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                </svg>
                <span>{f.name}</span>
                <span className="file-chip-x" onClick={() => removeFile(i)}>✕</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <textarea
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '14px 56px 14px 18px',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-primary)',
              background: 'transparent',
              minHeight: 84,
              lineHeight: 1.6,
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            }}
            placeholder="기업을 분석하는데 필요한 추가 정보가 있다면 알려주세요."
            rows={3}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <button
            style={{
              position: 'absolute',
              right: 14,
              bottom: 14,
              width: 36,
              height: 36,
              background: canSend ? 'var(--teal)' : '#9CA3AF',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: canSend ? 'pointer' : 'not-allowed',
              boxShadow: 'var(--shadow-btn)',
              transition: 'all 0.2s',
            }}
            onClick={handleSend}
            disabled={!canSend}
            aria-label="분석 시작"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 2 }}>
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </button>
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center' }}>
        입력 정보와 첨부 자료를 바탕으로 심사숙고 AI가 분석을 시작합니다.
      </p>
    </div>
  );
}
