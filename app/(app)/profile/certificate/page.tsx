// app/(app)/profile/certificate/page.tsx — Volunteer/Staff Impact Certificate
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PrintButton from '@/components/profile/PrintButton';
import crypto from 'crypto';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function CertificatePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Load volunteer and staff stats
  const [profileRes, catsRes, signupsRes, resolvedQueriesRes, auditedActionsRes] = await Promise.all([
    supabase.from('profiles' as never).select('*').eq('id', user.id).single(),
    supabase.from('cats' as never).select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('event_signups' as never).select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('moderator_queries' as never).select('id', { count: 'exact', head: true }).eq('moderator_id', user.id).eq('status', 'resolved'),
    supabase.from('staff_audit_logs' as never).select('id', { count: 'exact', head: true }).eq('actor_id', user.id),
  ]);

  const profile = (profileRes.data ?? {}) as any;
  const catsLogged = catsRes.count ?? 0;
  const eventsAssisted = signupsRes.count ?? 0;
  const resolvedQueries = resolvedQueriesRes.count ?? 0;
  const auditedActions = auditedActionsRes.count ?? 0;

  const joinDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recent';

  const userRole = profile.role ?? 'user';
  const isStaff = userRole === 'moderator' || userRole === 'admin';

  // Use staff-specific metrics if user has moderator/admin role
  const metric1 = isStaff ? resolvedQueries : catsLogged;
  const metric2 = isStaff ? auditedActions : eventsAssisted;
  const metric3 = profile.empire_points ?? 0;

  // Cryptographic Verification ID derivation
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'meownet-salt-2026';
  const dataPayload = `${user.id}:${metric1}:${metric2}:${metric3}`;
  const sig = crypto.createHmac('sha256', secret).update(dataPayload).digest('hex');
  const cryptId = `VCRT-${user.id.substring(0, 8).toUpperCase()}-${sig.substring(0, 12).toUpperCase()}`;

  // Get dynamic origin for verification url
  const headersList = await headers();
  const host = headersList.get('host') || 'meownet.app';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  const verifyUrl = `${origin}/verify/volunteer/${user.id}?cats=${metric1}&events=${metric2}&points=${metric3}&sig=${sig}`;

  return (
    <div className="min-h-screen bg-[var(--bg-void)] py-10 px-4 print:bg-white print:py-0">
      {/* Screen Navigation */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link 
          href="/profile" 
          className="flex items-center gap-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] text-xs font-bold uppercase tracking-wider no-underline"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Back to Profile</span>
        </Link>
        <PrintButton />
      </div>

      {/* Certificate Container */}
      <div 
        className="certificate-container max-w-4xl mx-auto bg-white text-[#5c4a3c] rounded-3xl p-10 md:p-16 border-8 border-double border-[var(--empire-gold)] shadow-xl relative overflow-hidden print:shadow-none print:border-8 print:my-0 print:rounded-none"
        style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
      >
        {/* Subtle decorative background watermark */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center select-none">
          <span className="material-symbols-outlined text-[300px]">pets</span>
        </div>

        {/* Top Header */}
        <div className="flex flex-col items-center text-center gap-4 relative z-10">
          <span className="material-symbols-outlined text-5xl text-[var(--empire-gold)]">military_tech</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--empire-gold)]">
            Official Certification of Service
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight text-[#3b2d23] mt-1">
            {isStaff ? 'Staff Impact Report' : 'Volunteer Impact Report'}
          </h1>
          <p className="font-body text-xs text-[#5c4a3c]/60 max-w-lg mt-1 italic">
            {isStaff 
              ? 'This document certifies the active platform administration, community stewardship, and moderation accomplishments of the registered MeowNet staff member named below.'
              : 'This document certifies the active civic contributions and field rescue accomplishments of the registered MeowNet guardian named below.'
            }
          </p>
        </div>

        {/* Recipient details */}
        <div className="my-10 text-center relative z-10">
          <span className="text-[10px] font-bold text-[#5c4a3c]/50 uppercase tracking-widest block">This certificate is proudly awarded to</span>
          <div className="text-2xl md:text-4xl font-extrabold text-[var(--empire-gold-dim)] my-3 border-b border-dashed border-[#5c4a3c]/20 pb-2 max-w-md mx-auto">
            {profile.display_name ?? (isStaff ? 'Anonymous Staff' : 'Anonymous Volunteer')}
          </div>
          <span className="text-xs font-medium text-[#5c4a3c]/60">
            {isStaff 
              ? `For outstanding services as a Platform Moderator and Community Steward since ${joinDate}.`
              : `For outstanding services as a Stray Cat Colony Caretaker and TNR Advocate since ${joinDate}.`
            }
          </span>
        </div>

        {/* Verified Impact Metrics Grid */}
        <div className="grid grid-cols-3 gap-4 border border-[#dbc2b2]/40 rounded-2xl p-6 bg-[#fcf9f6]/80 my-8 text-center relative z-10">
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-[var(--life-teal)]">{metric1}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#5c4a3c]/50 mt-1">
              {isStaff ? 'Queries Resolved' : 'Feline Sightings'}
            </div>
          </div>
          <div className="border-x border-[#dbc2b2]/30">
            <div className="text-2xl md:text-3xl font-extrabold text-[var(--empire-gold-dim)]">{metric2}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#5c4a3c]/50 mt-1">
              {isStaff ? 'Audited Actions' : 'TNR Ops Assisted'}
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-indigo-600">{metric3.toLocaleString()}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#5c4a3c]/50 mt-1">Karma/XP Points</div>
          </div>
        </div>

        {/* Footer verification signatures */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8 mt-12 pt-8 border-t border-[#dbc2b2]/30 relative z-10 text-xs font-semibold text-[#5c4a3c]/60">
          <div className="flex flex-col items-center text-center">
            <span className="font-display font-bold italic text-[#3b2d23] text-sm mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              MeowNet Registry
            </span>
            <div className="w-32 border-t border-[#5c4a3c]/35 my-1" />
            <span className="text-[8px] font-black uppercase text-[#5c4a3c]/45">Platform Auditor</span>
          </div>

          <div className="text-center flex flex-col items-center gap-1.5 max-w-[280px]">
            <span className="text-[9px] text-[#5c4a3c]/50 font-bold uppercase tracking-wide">Verification Token</span>
            <span className="font-mono text-[8px] text-[var(--empire-gold-dim)] font-black tracking-wider select-all select-none">
              {cryptId}
            </span>
            <span className="text-[6.5px] font-mono text-[#5c4a3c]/45 block max-w-xs break-all select-all font-semibold leading-relaxed">
              Verify: {verifyUrl}
            </span>
            <Link 
              href={verifyUrl}
              target="_blank"
              className="text-[8px] font-black text-indigo-600 uppercase hover:underline tracking-widest print:hidden mt-0.5"
            >
              Verify Authenticity
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="font-display font-bold italic text-[#3b2d23] text-sm mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              SynthReaper
            </span>
            <div className="w-32 border-t border-[#5c4a3c]/35 my-1" />
            <span className="text-[8px] font-black uppercase text-[#5c4a3c]/45">Project Founder</span>
          </div>
        </div>
      </div>

      {/* Screen only instructions */}
      <div className="text-center text-xs text-[var(--empire-cream)]/40 font-bold mt-6 print:hidden">
        Tip: Set layout to Landscape, background colors "Enabled", and margins "Minimum" in the browser print dialog.
      </div>

      {/* Media print stylesheet injection to enforce transparent/no background on body, navbar, and footer */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide Navbar, Footer, and screen-only controls */
          nav, footer, header, aside, .print-hidden, .print\\:hidden, div[style*="flex-direction: column"] > nav, div[style*="flex-direction: column"] > footer {
            display: none !important;
          }
          
          /* Body, html page context adjustments - strictly force no background and single page print */
          body, html {
            background: white !important;
            background-color: white !important;
            color: #3b2d23 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          
          #main-content, div[style*="min-height"], .min-h-screen {
            background: white !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
            height: auto !important;
          }
          
          /* Prevent outer margins and force landscape orientation */
          @page {
            size: landscape;
            margin: 0mm;
          }
          
          /* Center and format the certificate block on exactly one landscape page */
          .certificate-container {
            margin: 0 auto !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: 12px double var(--empire-gold) !important;
            background: white !important;
            background-color: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            padding: 40px !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
