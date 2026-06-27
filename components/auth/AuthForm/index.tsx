'use client';
// components/auth/AuthForm/index.tsx — Supabase Email+Password Auth

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface AuthFormProps { mode: 'login' | 'signup'; }

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please check your email and click the confirmation link.',
  'User already registered': 'An account with this email already exists. Try signing in.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const defaultEmail = searchParams?.get('email') ?? '';
  const defaultPassword = searchParams?.get('password') ?? '';

  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams?.get('email');
    const passwordParam = searchParams?.get('password');
    if (emailParam !== null && emailParam !== undefined) {
      setEmail(emailParam);
    }
    if (passwordParam !== null && passwordParam !== undefined) {
      setPassword(passwordParam);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || null },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) {
          setError(ERROR_MAP[signUpError.message] ?? signUpError.message);
        } else {
          setSuccess('Check your email for a confirmation link. You\'re almost in the empire!');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(ERROR_MAP[signInError.message] ?? signInError.message);
        } else {
          router.push('/cats');
          router.refresh();
        }
      }
    });
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    setError(null);
    startTransition(async () => {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    });
  };

  if (success) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
        </div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Check your email</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{success}</p>
        <Link href="/" className="btn btn-ghost" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* OAuth buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={isPending}
          id="auth-google"
          className="btn btn-ghost"
          style={{ width: '100%', gap: '0.625rem', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('github')}
          disabled={isPending}
          id="auth-github"
          className="btn btn-ghost"
          style={{ width: '100%', gap: '0.625rem', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>
      </div>

      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.375rem',
        background: 'rgba(212,160,23,0.06)', 
        border: '1px solid rgba(212,160,23,0.2)', 
        borderRadius: 'var(--radius-sm)', 
        padding: '0.625rem 0.75rem', 
        fontSize: '0.75rem', 
        lineHeight: '1.4', 
        color: 'var(--empire-gold)', 
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}>
        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
        <span>Note: Google and GitHub logins require configuration in your Supabase dashboard. You can use standard email and password sign in/up to proceed immediately.</span>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--bg-border)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or with email</span>
        <div style={{ flex: 1, height: 1, background: 'var(--bg-border)' }} />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {mode === 'signup' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(245,230,200,0.6)', marginBottom: '0.375rem' }}>
              Display Name
            </label>
            <input
              id="auth-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Feral Queen Bertha"
              maxLength={50}
              style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--empire-cream)', fontSize: '0.9rem' }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(245,230,200,0.6)', marginBottom: '0.375rem' }}>
            Email <span style={{ color: 'var(--status-stray)' }}>*</span>
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--empire-cream)', fontSize: '0.9rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(245,230,200,0.6)', marginBottom: '0.375rem' }}>
            Password <span style={{ color: 'var(--status-stray)' }}>*</span>
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
            placeholder="••••••••"
            style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--empire-cream)', fontSize: '0.9rem', letterSpacing: '0.1em' }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', color: 'var(--status-stray)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          id="auth-submit"
          disabled={isPending}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '0.25rem' }}>
          {isPending ? (
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              <span>Please wait…</span>
            </span>
          ) : (
            mode === 'login' ? 'Sign In to Empire' : 'Create Empire Account'
          )}
        </button>
      </form>

      {/* Toggle link */}
      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        {mode === 'login' ? (
          <>No account? <Link href="/auth/signup" style={{ color: 'var(--life-teal)', textDecoration: 'none', fontWeight: 600 }}>Join the Empire</Link></>
        ) : (
          <>Already a member? <Link href="/auth/login" style={{ color: 'var(--life-teal)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link></>
        )}
      </p>
    </div>
  );
}
