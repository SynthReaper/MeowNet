// lib/veterinary/bcsScale.ts
// Source: Purina Body Condition System (referenced, not reproduced)

export const BCS_SCALE = {
  1: { label: 'Emaciated',     risk: 'critical' as const, guidance: 'Immediate veterinary care recommended' },
  2: { label: 'Very Thin',     risk: 'high'     as const, guidance: 'Veterinary assessment recommended soon' },
  3: { label: 'Thin',          risk: 'moderate' as const, guidance: 'Monitor weight; increase food access' },
  4: { label: 'Underweight',   risk: 'low'      as const, guidance: 'Monitor regularly' },
  5: { label: 'Ideal',         risk: 'none'     as const, guidance: 'Maintain current care' },
  6: { label: 'Slightly Over', risk: 'low'      as const, guidance: 'Monitor portion sizes' },
  7: { label: 'Overweight',    risk: 'moderate' as const, guidance: 'Dietary review recommended' },
  8: { label: 'Obese',         risk: 'high'     as const, guidance: 'Veterinary dietary guidance' },
  9: { label: 'Morbidly Obese',risk: 'critical' as const, guidance: 'Veterinary care recommended' },
} as const;

export type BCSRisk = 'critical' | 'high' | 'moderate' | 'low' | 'none';

export const BCS_RISK_COLORS: Record<BCSRisk, string> = {
  critical: 'var(--status-stray)',
  high:     '#F97316',
  moderate: 'var(--status-tnr)',
  low:      'var(--life-teal)',
  none:     'var(--status-adoptable)',
};
