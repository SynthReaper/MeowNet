// lib/privacy/consent-text.ts — GDPR consent copy (client-safe, no server imports)
export const AI_CONSENT_TEXT =
  'Your photo will be sent to a third-party AI service (Hugging Face) ' +
  'for breed and condition estimation only. It will not be stored by that service ' +
  'or used for model training. You can use manual entry instead.';

export type ConsentType = 'ai_inference';
