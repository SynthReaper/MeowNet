'use client';

import { useState, useTransition } from 'react';
import { submitUserProfileQuery } from '@/lib/actions/admin';

interface Query {
  id: string;
  target_type: 'cat' | 'event' | 'profile' | 'message' | 'general';
  target_id: string | null;
  message: string;
  status: 'pending' | 'resolved';
  response?: string | null;
  created_at: string;
}

interface Props {
  initialQueries: Query[];
}

export default function ProfileQueries({ initialQueries }: Props) {
  const [queries, setQueries] = useState<Query[]>(initialQueries);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = message.trim();
    if (!trimmed) {
      setError('Query message cannot be empty.');
      return;
    }

    startTransition(async () => {
      const res = await submitUserProfileQuery(trimmed);
      if (res.success) {
        setSuccess(true);
        setMessage('');
        // Optimistically add query to user local view
        const newQuery: Query = {
          id: Math.random().toString(),
          target_type: 'general',
          target_id: null,
          message: trimmed,
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        setQueries([newQuery, ...queries]);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res.error || 'Failed to submit query.');
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
      <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3">
        <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
        <span>Support & Queries</span>
      </h2>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="font-body text-[11px] text-[var(--empire-cream)]/60 leading-relaxed">
          Need help? Submit a question or report to the Mod Center. A Moderator will review and respond directly to you.
        </p>
        <div>
          <textarea
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your question or support request here..."
            maxLength={2000}
            disabled={isPending}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all resize-none disabled:opacity-50"
          />
        </div>
        {error && <div className="text-[10px] text-[var(--status-stray)] font-semibold">{error}</div>}
        {success && <div className="text-[10px] text-[var(--life-teal)] font-semibold">Query submitted successfully!</div>}
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
            <span>Ask Moderator</span>
          )}
        </button>
      </form>

      {/* Query History */}
      <div className="mt-2">
        <h3 className="font-display text-xs font-bold text-[var(--empire-cream)]/70 uppercase tracking-wider mb-3">
          Query History ({queries.length})
        </h3>
        {queries.length === 0 ? (
          <p className="font-body text-[11px] text-[var(--empire-cream)]/40 italic">
            You haven&apos;t submitted any queries yet.
          </p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-3">
            {queries.map((q) => (
              <div
                key={q.id}
                className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--bg-border)]/15 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-body text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">{q.target_type === 'message' ? 'chat' : 'help'}</span>
                    <span>{q.target_type === 'message' ? 'Message Report' : 'General Query'}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full font-body text-[8px] font-bold uppercase tracking-wider ${
                      q.status === 'resolved'
                        ? 'bg-teal-50 text-teal-600 border border-teal-100/50'
                        : 'bg-amber-50 text-amber-600 border border-amber-100/50'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <p className="font-body text-xs text-[var(--empire-cream)] whitespace-pre-wrap leading-relaxed">
                  {q.message}
                </p>
                {q.response && (
                  <div className="bg-white/80 p-2.5 rounded-lg border border-teal-100/80 mt-1">
                    <span className="font-display text-[9px] font-extrabold text-teal-700 uppercase tracking-wider block mb-0.5">
                      Answered:
                    </span>
                    <p className="font-body text-xs text-teal-800 leading-relaxed">
                      {q.response}
                    </p>
                  </div>
                )}
                <span className="font-body text-[9px] text-[var(--empire-cream)]/40 font-semibold self-end">
                  {new Date(q.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
