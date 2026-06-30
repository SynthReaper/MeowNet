// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// lib/supabase/client.ts — Browser singleton
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';
  return createBrowserClient<Database>(url, anonKey);
}
