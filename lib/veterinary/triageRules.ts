// lib/veterinary/triageRules.ts
// Sources: ASPCA First Aid for Cats, Cornell Feline Health Center guidelines.
// RULE-BASED engine — not ML. Deterministic, auditable, legally defensible.

export type HealthFlag =
  | 'labored_breathing'
  | 'pale_gums'
  | 'distended_abdomen'
  | 'visible_wound'
  | 'extreme_thinness'
  | 'limping'
  | 'nasal_discharge'
  | 'lethargy_signs'
  | 'eye_discharge'
  | 'matted_fur';

export type TriageLevel = 'emergency' | 'urgent' | 'monitor' | 'none';

const EMERGENCY: HealthFlag[] = ['labored_breathing', 'pale_gums', 'distended_abdomen', 'visible_wound'];
const URGENT: HealthFlag[] = ['extreme_thinness', 'limping', 'nasal_discharge', 'lethargy_signs'];

export function triage(flags: HealthFlag[]): { level: TriageLevel; message: string } {
  if (flags.some((f) => EMERGENCY.includes(f)))
    return { level: 'emergency', message: 'This cat shows signs that may require immediate veterinary attention.' };
  if (flags.some((f) => URGENT.includes(f)))
    return { level: 'urgent', message: 'A veterinary check-up is recommended for this cat.' };
  if (flags.length > 0) return { level: 'monitor', message: 'Monitor this cat closely and consider a vet visit.' };
  return { level: 'none', message: '' };
}

export const HEALTH_FLAG_LABELS: Record<HealthFlag, string> = {
  labored_breathing: 'Labored Breathing',
  pale_gums: 'Pale Gums',
  distended_abdomen: 'Distended Abdomen',
  visible_wound: 'Visible Wound',
  extreme_thinness: 'Extreme Thinness',
  limping: 'Limping',
  nasal_discharge: 'Nasal Discharge',
  lethargy_signs: 'Lethargy Signs',
  eye_discharge: 'Eye Discharge',
  matted_fur: 'Matted Fur',
};

/** CRITICAL: disclaimer must appear ADJACENT to any AI output — not in a footer */
export const VETERINARY_DISCLAIMER =
  'Informational estimate from image analysis only. Not a veterinary diagnosis. ' +
  'Consult a licensed veterinarian for any health concerns.';
