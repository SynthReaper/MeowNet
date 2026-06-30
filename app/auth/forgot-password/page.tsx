'use client';
// app/auth/forgot-password/page.tsx — Custom Password Reset Flow
// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// Design matching MeowNet brand with step-by-step custom wizard

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordStrength from '@/components/auth/PasswordStrength';

type ResetStep = 'email' | 'code' | 'success';

function CatPawDecor({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="40" rx="14" ry="12" opacity="0.9"/>
      <ellipse cx="10" cy="22" rx="7" ry="8" opacity="0.9"/>
      <ellipse cx="22" cy="16" rx="6" ry="7" opacity="0.9"/>
      <ellipse cx="38" cy="16" rx="6" ry="7" opacity="0.9"/>
      <ellipse cx="50" cy="22" rx="7" ry="8" opacity="0.9"/>
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [mounted, setMounted] = useState(false);

  // OTP input refs for auto-focus
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await signIn!.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setStep('code');
      setResendCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to send reset code. Please check the email address.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || resendCountdown > 0) return;
    setLoading(true);
    setError('');
    try {
      await signIn!.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setCode(['', '', '', '', '', '']);
      setResendCountdown(60);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || 'Failed to resend reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: fullCode,
        password,
      });

      if (result.status === 'complete') {
        setStep('success');
        if (setActive) {
          await setActive({ session: result.createdSessionId });
        }
      } else {
        setError('Password reset incomplete. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to reset password. Please check your code and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP digit input handler
  const handleDigitChange = useCallback((idx: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => { if (i < 6) newCode[i] = d; });
      setCode(newCode);
      const nextFocus = Math.min(digits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, '');
    const newCode = [...code];
    newCode[idx] = digit;
    setCode(newCode);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }, [code]);

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 sm:p-8 md:p-12"
      style={{ background: 'var(--bg-void)' }}
    >
      {/* ── Ambient background glows ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,140,56,0.07) 0%, transparent 70%)',
          top: '-10%', left: '-5%', filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,106,99,0.06) 0%, transparent 70%)',
          bottom: '-5%', right: '-5%', filter: 'blur(70px)',
        }}
      />

      {/* Decorative paws */}
      <CatPawDecor className="absolute top-8 right-12 w-10 h-10 text-[var(--empire-gold)]/8 rotate-12 pointer-events-none" />
      <CatPawDecor className="absolute bottom-16 left-10 w-8 h-8 text-[var(--life-teal)]/8 -rotate-20 pointer-events-none" />

      {/* Card */}
      <div
        className={`relative w-full max-w-[420px] flex flex-col gap-0 rounded-2xl overflow-hidden transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 text-center relative"
          style={{ borderBottom: '1px solid var(--bg-border)' }}
        >
          <div className="flex items-center justify-center gap-3 mb-4 select-none">
            <div className="relative w-11 h-11">
              {/* Peeking Cat behind */}
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-xl z-0 animate-bounce" style={{ animationDuration: '3s' }}>
                🐱
              </span>
              {/* Main logo image */}
              <img
                src="/pet-logo.png"
                className="relative w-11 h-11 object-contain z-10 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
                alt="MeowNet Logo"
              />
            </div>
            <span className="font-display text-lg font-bold text-[var(--empire-cream)]">MeowNet</span>
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--empire-cream)] leading-tight">Reset Password</h1>
          <p className="font-body text-xs text-[var(--text-secondary)] mt-1">Get back into the Cat Empire</p>
        </div>

        {/* Form Body */}
        <div className="px-5 sm:px-6 py-6 sm:py-8">
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="flex flex-col gap-4">
              <p className="font-body text-[11px] text-[var(--text-secondary)] leading-relaxed text-center">
                Enter your email address and we'll send you a 6-digit code to reset your password.
              </p>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[18px] pointer-events-none">mail</span>
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl pl-10 pr-4 py-3 font-body text-sm text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/40 outline-none focus:border-[var(--empire-gold)] transition-colors"
                />
              </div>

              {error && (
                <p className="text-[11px] text-red-400 flex items-center gap-1.5 justify-center">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-xl bg-[var(--empire-gold)] text-black font-display font-bold text-sm hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                ) : (
                  <>Send Reset Code <span className="material-symbols-outlined text-sm">arrow_forward</span></>
                )}
              </button>

              <Link
                href="/auth/login"
                className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--empire-cream)] transition-colors text-center mt-1"
              >
                ← Back to login
              </Link>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="text-center mb-1">
                <div className="w-12 h-12 rounded-full bg-[var(--life-teal)]/10 border border-[var(--life-teal)]/30 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[var(--life-teal)] text-[22px]">mark_email_read</span>
                </div>
                <p className="font-body text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  We've sent a 6-digit reset code to <br />
                  <span className="text-[var(--empire-cream)] font-semibold">{email}</span>.
                </p>
              </div>

              {/* 6-digit OTP code */}
              <div className="flex gap-2 justify-center my-1">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onFocus={(e) => e.target.select()}
                    disabled={loading}
                    className={`w-11 h-12 text-center font-display text-lg font-bold rounded-xl border-2 transition-all outline-none
                      ${digit
                        ? 'border-[var(--empire-gold)] bg-[var(--empire-gold)]/10 text-[var(--empire-gold)]'
                        : 'border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--empire-cream)]'}
                      focus:border-[var(--life-teal)] focus:bg-[var(--life-teal)]/5
                      disabled:opacity-50`}
                    style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
                  />
                ))}
              </div>

              {/* New Password */}
              <div className="relative mt-2">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[18px] pointer-events-none">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="New password (min 8 chars)"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl pl-10 pr-10 py-3 font-body text-sm text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/40 outline-none focus:border-[var(--empire-gold)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--empire-cream)] text-[18px] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>

              {/* Password strength meter */}
              {password.length > 0 && <PasswordStrength password={password} />}

              {/* Confirm Password */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[18px] pointer-events-none">lock_reset</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl pl-10 pr-4 py-3 font-body text-sm text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/40 outline-none focus:border-[var(--empire-gold)] transition-colors"
                />
              </div>

              {error && (
                <p className="text-[11px] text-red-400 flex items-center gap-1.5 justify-center">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.join('').length < 6 || !password || password !== confirmPassword}
                className="w-full py-3 rounded-xl bg-[var(--empire-gold)] text-black font-display font-bold text-sm hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                ) : (
                  'Reset & Sign In'
                )}
              </button>

              <div className="flex justify-between text-[11px] mt-1">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(['', '', '', '', '', '']); setError(''); }}
                  className="text-[var(--text-secondary)] hover:text-[var(--empire-cream)] transition-colors cursor-pointer"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || loading}
                  className="text-[var(--life-teal)] hover:text-[var(--empire-gold)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="flex flex-col gap-5 text-center animate-fade-in py-4">
              <div className="w-14 h-14 rounded-full bg-[var(--life-teal)]/10 border border-[var(--life-teal)]/30 flex items-center justify-center mx-auto text-2xl">
                🎉
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--empire-cream)]">Password Reset Complete!</h2>
                <p className="font-body text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Your password has been successfully reset. You are now logged in and redirecting to the map...
                </p>
              </div>

              <button
                onClick={() => router.push('/map')}
                className="w-full mt-2 py-3 rounded-xl bg-[var(--life-teal)] text-white font-display font-bold text-sm hover:brightness-110 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Go to Map
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
