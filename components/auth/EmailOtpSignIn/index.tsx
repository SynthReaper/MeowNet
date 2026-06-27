'use client';
// components/auth/EmailOtpSignIn/index.tsx — Passwordless email OTP sign-in via Clerk

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';

interface EmailOtpSignInProps {
  redirectUrl?: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export default function EmailOtpSignIn({
  redirectUrl = '/map',
  onSuccess,
  onBack,
}: EmailOtpSignInProps) {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sent, setSent] = useState(false);

  // OTP input refs for auto-focus
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        strategy: 'email_code',
        identifier: email.trim(),
      });
      setStep('code');
      setSent(true);
      setResendCountdown(60);
      // Focus first OTP box
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to send code. Please try again.';
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
        strategy: 'email_code',
        identifier: email.trim(),
      });
      setCode(['', '', '', '', '', '']);
      setResendCountdown(60);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded) return;
    const fullCode = code.join('');
    if (fullCode.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: 'email_code',
        code: fullCode,
      });
      if (result.status === 'complete') {
        onSuccess?.();
        router.push(redirectUrl);
        router.refresh();
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid code. Please try again.';
      setError(msg);
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // OTP digit input handler
  const handleDigitChange = useCallback((idx: number, value: string) => {
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => { if (i < 6) newCode[i] = d; });
      setCode(newCode);
      const nextFocus = Math.min(digits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (digits.length === 6) setTimeout(handleVerifyCode, 100);
      return;
    }
    const digit = value.replace(/\D/g, '');
    const newCode = [...code];
    newCode[idx] = digit;
    setCode(newCode);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    // Auto-verify when last digit filled
    if (digit && idx === 5) {
      const full = newCode.join('');
      if (full.length === 6) setTimeout(handleVerifyCode, 100);
    }
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter') handleVerifyCode();
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="font-body text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Enter your email address and we'll send a 6-digit verification code. No password needed.
            </p>
          </div>

          {/* Email input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[18px] pointer-events-none">
              mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl pl-10 pr-4 py-3 font-body text-sm text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/50 outline-none focus:border-[var(--empire-gold)] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 rounded-xl bg-[var(--empire-gold)] text-black font-display font-bold text-sm transition-all hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">send</span>
            )}
            {loading ? 'Sending code...' : 'Send code'}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--empire-cream)] transition-colors text-center cursor-pointer"
            >
              ← Back to password sign-in
            </button>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--life-teal)]/10 border border-[var(--life-teal)]/30 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[var(--life-teal)] text-[22px]">mark_email_read</span>
            </div>
            <p className="font-body text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Code sent to <span className="text-[var(--empire-cream)] font-semibold">{email}</span>.<br />
              Enter the 6-digit code below.
            </p>
          </div>

          {/* 6-box OTP input */}
          <div className="flex gap-2 justify-center">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
                className={`w-11 h-13 text-center font-display text-xl font-bold rounded-xl border-2 transition-all outline-none
                  ${digit
                    ? 'border-[var(--empire-gold)] bg-[var(--empire-gold)]/10 text-[var(--empire-gold)]'
                    : 'border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--empire-cream)]'}
                  focus:border-[var(--life-teal)] focus:bg-[var(--life-teal)]/5
                  disabled:opacity-50`}
                style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem' }}
              />
            ))}
          </div>

          {error && (
            <p className="text-[11px] text-red-400 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {error}
            </p>
          )}

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || code.join('').length < 6}
            className="w-full py-3 rounded-xl bg-[var(--empire-gold)] text-black font-display font-bold text-sm transition-all hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">verified</span>
            )}
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>

          {/* Resend + back */}
          <div className="flex items-center justify-between text-[11px]">
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
        </div>
      )}
    </div>
  );
}
