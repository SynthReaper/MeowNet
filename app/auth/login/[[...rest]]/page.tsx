// app/auth/login/[[...rest]]/page.tsx — Volunteer Sign In Page (Split-Screen Brand Style)
// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
import type { Metadata } from 'next';
import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign In | MeowNet',
  description: 'Sign in to your MeowNet account and access your dashboard.',
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, { title: string; body: string; icon: string }> = {
  account_disabled: {
    title: 'Account Disabled',
    body: 'Your account has been suspended. Contact a MeowNet administrator for assistance.',
    icon: 'block',
  },
  trial_expired: {
    title: 'Trial Expired',
    body: 'Your temporary access has expired. Contact an administrator to renew your account.',
    icon: 'timer_off',
  },
  auth_callback_failed: {
    title: 'Verification Failed',
    body: 'The sign-in link was invalid or expired. Please sign in again.',
    icon: 'link_off',
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { userId } = await auth();
  const params = await searchParams;

  // If already authenticated, redirect dynamically based on their Supabase role
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

  const errorParam = params?.error ?? null;
  const errorInfo = errorParam ? ERROR_MESSAGES[errorParam] ?? null : null;
  const isDirect = params?.direct === 'true';

  const colorPrimary = 'var(--empire-gold)';

  return (
    <div className="min-h-screen flex flex-row bg-[var(--bg-void)] relative overflow-hidden">
      {/* ── Left Column: Premium Brand Panel (md:flex hidden) ── */}
      <div className="md:flex hidden md:w-[45%] lg:w-[50%] flex-col justify-between p-8 lg:p-12 xl:p-16 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)] border-r border-[var(--bg-border)] relative overflow-hidden">
        {/* Glow Spots */}
        <div className="absolute w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[var(--empire-gold)]/8 to-transparent top-[10%] left-[-15%] filter blur-[60px] pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[var(--life-teal)]/8 to-transparent bottom-[10%] right-[-15%] filter blur-[80px] pointer-events-none" />

        {/* Floating Cat-Themed Doodles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute animate-float-slow text-5xl" style={{ top: '35%', left: '10%' }}>🐱</div>
          <div className="absolute animate-float-medium text-4xl" style={{ top: '65%', left: '15%' }}>🐾</div>
          <div className="absolute animate-float-fast text-5xl" style={{ top: '25%', right: '15%' }}>🧶</div>
          <div className="absolute animate-float-slow text-4xl" style={{ bottom: '20%', right: '12%' }}>🐟</div>
          <div className="absolute animate-float-medium text-3xl" style={{ top: '45%', left: '30%' }}>✨</div>
          <div className="absolute animate-float-fast text-2xl" style={{ bottom: '35%', right: '35%' }}>✨</div>
          <div className="absolute animate-float-slow text-6xl" style={{ bottom: '12%', left: '25%' }}>🐈</div>
          <div className="absolute animate-float-medium text-3xl" style={{ top: '75%', right: '20%' }}>🧡</div>
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

        {/* Testimonial card */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)]/60 border border-[var(--bg-border)]/45 backdrop-blur-md shadow-lg max-w-sm z-10 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <span className="text-[var(--empire-gold)] text-xl block mb-2">“</span>
          <p className="font-display text-sm italic text-[var(--empire-cream)] leading-relaxed">
            Volunteering with MeowNet helped us save 42 neighborhood strays. The coordination on colony mapping and winter weather monitoring makes a life-saving difference daily.
          </p>
          <span className="font-body text-xs font-semibold text-[var(--text-secondary)] mt-3 block">
            — Northside Colony Keeper
          </span>
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

      {/* ── Right Column: centered Clerk auth widget ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 bg-[var(--bg-void)] relative">
        {/* Mobile-only background elements */}
        <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute animate-float-slow text-4xl" style={{ top: '15%', left: '8%' }}>🐱</div>
          <div className="absolute animate-float-medium text-3xl" style={{ top: '65%', left: '12%' }}>🐾</div>
          <div className="absolute animate-float-fast text-4xl" style={{ top: '25%', right: '15%' }}>🧶</div>
          <div className="absolute animate-float-slow text-3xl" style={{ bottom: '20%', right: '10%' }}>🐟</div>
          <div className="absolute animate-float-slow text-5xl" style={{ bottom: '10%', left: '30%' }}>🐈</div>
        </div>

        {/* Error banner from page params */}
        {errorInfo && (
          <div className="w-full max-w-[400px] mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 z-10 animate-fade-in">
            <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5 flex-shrink-0">{errorInfo.icon}</span>
            <div>
              <p className="font-display text-[11px] font-bold text-red-400 uppercase tracking-wide">{errorInfo.title}</p>
              <p className="font-body text-[11px] text-red-300/80 mt-0.5 leading-relaxed">{errorInfo.body}</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-[400px] z-10 flex flex-col items-center">
          {/* Clerk Domain Warning Info */}
          <div className="w-full mb-5 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-md shadow-sm select-none animate-fade-in">
            <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <div>
              <p className="font-display text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Local Domain Note</p>
              <p className="font-body text-[10.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                Since this app runs locally without a custom domain, Clerk email verification links have a <span className="font-bold text-amber-500/90">30% chance</span> of failing. <strong className="text-[var(--text-primary)]">Social logins (Google / GitHub) are fully functional!</strong>
              </p>
            </div>
          </div>

          <ClerkLoading>
            <div className="w-full h-[450px] bg-[var(--bg-surface)] border border-[var(--bg-border)] backdrop-blur-md rounded-2xl flex flex-col justify-center items-center gap-6 p-10 shadow-[var(--shadow-card)]">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
              <div className="w-40 h-6 bg-[var(--bg-elevated)] rounded animate-pulse" />
              <div className="w-52 h-4 bg-[var(--bg-elevated)] rounded animate-pulse mb-4" />
              <div className="w-full h-11 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
              <div className="w-full h-11 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
            </div>
          </ClerkLoading>

          <ClerkLoaded>
            <SignIn
              signUpUrl="/auth/signup"
              path="/auth/login"
              forceRedirectUrl="/map"
              fallbackRedirectUrl="/map"
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
      </div>
    </div>
  );
}
