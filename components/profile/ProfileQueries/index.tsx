'use client';

// components/profile/ProfileQueries/index.tsx
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitUserProfileQuery } from '@/lib/actions/admin';

export interface ChatMessage {
  sender_id: string;
  sender_name: string;
  sender_role: 'volunteer' | 'moderator';
  message: string;
  timestamp: string;
}

interface Query {
  id: string;
  target_type: 'cat' | 'event' | 'profile' | 'message' | 'general';
  target_id: string | null;
  message: string;
  status: 'pending' | 'solved' | 'closed' | 'resolved';
  response?: string | null;
  created_at: string;
  chat_messages?: ChatMessage[];
  volunteer_id: string;
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
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const router = useRouter();

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
      if (res.success && res.query) {
        setSuccess(true);
        setMessage('');
        const newQuery: Query = {
          id: res.query.id,
          target_type: res.query.target_type,
          target_id: res.query.target_id,
          message: res.query.message,
          status: res.query.status as Query['status'],
          created_at: res.query.created_at,
          chat_messages: res.query.chat_messages,
          volunteer_id: res.query.volunteer_id,
        };
        setQueries([newQuery, ...queries]);
        setActiveTab('active'); // Switch to active tab to see the new query
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res.error || 'Failed to submit query.');
      }
    });
  };

  // Filter queries based on active tab
  const filteredQueries = queries.filter(q => {
    const isArchived = q.status === 'closed' || q.status === 'resolved';
    return activeTab === 'archive' ? isArchived : !isArchived;
  });

  return (
    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl shadow-card border border-[var(--bg-border)]/60 flex flex-col gap-4">
      <h2 className="font-display text-base text-[var(--text-primary)] font-bold flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3">
        <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
        <span>Support & Queries</span>
      </h2>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="font-body text-[11px] text-[var(--text-secondary)] leading-relaxed">
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
            className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--empire-gold)] outline-none transition-all resize-none disabled:opacity-50"
          />
        </div>
        {error && <div className="text-[10px] text-[var(--status-stray)] font-semibold">{error}</div>}
        {success && <div className="text-[10px] text-[var(--life-teal)] font-semibold">Query submitted successfully!</div>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[var(--empire-gold)] text-[var(--bg-void)] hover:bg-[var(--empire-gold-dim)] py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border-none"
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
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Query History
          </h3>
          
          {/* Active/Archive Tabs */}
          <div className="flex bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 p-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer border-none ${
                activeTab === 'active'
                  ? 'bg-[var(--bg-surface)] text-[var(--empire-gold)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer border-none ${
                activeTab === 'archive'
                  ? 'bg-[var(--bg-surface)] text-[var(--empire-gold)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent'
              }`}
            >
              Archive
            </button>
          </div>
        </div>

        {filteredQueries.length === 0 ? (
          <p className="font-body text-[11px] text-[var(--text-muted)] italic">
            No {activeTab} queries found.
          </p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-3">
            {filteredQueries.map((q) => (
              <div
                key={q.id}
                onClick={() => router.push(`/support/${q.id}`)}
                className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--bg-border)]/15 flex flex-col gap-2 cursor-pointer hover:bg-[var(--bg-border)]/20 transition-colors group"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-body text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">{q.target_type === 'message' ? 'chat' : 'help'}</span>
                    <span>{q.target_type === 'message' ? 'Message Report' : 'General Query'}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full font-body text-[8px] font-bold uppercase tracking-wider border ${
                      q.status === 'closed'
                        ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                        : q.status === 'solved'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <p className="font-body text-xs text-[var(--text-primary)] truncate leading-relaxed">
                  {q.message}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-[var(--empire-gold)] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Open Chat <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                  </span>
                  <span className="font-body text-[9px] text-[var(--text-muted)] font-semibold">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
