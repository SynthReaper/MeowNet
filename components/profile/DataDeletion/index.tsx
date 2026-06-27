'use client';
// components/profile/DataDeletion/index.tsx — GDPR Right to Erasure

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function DataDeletion() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      setError(null);
      const res = await fetch('/api/privacy/delete-account', { method: 'DELETE' });
      if (res.ok) {
        router.push('/?deleted=true');
      } else {
        setError('Deletion failed. Please try again or contact support.');
        setConfirming(false);
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-ambient border border-red-200 dark:border-red-950/40">
      <h3 className="font-display text-sm font-bold text-[#ba1a1a] dark:text-red-400 mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">delete_forever</span>
        <span>Delete My Account</span>
      </h3>
      <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-4 leading-relaxed">
        GDPR Right to Erasure. Permanently deletes your profile, all logged cats, and points history. Cat sightings may remain for community safety.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-[#ba1a1a] dark:text-red-400 font-body text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Request Account Deletion</span>
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-body text-xs text-[#ba1a1a] font-bold leading-normal">
            Are you absolutely sure? This actions cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 bg-[#ba1a1a] text-white hover:bg-red-700 font-body text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              {isPending ? 'Deleting…' : 'Yes, Delete All'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 border border-[var(--bg-border)] hover:bg-[var(--bg-elevated)] text-[var(--empire-cream)]/70 font-body text-xs font-semibold py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
          {error && <p className="font-body text-[10px] text-[#ba1a1a] font-semibold mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
