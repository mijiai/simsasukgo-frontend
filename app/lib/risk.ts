import type { RiskLevel } from './analysis-types';

export interface RiskMeta {
  rating: string;       // 'A' | 'B' | 'C' | 'D'
  ratingName: string;   // '안전' | '양호' | '주의' | '위험'
  pillLabel: string;    // '저위험' | '중간 위험' | '고위험' | '매우 위험'
}

const TABLE: Record<RiskLevel, RiskMeta> = {
  LOW:      { rating: 'A', ratingName: '안전', pillLabel: '저위험' },
  MEDIUM:   { rating: 'B', ratingName: '양호', pillLabel: '중간 위험' },
  HIGH:     { rating: 'C', ratingName: '주의', pillLabel: '고위험' },
  CRITICAL: { rating: 'D', ratingName: '위험', pillLabel: '매우 위험' },
};

export function riskMeta(level: RiskLevel | string | null | undefined): RiskMeta {
  if (level && level in TABLE) return TABLE[level as RiskLevel];
  return { rating: '?', ratingName: '미정', pillLabel: String(level ?? '미정') };
}
