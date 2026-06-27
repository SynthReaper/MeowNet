// app/auth/moderator-login/[[...rest]]/page.tsx — Dedicated Staff Moderator Entry Login
import type { Metadata } from 'next';
import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';
import AuthTabs from '@/components/auth/AuthTabs';

export const metadata: Metadata = {
  title: '🛡️ Staff Moderator Entry | MeowNet',
  description: 'Secure authentication gateway for verified colony moderators and staff.',
  robots: { index: false, follow: false },
};

export default async function ModeratorLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { userId } = await auth();
  const params = await searchParams;
  const isDirect = params?.direct === 'true';

  // If already authenticated, check role and redirect dynamically
  if (userId) {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const serviceClient = createServiceClient();
    const { data: profile } = await (serviceClient
      .from('profiles' as never)
      .select('role')
      .eq('id', userId)
      .single() as any);

    if (profile?.role === 'admin') {
      redirect('/admin');
    } else if (profile?.role === 'moderator') {
      redirect('/moderator');
    } else {
      redirect('/map');
    }
  }

  const colorPrimary = 'var(--empire-gold)';

  const clerkForm = (
    <div className="w-full">
      <ClerkLoading>
        <div className="w-full h-[320px] bg-[var(--bg-surface)] border border-[var(--bg-border)] backdrop-blur-md rounded-2xl flex flex-col justify-center items-center gap-6 p-6 shadow-[var(--shadow-card)]">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
          <div className="w-32 h-5 bg-[var(--bg-elevated)] rounded animate-pulse" />
          <div className="w-full h-10 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <SignIn
          signUpUrl="/auth/signup"
          path="/auth/moderator-login"
          forceRedirectUrl="/moderator"
          fallbackRedirectUrl="/moderator"
          appearance={{
            variables: {
              colorPrimary: colorPrimary,
              colorBackground: 'var(--bg-surface)',
              colorForeground: 'var(--empire-cream)',
              colorMutedForeground: 'var(--text-secondary)',
              colorInput: 'var(--bg-elevated)',
              colorInputForeground: 'var(--empire-cream)',
              colorBorder: 'var(--bg-border)',
            },
            elements: {
              card: {
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'var(--shadow-card)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '400px',
              },
              headerTitle: {
                color: 'var(--empire-cream)',
                fontFamily: 'var(--font-display)',
                fontWeight: '700',
              },
              headerSubtitle: {
                color: 'var(--text-secondary)',
              },
              socialButtonsBlockButton: {
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                color: 'var(--empire-cream)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'var(--bg-border)',
                  borderColor: colorPrimary,
                }
              },
              socialButtonsBlockButtonText: {
                color: 'var(--empire-cream)',
              },
              formButtonPrimary: {
                background: colorPrimary,
                color: 'var(--bg-surface)',
                fontFamily: 'var(--font-display)',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                '&:hover': {
                  filter: 'brightness(0.9)',
                  transform: 'translateY(-1px)',
                  boxShadow: 'var(--shadow-active)',
                }
              },
              formFieldLabel: {
                color: 'var(--text-secondary)',
              },
              formFieldInput: {
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                color: 'var(--empire-cream)',
                '&:focus': {
                  borderColor: 'var(--life-teal)',
                }
              },
              footerActionText: {
                color: 'var(--text-secondary)',
              },
              footerActionLink: {
                color: 'var(--life-teal)',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: 'var(--empire-gold)',
                }
              },
              dividerLine: {
                background: 'var(--bg-border)',
              },
              dividerText: {
                color: 'var(--text-secondary)',
              }
            }
          }}
        />
      </ClerkLoaded>
    </div>
  );

  const databaseForm = (
    <div className="w-full bg-[var(--bg-surface)] border border-[var(--bg-border)] backdrop-blur-md rounded-2xl p-6.5 shadow-[var(--shadow-card)] flex flex-col">
      <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-1 flex items-center gap-1.5 select-none">
        <span className="material-symbols-outlined text-[var(--empire-gold)] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
        <span>Direct Database Login</span>
      </h3>
      <p className="font-body text-[10px] text-[var(--text-secondary)] mb-4 select-none">Bypass Clerk OTP validation challenges using direct credentials.</p>
      <AuthForm mode="login" />
    </div>
  );

  const credentialsBlock = (
    <div className="md:hidden block w-full p-4 rounded-2xl border border-[var(--empire-gold)]/30 bg-[var(--bg-surface)] shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[var(--empire-gold)] text-base">workspace_premium</span>
        <span className="font-display text-xs font-bold text-[var(--empire-gold)] uppercase tracking-wider">Hackathon Judge Credentials</span>
      </div>
      <div className="flex flex-col gap-2">
        <Link 
          href="/auth/moderator-login?email=judge-user@meownet.org&password=JudgeUser2026!"
          className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/45 hover:border-[var(--empire-gold)]/40 hover:bg-[var(--bg-border)]/20 transition-all cursor-pointer block text-left no-underline"
        >
          <div className="font-body text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider mb-1 flex items-center gap-1">🧑 Standard Volunteer (Autofill)</div>
          <div className="font-body text-xs text-[var(--empire-cream)] font-semibold">judge-user@meownet.org</div>
          <div className="font-body text-xs text-[var(--empire-cream)]/60">JudgeUser2026!</div>
        </Link>
        <Link 
          href="/auth/moderator-login?email=judge-submod@meownet.org&password=JudgeSubMod2026!"
          className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/45 hover:border-[var(--empire-gold)]/40 hover:bg-[var(--bg-border)]/20 transition-all cursor-pointer block text-left no-underline"
        >
          <div className="font-body text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider mb-1 flex items-center gap-1">🛡️ Sub-Moderator (Autofill)</div>
          <div className="font-body text-xs text-[var(--empire-cream)] font-semibold">judge-submod@meownet.org</div>
          <div className="font-body text-xs text-[var(--empire-cream)]/60">JudgeSubMod2026!</div>
        </Link>
      </div>
      <p className="font-body text-[9px] text-[var(--empire-cream)]/30 mt-2 leading-relaxed">Clicking automatically switches to the Database Direct tab and pre-fills credentials.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-row bg-[var(--bg-void)] relative overflow-hidden">
      {/* ── Left Column: Premium Brand Panel (md:flex hidden) ── */}
      <div className="md:flex hidden md:w-[45%] lg:w-[50%] flex-col justify-between p-8 lg:p-12 xl:p-16 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)] border-r border-[var(--bg-border)] relative overflow-hidden">
        {/* Glow Spots */}
        <div className="absolute w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[var(--empire-gold)]/8 to-transparent top-[10%] left-[-15%] filter blur-[60px] pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[var(--life-teal)]/8 to-transparent bottom-[10%] right-[-15%] filter blur-[80px] pointer-events-none" />

        {/* Floating Cat-Themed Doodles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute animate-float-slow text-5xl" style={{ top: '35%', left: '10%' }}>🛡️</div>
          <div className="absolute animate-float-medium text-4xl" style={{ top: '65%', left: '15%' }}>🐾</div>
          <div className="absolute animate-float-fast text-5xl" style={{ top: '25%', right: '15%' }}>🔑</div>
          <div className="absolute animate-float-slow text-4xl" style={{ bottom: '20%', right: '12%' }}>🔒</div>
          <div className="absolute animate-float-medium text-3xl" style={{ top: '45%', left: '30%' }}>✨</div>
          <div className="absolute animate-float-fast text-2xl" style={{ bottom: '35%', right: '35%' }}>✨</div>
          <div className="absolute animate-float-slow text-6xl" style={{ bottom: '12%', left: '25%' }}>🐈</div>
          <div className="absolute animate-float-medium text-3xl" style={{ top: '75%', right: '20%' }}>🛡️</div>
        </div>

        {/* Brand Header */}
        <div className="flex items-center gap-3 z-10 select-none">
          <div className="relative w-12 h-12">
            {/* Peeking Cat behind */}
            <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 text-2xl z-0 animate-bounce" style={{ animationDuration: '3s' }}>
              🐱
            </span>
            <div className="relative w-12 h-12 flex items-center justify-center z-10 bg-[var(--bg-surface)]/90 rounded-xl border border-[var(--bg-border)]/35 p-1 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] shadow-inner overflow-hidden">
              <img
                src="/pet-logo.png"
                alt="MeowNet Logo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
          <span className="font-display text-xl font-bold text-[var(--empire-cream)]">MeowNet</span>
        </div>

        {/* Testimonial & Desktop Credentials Wrapper */}
        <div className="z-10 flex flex-col gap-5 max-w-sm">
          {/* Testimonial card */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)]/60 border border-[var(--bg-border)]/45 backdrop-blur-md shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <span className="text-[var(--empire-gold)] text-xl block mb-2">“</span>
            <p className="font-display text-sm italic text-[var(--empire-cream)] leading-relaxed">
              Access the secure staff gateway for verified colony moderators and administrators. Manage user registrations, adjust roles, monitor points systems, and oversee community operations.
            </p>
            <span className="font-body text-xs font-semibold text-[var(--text-secondary)] mt-3 block">
              — MeowNet Operations Team
            </span>
          </div>

          {/* Hackathon Judge Credentials - DESKTOP ONLY */}
          <div className="p-5 rounded-2xl border border-[var(--empire-gold)]/30 bg-[var(--bg-surface)]/60 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-base">workspace_premium</span>
              <span className="font-display text-xs font-bold text-[var(--empire-gold)] uppercase tracking-wider">Hackathon Judge Credentials</span>
            </div>
            <div className="flex flex-col gap-2">
              <Link 
                href="/auth/moderator-login?email=judge-user@meownet.org&password=JudgeUser2026!"
                className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:border-[var(--empire-gold)]/45 hover:bg-[var(--bg-border)]/20 transition-all cursor-pointer block text-left no-underline"
              >
                <div className="font-body text-[9px] font-bold text-[var(--empire-cream)]/45 uppercase tracking-wider mb-1 flex items-center gap-1">🧑 Standard Volunteer (Autofill)</div>
                <div className="font-body text-xs text-[var(--empire-cream)] font-semibold">judge-user@meownet.org</div>
                <div className="font-body text-xs text-[var(--empire-cream)]/65">JudgeUser2026!</div>
              </Link>
              <Link 
                href="/auth/moderator-login?email=judge-submod@meownet.org&password=JudgeSubMod2026!"
                className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:border-[var(--empire-gold)]/45 hover:bg-[var(--bg-border)]/20 transition-all cursor-pointer block text-left no-underline"
              >
                <div className="font-body text-[9px] font-bold text-[var(--empire-cream)]/45 uppercase tracking-wider mb-1 flex items-center gap-1">🛡️ Sub-Moderator (Autofill)</div>
                <div className="font-body text-xs text-[var(--empire-cream)] font-semibold">judge-submod@meownet.org</div>
                <div className="font-body text-xs text-[var(--empire-cream)]/65">JudgeSubMod2026!</div>
              </Link>
            </div>
            <p className="font-body text-[9px] text-[var(--empire-cream)]/35 mt-2 leading-relaxed">Clicking automatically switches to the Database Direct tab and pre-fills credentials.</p>
          </div>
        </div>

        {/* SynthReaper footer link (mandatory) */}
        <p className="font-body text-xs text-[var(--text-secondary)] z-10">
          Developed by{' '}
          <a
            href="https://github.com/SynthReaper"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--empire-gold)] transition-colors underline font-medium"
          >
            SynthReaper
          </a>
        </p>
      </div>

      {/* ── Right Column: centered auth forms ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 bg-[var(--bg-void)] relative overflow-y-auto">
        {/* Mobile-only background elements */}
        <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute animate-float-slow text-4xl" style={{ top: '35%', left: '8%' }}>🛡️</div>
          <div className="absolute animate-float-medium text-3xl" style={{ top: '65%', left: '12%' }}>🐾</div>
          <div className="absolute animate-float-fast text-4xl" style={{ top: '25%', right: '15%' }}>🔑</div>
          <div className="absolute animate-float-slow text-3xl" style={{ bottom: '20%', right: '10%' }}>🔒</div>
          <div className="absolute animate-float-slow text-5xl" style={{ bottom: '10%', left: '30%' }}>🐈</div>
        </div>

        <div className="w-full max-w-[400px] z-10 flex flex-col gap-6 py-6 overflow-y-auto max-h-[90vh]" style={{ scrollbarWidth: 'none' }}>
          <AuthTabs
            clerkForm={clerkForm}
            databaseForm={databaseForm}
            credentialsBlock={credentialsBlock}
          />
        </div>
      </div>
    </div>
  );
}
