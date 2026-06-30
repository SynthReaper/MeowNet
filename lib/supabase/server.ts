// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// lib/supabase/server.ts — SSR-safe server client
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';
  return createSSRClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Read-only context (Server Component) — ignore
          }
        },
      },
    },
  );
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key';
  return createSSRClient<Database>(
    url,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}
