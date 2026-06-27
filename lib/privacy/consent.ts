// lib/privacy/consent.ts — GDPR consent recording (server-only)
// Client-safe constants are in consent-text.ts

import { createServerClient } from '@/lib/supabase/server';
export type { ConsentType } from './consent-text';
export { AI_CONSENT_TEXT } from './consent-text';

export async function recordConsent(userId: string, consentType: string): Promise<void> {
  const supabase = await createServerClient();
  await supabase.from('user_consents' as never).upsert({
    user_id: userId,
    consent_type: consentType,
    recorded_at: new Date().toISOString(),
  } as never);
}

export async function hasConsented(userId: string, consentType: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('user_consents' as never)
    .select('user_id')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .maybeSingle();
  return !!data;
}
