// app/auth/admin-login/[[...rest]]/page.tsx — Dedicated Administrative Control Panel Login
import type { Metadata } from 'next';
import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import AuthTabs from '@/components/auth/AuthTabs';

export const metadata: Metadata = {
  title: '👑 Crown Control Panel Log In | MeowNet',
  description: 'Secure authentication for MeowNet system administrators.',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const { userId } = await auth();

  // If already authenticated, check role and redirect
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

  const cardTitle = '👑 Control Center Log In';
  const subtitle = 'Authorized access for MeowNet system administrators.';
  const colorPrimary = 'var(--empire-gold)';
  const glowColor = 'rgba(242, 180, 56, 0.08)';
  const emojis = ['👑', '🔑', '⚙️', '🔒', '💻', '📈', '🛡️', '🐱'];

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
          path="/auth/admin-login"
          forceRedirectUrl="/admin"
          fallbackRedirectUrl="/admin"
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-void)', 
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Immersive background glow elements */}
      <div style={{ 
        position: 'absolute', 
        width: '400px', 
        height: '400px', 
        borderRadius: '50%', 
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, 
        top: '5%', 
        left: '10%', 
        filter: 'blur(60px)', 
        pointerEvents: 'none' 
      }} />
      <div style={{ 
        position: 'absolute', 
        width: '500px', 
        height: '500px', 
        borderRadius: '50%', 
        background: 'radial-gradient(circle, rgba(0, 106, 99, 0.04) 0%, transparent 70%)', 
        bottom: '5%', 
        right: '10%', 
        filter: 'blur(80px)', 
        pointerEvents: 'none' 
      }} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute animate-float-slow text-4xl" style={{ top: '30%', left: '8%' }}>{emojis[0]}</div>
        <div className="absolute animate-float-medium text-3xl" style={{ top: '65%', left: '12%' }}>{emojis[1]}</div>
        <div className="absolute animate-float-fast text-4xl" style={{ top: '25%', right: '15%' }}>{emojis[2]}</div>
        <div className="absolute animate-float-slow text-3xl" style={{ bottom: '20%', right: '10%' }}>{emojis[3]}</div>
        <div className="absolute animate-float-medium text-2xl" style={{ top: '45%', left: '25%' }}>{emojis[4]}</div>
        <div className="absolute animate-float-fast text-xl" style={{ bottom: '35%', right: '30%' }}>{emojis[5]}</div>
        <div className="absolute animate-float-slow text-5xl" style={{ bottom: '10%', left: '30%' }}>{emojis[6]}</div>
        <div className="absolute animate-float-medium text-2xl" style={{ top: '75%', right: '25%' }}>{emojis[7]}</div>
      </div>

      <div style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        flexDirection: 'column', 
        alignItems: 'center',
        zIndex: 1
      }}>
        <div className="w-full max-w-[400px] z-10 flex flex-col gap-6 py-6 overflow-y-auto max-h-[90vh]" style={{ scrollbarWidth: 'none' }}>
          <AuthTabs
            clerkForm={clerkForm}
            databaseForm={databaseForm}
          />

          <div style={{ marginTop: '0.5rem', textAlign: 'center', zIndex: 1 }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '600', 
              color: colorPrimary, 
              background: 'rgba(255, 255, 255, 0.03)', 
              padding: '6px 12px', 
              borderRadius: '20px',
              border: `1px solid ${colorPrimary}33`
            }}>
              🔒 ADMIN CONTROL PORTAL ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
