'use client';
// app/(app)/safety/SafetyQueriesClient.tsx — Help & Query Desk for Volunteers
import { useState, useTransition } from 'react';
import { submitUserProfileQuery } from '@/lib/actions/admin';

interface Query {
  id: string;
  message: string;
  status: string;
  response: string | null;
  created_at: string;
}

interface Props {
  initialQueries: Query[];
  userId: string;
}

export default function SafetyQueriesClient({ initialQueries, userId }: Props) {
  const [queries, setQueries] = useState<Query[]>(initialQueries);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await submitUserProfileQuery(message);
        if (res.success) {
          setSuccess('Query submitted to our moderator team successfully.');
          setMessage('');
          // Optimistically add to the list
          const newQuery: Query = {
            id: Math.random().toString(36).substring(7),
            message: message.trim(),
            status: 'pending',
            response: null,
            created_at: new Date().toISOString(),
          };
          setQueries((prev) => [newQuery, ...prev]);
        } else {
          setError(res.error || 'Failed to submit query.');
        }
      } catch (err) {
        setError('A network error occurred.');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
      {/* ── Left/Middle Columns: Submit Form & FAQ ── */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient">
          <h3 className="font-display text-lg text-[var(--empire-cream)] font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
            <span>Raise a Support Query</span>
          </h3>
          <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-6">
            Need tools access, TNR equipment, coordinates validation, or want to report an emergency? Send a direct query to active staff moderators.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isPending}
              placeholder="Describe your inquiry or request in detail..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-2xl p-4 text-xs text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/35 focus:border-[var(--empire-gold)] outline-none resize-none transition-all"
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-xs font-body">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-body">
                {success}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending || !message.trim()}
                className="bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Submit Query</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Right Column: Query History Log ── */}
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-[var(--bg-border)] shadow-ambient flex flex-col min-h-[400px]">
          <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-4 flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3">
            <span className="material-symbols-outlined text-[var(--empire-gold)]">history</span>
            <span>Your Query Log</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[450px]" style={{ scrollbarWidth: 'none' }}>
            {queries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--empire-cream)]/40 font-body text-xs gap-3">
                <span className="material-symbols-outlined text-3xl opacity-60">question_answer</span>
                <span>No support queries raised yet.</span>
              </div>
            ) : (
              queries.map((q) => {
                const isShifted = q.message.includes('[SHIFTED_TO_ADMIN:');
                let cleanMessage = q.message;
                if (isShifted) {
                  cleanMessage = q.message.split('[SHIFTED_TO_ADMIN:')[0].trim();
                }

                return (
                  <div key={q.id} className="p-3.5 bg-[var(--bg-elevated)]/40 border border-[var(--bg-border)]/45 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider font-data">
                        ID: #{q.id.slice(0, 6)}
                      </span>
                      <span className={`px-2 py-0.5 border text-[8px] font-bold uppercase rounded-md ${
                        q.status === 'resolved'
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                          : 'bg-amber-500/10 border-amber-500/25 text-amber-600'
                      }`}>
                        {q.status}
                      </span>
                    </div>

                    <p className="font-body text-xs text-[var(--empire-cream)]/90 leading-relaxed">
                      {cleanMessage}
                    </p>

                    {isShifted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-bold uppercase rounded">
                        <span className="material-symbols-outlined text-[10px]">gavel</span>
                        Shifted to Admin
                      </span>
                    )}

                    {q.status === 'resolved' && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-xl text-[11px] font-body mt-2">
                        <div className="text-[8px] font-bold uppercase tracking-wider text-emerald-600">
                          Staff Response
                        </div>
                        <p className="text-[var(--empire-cream)]/75 mt-0.5 leading-relaxed">
                          {q.response || 'Resolved without response.'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
