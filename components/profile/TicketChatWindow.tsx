'use client';

// components/profile/TicketChatWindow.tsx — Sci-Fi Support Ticket Chat Thread
import { useState, useTransition, useRef, useEffect } from 'react';
import { addQueryChatMessage, closeModeratorQuery } from '@/lib/actions/admin';

interface ChatMessage {
  sender_id: string;
  sender_name: string;
  sender_role: 'volunteer' | 'moderator';
  message: string;
  timestamp: string;
}

interface QueryTicket {
  id: string;
  target_type: string;
  target_id: string | null;
  message: string;
  status: 'pending' | 'solved' | 'closed' | 'resolved';
  created_at: string;
  chat_messages?: ChatMessage[];
  volunteer_id: string;
}

interface Props {
  ticket: QueryTicket;
  currentUserId: string;
  currentUserRole: 'admin' | 'moderator' | 'user';
  onUpdate: (updatedTicket: QueryTicket) => void;
  onBack?: () => void;
}

export default function TicketChatWindow({ ticket, currentUserId, currentUserRole, onUpdate, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(ticket.chat_messages || []);
  const [typedMessage, setTypedMessage] = useState('');
  const [proposeSolve, setProposeSolve] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync messages from prop updates (e.g. from realtime WebSocket)
  useEffect(() => {
    setMessages(ticket.chat_messages || []);
  }, [ticket.chat_messages]);

  const isStaff = currentUserRole === 'admin' || currentUserRole === 'moderator';
  const isOwner = ticket.volunteer_id === currentUserId;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const text = typedMessage.trim();
    if (!text) return;

    startTransition(async () => {
      const res = await addQueryChatMessage(ticket.id, text, proposeSolve);
      if (res.success && res.chat_messages) {
        setMessages(res.chat_messages);
        setTypedMessage('');
        setProposeSolve(false);
        let nextStatus = ticket.status;
        if (isStaff && proposeSolve) {
          nextStatus = 'solved';
        } else if (!isStaff && ticket.status === 'solved') {
          nextStatus = 'pending';
        }
        onUpdate({
          ...ticket,
          chat_messages: res.chat_messages,
          status: nextStatus as any
        });
      } else {
        setError(res.error || 'Failed to send message');
      }
    });
  };

  const handleCloseTicket = () => {
    setError(null);
    startTransition(async () => {
      const res = await closeModeratorQuery(ticket.id);
      if (res.success) {
        onUpdate({
          ...ticket,
          status: 'closed'
        });
      } else {
        setError(res.error || 'Failed to close ticket');
      }
    });
  };

  return (
    <div className="w-full bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 rounded-3xl overflow-hidden flex flex-col h-[520px] shadow-lg relative transition-all duration-300">
      
      {/* Sci-fi backdrop grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(235,132,36,0.015)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <div className="bg-[var(--bg-elevated)]/50 border-b border-[var(--bg-border)]/30 px-5 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--bg-border)]/40 hover:bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-black text-[var(--text-primary)]">
                Support Ticket Chat
              </h3>
              <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${
                ticket.status === 'closed'
                  ? 'bg-zinc-500/10 border-zinc-500/25 text-zinc-500'
                  : ticket.status === 'solved'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 animate-pulse'
                  : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-600'
              }`}>
                {ticket.status === 'solved' ? 'Solution Proposed' : ticket.status}
              </span>
            </div>
            <span className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5 block select-all">
              Ticket ID: {ticket.id}
            </span>
          </div>
        </div>

        <span className="text-xl">📡</span>
      </div>

      {/* Messages Window */}
      <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4 bg-[var(--bg-elevated)]/20 z-10">
        
        {/* Initial message bubble fallback if chat messages are empty */}
        {messages.length === 0 && (
          <div className="max-w-[85%] self-start bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 p-3 rounded-2xl rounded-tl-sm text-xs font-body leading-relaxed text-[var(--text-primary)] shadow-sm">
            <span className="text-[9px] font-bold text-[var(--text-muted)] block mb-1">Volunteer (Creator)</span>
            <p className="whitespace-pre-line">{ticket.message}</p>
            <span className="text-[8px] text-[var(--text-muted)]/80 block mt-1.5 text-right font-data">
              {new Date(ticket.created_at).toLocaleString()}
            </span>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === currentUserId;
          const isMsgStaff = msg.sender_role === 'moderator';
          
          return (
            <div
              key={index}
              className={`max-w-[85%] flex flex-col gap-1 ${
                isMe ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              {/* Sender Tag */}
              <span className="text-[9px] font-black text-[var(--text-muted)] px-1.5 flex items-center gap-1 uppercase">
                <span>{msg.sender_name}</span>
                {isMsgStaff && (
                  <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1 rounded-[4px] text-[7px] font-black uppercase">
                    Staff
                  </span>
                )}
              </span>

              {/* Message Box */}
              <div
                className={`p-3 rounded-2xl text-xs font-body leading-relaxed whitespace-pre-wrap ${
                  isMe
                    ? 'bg-[var(--empire-gold)]/10 border border-[var(--empire-gold)]/30 text-[var(--text-primary)] rounded-tr-sm'
                    : isMsgStaff
                    ? 'bg-[var(--life-teal)]/10 border border-[var(--life-teal)]/20 text-[var(--text-primary)] rounded-tl-sm'
                    : 'bg-[var(--bg-surface)] border border-[var(--bg-border)]/50 text-[var(--text-primary)] rounded-tl-sm'
                }`}
              >
                {msg.message}
              </div>

              {/* Time */}
              <span className="text-[8px] text-[var(--text-muted)] px-1 font-data">
                {new Date(msg.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* System Banner Lifecycle Alert */}
      {ticket.status === 'solved' && (
        <div className="bg-amber-500/5 border-y border-amber-500/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
          <div className="flex gap-2.5 items-start">
            <span className="material-symbols-outlined text-amber-600 text-lg shrink-0">check_circle</span>
            <div>
              <strong className="text-[11px] font-bold text-[var(--text-primary)] block">Moderator Proposes Solution</strong>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                {isStaff 
                  ? 'A solution has been proposed. Review the response, or click "Close Ticket" to archive this log.'
                  : 'Staff has marked this query as resolved. If you are satisfied with this answer, click "Close Ticket" to seal this thread. Otherwise, replying below will reopen it.'}
              </p>
            </div>
          </div>

          {(isOwner || isStaff) && (
            <button
              onClick={handleCloseTicket}
              disabled={isPending}
              className="px-4 py-2 bg-[var(--empire-gold)] text-white hover:bg-[var(--empire-gold-dim)] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0 border-none"
            >
              {isPending ? 'Closing…' : 'Close Ticket'}
            </button>
          )}
        </div>
      )}

      {ticket.status === 'closed' && (
        <div className="bg-[var(--bg-elevated)]/50 border-y border-[var(--bg-border)]/35 p-4 text-center z-10 flex items-center justify-center gap-1.5 text-[var(--text-muted)] font-display text-[10px] font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-sm">lock</span>
          <span>This support ticket has been closed and locked</span>
        </div>
      )}

      {/* Footer Chat Input Form */}
      {ticket.status !== 'closed' && (
        <form onSubmit={handleSendMessage} className="bg-[var(--bg-elevated)]/40 border-t border-[var(--bg-border)]/35 p-4 flex flex-col gap-3 z-10">
          {error && (
            <div className="text-[9px] text-rose-500 font-semibold px-1">
              ⚠️ {error}
            </div>
          )}
          
          <div className="flex gap-3 items-end">
            <div className="flex-grow flex flex-col gap-1.5 bg-[var(--bg-surface)] border border-[var(--bg-border)]/80 p-2 rounded-xl">
              <textarea
                rows={1}
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder={
                  ticket.status === 'solved' && isOwner
                    ? "Replying here will reopen the query ticket..."
                    : "Type a response to this query..."
                }
                disabled={isPending}
                className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] outline-none resize-none font-body py-1 placeholder-[var(--text-muted)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              
              {/* Staff Solved Checkbox */}
              {isStaff && (
                <div className="flex items-center gap-1.5 border-t border-[var(--bg-border)]/30 pt-1.5">
                  <input
                    type="checkbox"
                    id="propose-solve"
                    checked={proposeSolve}
                    onChange={(e) => setProposeSolve(e.target.checked)}
                    className="accent-[var(--empire-gold)] cursor-pointer"
                  />
                  <label htmlFor="propose-solve" className="text-[8px] font-black uppercase text-[var(--text-secondary)] tracking-wider cursor-pointer hover:text-[var(--text-primary)] select-none">
                    Propose solution & ask volunteer to close ticket
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || !typedMessage.trim()}
              className="w-10 h-10 rounded-xl bg-[var(--empire-gold)] hover:bg-[var(--empire-gold-dim)] text-white flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer border-none shrink-0 shadow-md"
            >
              {isPending ? (
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">send</span>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
