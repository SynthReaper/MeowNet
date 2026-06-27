'use client';
// components/events/EventSignupButton/index.tsx

import { useState, useTransition } from 'react';
import { signUpForEvent } from '@/lib/actions/events';

interface EventSignupButtonProps {
  eventId: string;
  isSignedUp: boolean;
  isFull: boolean;
}

export default function EventSignupButton({ eventId, isSignedUp: initialSignedUp, isFull }: EventSignupButtonProps) {
  const [signedUp, setSignedUp] = useState(initialSignedUp);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (signedUp) return; // Can't unsign via UI (keep data integrity)
    startTransition(async () => {
      setError(null);
      const result = await signUpForEvent(eventId);
      if (result.success) {
        setSignedUp(true);
      } else {
        setError(
          result.error === 'already_signed_up'   ? 'You\'re already signed up!'
          : result.error === 'at_capacity'       ? 'Sorry — this event just filled up.'
          : result.error === 'unauthorized'      ? 'Please sign in first.'
          : 'Something went wrong. Please try again.'
        );
      }
    });
  };

  if (signedUp) {
    return (
      <div style={{ background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'center' }}>
          <span className="material-symbols-outlined text-green-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <div style={{ fontWeight: 700, color: 'var(--status-adoptable)' }}>You&apos;re signed up!</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          +20 Empire Points will be awarded when you attend.
        </div>
      </div>
    );
  }

  if (isFull) {
    return (
      <button disabled className="btn btn-ghost" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
        Event is Full
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="btn btn-primary"
        id="event-signup-btn"
        style={{ width: '100%', fontSize: '1rem', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        {isPending ? (
          <>
            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            <span>Signing up…</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-sm">content_cut</span>
            <span>Join This TNR Event (+20 pts)</span>
          </>
        )}
      </button>
      {error && (
        <p style={{ color: 'var(--status-stray)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
