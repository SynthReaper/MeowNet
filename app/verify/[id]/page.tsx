// app/verify/[id]/page.tsx — Public Cryptographic Verification Portal
import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function verifyCryptoSignature(userId: string, catId: string, clinic: string, date: string, signature: string): boolean {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'meownet-salt-2026';
  const data = `${userId}:${catId}:${clinic}:${date}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return expected === signature;
}

export default async function PublicVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createServiceClient();

  const { data: proof, error } = await admin
    .from('proof_of_neuter' as never)
    .select('*, cats:cat_id(name), profiles:user_id(display_name)')
    .eq('id', id)
    .single();

  if (error || !proof) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-8 text-center flex flex-col gap-4 text-[#5c4a3c]">
          <span className="material-symbols-outlined text-5xl text-red-500">cancel</span>
          <h1 className="font-display text-xl font-bold text-[#ba1a1a]">Invalid Certificate</h1>
          <p className="font-body text-xs text-[#5c4a3c]/60">
            No sterilization proof matches this URL reference in the MeowNet registry.
          </p>
          <Link href="/" className="bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-xs font-bold py-2 rounded-xl">
            Home
          </Link>
        </div>
      </div>
    );
  }

  const p = proof as any;
  const isSignatureValid = verifyCryptoSignature(p.user_id, p.cat_id, p.clinic_name, p.neuter_date, p.signature);

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-4 border-double border-[var(--empire-gold)] rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center text-[#5c4a3c]">
        
        {/* Verification Checkmark */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 mb-4 ${
          isSignatureValid && p.status === 'verified'
            ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
            : 'bg-amber-50 text-amber-600 border-amber-300'
        }`}>
          <span className="material-symbols-outlined text-3xl">
            {isSignatureValid && p.status === 'verified' ? 'verified' : 'pending_actions'}
          </span>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--empire-gold)]">
          MeowNet Cryptographic Ledger
        </span>
        
        <h1 className="font-display text-xl font-extrabold text-[#3b2d23] mt-2 mb-1">
          Sterilization Verified
        </h1>
        
        <div className="w-full border-t border-[#dbc2b2]/40 my-4" />

        <div className="flex flex-col gap-3 w-full text-xs font-body">
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">Feline Patient:</span>
            <strong className="text-[#3b2d23]">{p.cats?.name || 'Unnamed Cat'}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">Sterilization Date:</span>
            <strong className="text-[#3b2d23]">
              {new Date(p.neuter_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">Attending Clinic:</span>
            <strong className="text-[#3b2d23]">{p.clinic_name}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">Registered By:</span>
            <strong className="text-[#3b2d23]">{p.profiles?.display_name || 'Anonymous Rescuer'}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c4a3c]/50">Status:</span>
            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
              p.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {p.status}
            </span>
          </div>
        </div>

        <div className="w-full border-t border-[#dbc2b2]/40 my-4" />

        {/* Cryptographic check */}
        <div className="bg-[#fcf9f6] border border-[#dbc2b2]/30 rounded-xl p-3 w-full text-left font-data text-[9px] text-[#5c4a3c]/50 select-all break-all leading-normal flex flex-col gap-1">
          <span className="font-bold uppercase tracking-wider block text-[8px]">Audit Hash SHA256:</span>
          <span>{p.signature}</span>
          <span className={`text-[8px] font-black uppercase mt-1 block ${isSignatureValid ? 'text-emerald-600' : 'text-red-600'}`}>
            {isSignatureValid ? '✓ Signature matches payload' : '✗ WARNING: Signature mismatch! Altered record.'}
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
