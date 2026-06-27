'use client';

import { useState, useTransition } from 'react';
import { submitModeratorApplication } from '@/lib/actions/admin';

interface Props {
  points: number;
  hasPendingApp: boolean;
}

export default function ModeratorApplicationCard({ points, hasPendingApp }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!reason.trim()) {
      setError('Please provide a reason.');
      return;
    }

    startTransition(async () => {
      const res = await submitModeratorApplication(reason);
      if (res.success) {
        setSuccess(true);
        setReason('');
      } else {
        setError(res.error || 'Failed to submit application.');
      }
    });
  };

  const isEligible = points >= 100;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
      <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3">
        <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        <span>Moderator Request</span>
      </h2>

      {hasPendingApp || success ? (
        <div className="bg-[#ffdcc5]/20 border border-[var(--empire-gold)]/20 p-4 rounded-xl flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[var(--empire-gold)] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
          <div>
            <div className="font-body text-xs font-bold text-[var(--empire-cream)]">Application Pending</div>
            <p className="font-body text-[10px] text-[var(--empire-cream)]/65 mt-1 leading-relaxed">
              Your request to become a Moderator has been submitted. Admins will review your rescue bio, contributions, and points log.
            </p>
          </div>
        </div>
      ) : !isEligible ? (
        <div className="flex flex-col gap-3">
          <div className="bg-zinc-100 p-4 rounded-xl border border-dashed border-zinc-200 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-zinc-400 mt-0.5">lock</span>
            <div>
              <div className="font-body text-xs font-bold text-zinc-500">Locked Feature</div>
              <p className="font-body text-[10px] text-zinc-400 mt-1 leading-relaxed">
                You must possess at least <strong>100 Empire Points</strong> to request moderator status. Keep logging sightings and helping colonies!
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center bg-[var(--bg-elevated)] px-3 py-2.5 rounded-lg border border-[var(--bg-border)]/20 text-xs">
            <span className="font-body text-[var(--empire-cream)]/50">Your Points:</span>
            <span className="font-data font-bold text-[var(--life-teal)]">{points} / 100</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="font-body text-[11px] text-[var(--empire-cream)]/60 leading-relaxed">
            You have unlocked the ability to apply for Moderator! Please provide a brief statement of your volunteer history.
          </p>
          <div>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us about your TNR experience or stray colonies you care for..."
              maxLength={1000}
              disabled={isPending}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all resize-none disabled:opacity-50"
            />
          </div>
          {error && <div className="text-[10px] text-[var(--status-stray)] font-semibold">{error}</div>}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Request</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
