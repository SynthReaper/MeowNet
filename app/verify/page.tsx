// app/verify/page.tsx — Cryptographic Verification Engine Portal
import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function handleVerification(formData: FormData) {
  'use server';
  const token = formData.get('token')?.toString().trim();
  if (!token) return;

  // Case 1: Standard UUID (Proof of Neuter Certificate)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(token)) {
    redirect(`/verify/${token}`);
  }

  // Case 2: Cryptographic Volunteer Impact Token
  const tokenRegex = /^VCRT-([0-9A-F]{8})-([0-9A-F]{12})$/i;
  const match = token.match(tokenRegex);
  if (match) {
    const truncatedUserId = match[1].toLowerCase();
    const truncatedSig = match[2].toUpperCase();

    // Query profiles in database matching truncated ID
    const admin = createServiceClient();
    const { data: profile } = await admin
      .from('profiles' as never)
      .select('id, empire_points')
      .filter('id', 'like', `${truncatedUserId}%`)
      .maybeSingle() as any;

    if (profile) {
      // Fetch stats
      const [catsRes, signupsRes] = await Promise.all([
        admin.from('cats' as never).select('id', { count: 'exact', head: true }).eq('owner_id', profile.id),
        admin.from('event_signups' as never).select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      ]);

      const catsLogged = catsRes.count ?? 0;
      const eventsAssisted = signupsRes.count ?? 0;
      const points = profile.empire_points ?? 0;

      // Rebuild signature
      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'meownet-salt-2026';
      const dataPayload = `${profile.id}:${catsLogged}:${eventsAssisted}:${points}`;
      const sig = crypto.createHmac('sha256', secret).update(dataPayload).digest('hex');

      if (sig.substring(0, 12).toUpperCase() === truncatedSig) {
        redirect(`/verify/volunteer/${profile.id}?cats=${catsLogged}&events=${eventsAssisted}&points=${points}&sig=${sig}`);
      }
    }
  }

  // If validation fails, redirect with error query parameter
  redirect('/verify?error=invalid_token');
}

export default async function VerifyPortalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center p-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-md w-full bg-white border-4 border-double border-[var(--empire-gold)] rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center text-[#5c4a3c]">
        
        {/* Verification Shield Icon */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 mb-4 bg-indigo-50 text-indigo-600 border-indigo-300">
          <span className="material-symbols-outlined text-3xl">verified_user</span>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--empire-gold)]">
          MeowNet Verification Engine
        </span>
        
        <h1 className="font-display text-xl font-extrabold text-[#3b2d23] mt-2 mb-1">
          Registry Validation Portal
        </h1>
        <p className="font-body text-xs text-[#5c4a3c]/60 mb-6 leading-relaxed">
          Authenticate volunteer impact reports or proof-of-neuter certificates using the cryptographic registry ID.
        </p>

        <form action={handleVerification} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[10px] font-black uppercase text-[#5c4a3c]/60 tracking-wider">
              Certificate Token ID
            </label>
            <input
              type="text"
              name="token"
              placeholder="e.g. VCRT-85AA58B6-D4E1CB95A012 or UUID"
              required
              className="bg-[#fcf9f6] border border-[#dbc2b2]/50 text-xs px-4 py-3 rounded-xl text-[#3b2d23] placeholder-[#5c4a3c]/40 outline-none focus:border-[var(--empire-gold)] transition-colors w-full font-mono uppercase"
            />
          </div>

          {error === 'invalid_token' && (
            <span className="text-[10px] text-rose-500 font-semibold bg-rose-50 border border-rose-100 py-2 px-3 rounded-lg text-left flex items-center gap-1.5 animate-pulse">
              <span className="material-symbols-outlined text-sm">error</span>
              Token signature verification failed. Please try again.
            </span>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[var(--empire-gold)] hover:bg-[var(--empire-gold-dim)] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer border-none shadow-md"
          >
            Validate Certificate
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 font-display text-xs font-black uppercase text-[var(--text-primary)] hover:underline no-underline hover:text-[var(--empire-gold)]"
        >
          Return to home
        </Link>
      </div>
    </div>
  );
}
