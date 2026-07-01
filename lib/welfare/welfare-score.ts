// lib/welfare/welfare-score.ts

export interface WelfareInputs {
  status: string;
  sterilized: boolean;
  vaccinated: boolean;
  microchipped: boolean;
  bcs_estimate: number | null;
  health_flags: string[];
}

export interface WelfareResult {
  score: number;
  label: 'Critical' | 'Poor' | 'Fair' | 'Good' | 'Excellent';
  color: string; // inline style background
  borderColor: string;
  textColor: string;
  breakdown: {
    tnr: number;
    vaccination: number;
    microchip: number;
    bcs: number;
    health: number;
  };
}

export function calculateWelfareScore(cat: WelfareInputs): WelfareResult {
  if (cat.status === 'adopted' || cat.status === 'fostered') {
    return {
      score: 100,
      label: 'Excellent',
      color: 'rgba(0, 106, 99, 0.1)',
      borderColor: 'rgba(0, 106, 99, 0.3)',
      textColor: '#006a63',
      breakdown: { tnr: 30, vaccination: 20, microchip: 10, bcs: 20, health: 20 },
    };
  }

  const tnr = cat.sterilized ? 30 : 0;
  const vaccination = cat.vaccinated ? 20 : 0;
  const microchip = cat.microchipped ? 10 : 0;

  let bcs = 15; // default if null
  if (cat.bcs_estimate !== null && cat.bcs_estimate !== undefined) {
    const diff = Math.abs(cat.bcs_estimate - 5);
    const lookup: Record<number, number> = { 0: 20, 1: 15, 2: 10, 3: 5 };
    bcs = lookup[diff] ?? 0;
  }

  let health = 20;
  if (Array.isArray(cat.health_flags)) {
    health = Math.max(0, 20 - (cat.health_flags.length * 10));
  }

  const score = tnr + vaccination + microchip + bcs + health;

  let label: 'Critical' | 'Poor' | 'Fair' | 'Good' | 'Excellent';
  let color = '';
  let borderColor = '';
  let textColor = '';

  if (score >= 85) {
    label = 'Excellent';
    color = 'rgba(0, 106, 99, 0.1)';
    borderColor = 'rgba(0, 106, 99, 0.3)';
    textColor = '#006a63'; // --life-teal
  } else if (score >= 65) {
    label = 'Good';
    color = 'rgba(129, 140, 248, 0.1)';
    borderColor = 'rgba(129, 140, 248, 0.3)';
    textColor = '#818CF8'; // --status-adopted
  } else if (score >= 45) {
    label = 'Fair';
    color = 'rgba(217, 119, 6, 0.1)'; // orange/amber
    borderColor = 'rgba(217, 119, 6, 0.3)';
    textColor = 'var(--status-tnr)'; // --status-tnr (var(--empire-gold))
  } else if (score >= 25) {
    label = 'Poor';
    color = 'rgba(249, 115, 22, 0.1)';
    borderColor = 'rgba(249, 115, 22, 0.3)';
    textColor = '#f97316';
  } else {
    label = 'Critical';
    color = 'rgba(186, 26, 26, 0.1)';
    borderColor = 'rgba(186, 26, 26, 0.3)';
    textColor = 'var(--status-stray)'; // --status-stray
  }

  return {
    score,
    label,
    color,
    borderColor,
    textColor,
    breakdown: { tnr, vaccination, microchip, bcs, health },
  };
}
