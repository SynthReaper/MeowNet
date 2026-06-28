// app/verify/volunteer/[id]/page.tsx — Volunteer Certificate Cryptographic Verification
import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function verifyCryptoSignature(userId: string, cats: string, events: string, points: string, signature: string): boolean {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'meownet-salt-2026';
  const data = `${userId}:${cats}:${events}:${points}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return expected === signature;
}

export default async function VolunteerVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cats?: string; events?: string; points?: string; sig?: string }>;
}) {
  const { id: userId } = await params;
  const { cats = '0', events = '0', points = '0', sig = '' } = await searchParams;

  const isSignatureValid = verifyCryptoSignature(userId, cats, events, points, sig);
  const admin = createServiceClient();

  // Load the profile display name and role for confirmation
  const { data: profile, error } = await admin
    .from('profiles' as never)
    .select('display_name, role')
    .eq('id', userId)
    .single() as any;

  if (error || !profile || !isSignatureValid) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-8 text-center flex flex-col gap-4 text-[#5c4a3c]" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <span className="material-symbols-outlined text-5xl text-red-500">cancel</span>
          <h1 className="font-display text-xl font-bold text-[#ba1a1a]">Invalid Certificate Token</h1>
          <p className="font-body text-xs text-[#5c4a3c]/60">
            This verification token signature does not match or is no longer linked to a registered MeowNet record.
          </p>
          <Link href="/" className="bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-xs font-bold py-2.5 rounded-xl no-underline text-[var(--text-primary)] hover:bg-[var(--bg-border)]/20 transition-all">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const isStaff = profile.role === 'moderator' || profile.role === 'admin';

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center p-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-md w-full bg-white border-4 border-double border-[var(--empire-gold)] rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center text-[#5c4a3c]">
        
        {/* Verification Checkmark */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 mb-4 bg-emerald-50 text-emerald-600 border-emerald-300">
          <span className="material-symbols-outlined text-3xl">verified</span>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--empire-gold)]">
          MeowNet Cryptographic Ledger
        </span>
        
        <h1 className="font-display text-xl font-extrabold text-[#3b2d23] mt-2 mb-1">
          {isStaff ? 'Staff Certification Verified' : 'Volunteer Certification Verified'}
        </h1>
        
        <div className="w-full border-t border-[#dbc2b2]/40 my-4" />

        <div className="flex flex-col gap-3 w-full text-xs font-body">
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">{isStaff ? 'Staff Name:' : 'Caretaker Name:'}</span>
            <strong className="text-[#3b2d23]">{profile.display_name || (isStaff ? 'Anonymous Staff' : 'Anonymous Rescuer')}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">{isStaff ? 'Queries Resolved:' : 'Feline Sightings Logged:'}</span>
            <strong className="text-emerald-600 font-extrabold">{cats}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">{isStaff ? 'Audited Actions:' : 'TNR Ops Assisted:'}</span>
            <strong className="text-[var(--empire-gold-dim)] font-extrabold">{events}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">Karma / XP points:</span>
            <strong className="text-indigo-600 font-extrabold">{parseInt(points, 10).toLocaleString()}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">Ledger Registry:</span>
            <span className="px-2 py-0.5 rounded font-bold uppercase text-[9px] bg-emerald-50 text-emerald-700">
              Verified record
            </span>
          </div>
        </div>

        <div className="w-full border-t border-[#dbc2b2]/40 my-4" />

        {/* Cryptographic check */}
        <div className="bg-[#fcf9f6] border border-[#dbc2b2]/30 rounded-xl p-3 w-full text-left font-data text-[9px] text-[#5c4a3c]/50 select-all break-all leading-normal flex flex-col gap-1">
          <span className="font-bold uppercase tracking-wider block text-[8px]">Audit Hash SHA256:</span>
          <span>{sig}</span>
          <span className="text-[8px] font-black uppercase mt-1 block text-emerald-600">
            ✓ Signature matches payload
          </span>
        </div>

        <Link
          href="/"
          className="mt-6 font-display text-xs font-black uppercase text-[var(--empire-gold)] hover:underline no-underline"
        >
          Return to home
        </Link>
      </div>
    </div>
  );
}
