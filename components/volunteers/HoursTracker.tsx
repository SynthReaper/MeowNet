'use client';
// components/volunteers/HoursTracker.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { logVolunteerHours } from '@/lib/actions/volunteers';

interface Props {
  readonly currentUserId: string;
  readonly initialHours?: {
    id: string;
    activity_type: string;
    hours: number;
    date: string;
    notes: string | null;
    verified_at: string | null;
  }[];
}

const ACTIVITIES = [
  { type: 'feeding', label: 'Feeding Duty' },
  { type: 'trapping', label: 'TNR Trapping' },
  { type: 'transport', label: 'Rescue Transport' },
  { type: 'event', label: 'Community Event' },
  { type: 'education', label: 'Education Outreach' },
  { type: 'fundraising', label: 'Fundraising Drive' },
];

export default function HoursTracker({ currentUserId, initialHours = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [logs, setLogs] = useState(initialHours);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [activity, setActivity] = useState('feeding');
  const [hours, setHours] = useState('1.5');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append('activity_type', activity);
      formData.append('hours', hours);
      formData.append('date', date);
      if (notes) formData.append('notes', notes);

      const res = await logVolunteerHours(formData);
      if (res.success) {
        setMessage('Hours logged successfully!');
        // Update local list
        setLogs([
          {
            id: crypto.randomUUID(),
            activity_type: activity,
            hours: Number(hours),
            date,
            notes: notes || null,
            verified_at: null,
          },
          ...logs,
        ]);
        setNotes('');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to log hours');
      }
    });
  };

  const totalHours = logs.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      {/* Log Form */}
      <div className="lg:col-span-1 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl h-fit">
        <h3 className="text-lg font-bold text-[var(--empire-cream)] mb-4">Log Volunteer Hours</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Activity Type</label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
            >
              {ACTIVITIES.map((act) => (
                <option key={act.type} value={act.type}>
                  {act.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Duration (Hours)</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Notes / Summary</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Detail what you accomplished..."
              className="w-full h-24 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="bg-[var(--life-teal)] text-white hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? 'Logging...' : 'Submit Log'}
          </button>

          {message && (
            <div className="text-center text-xs font-bold text-[var(--empire-gold)] mt-2">
              {message}
            </div>
          )}
        </form>
      </div>

      {/* Hours History */}
      <div className="lg:col-span-2 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--empire-cream)]">Hour Rollup Summary</h3>
            <p className="text-xs text-gray-400 mt-1">Review your logged field operations and credential hours.</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[var(--life-teal)]">{totalHours}</span>
            <span className="text-[10px] text-gray-400 block uppercase font-mono tracking-wider">Total Hours</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[450px] pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500 font-mono">No volunteer activity logged yet.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--empire-cream)]">
                      {ACTIVITIES.find((a) => a.type === log.activity_type)?.label || log.activity_type}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed truncate">{log.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm font-bold text-[var(--empire-cream)]">{log.hours}h</span>
                  </div>
                  {log.verified_at ? (
                    <span
                      title="Verified by Moderator"
                      className="material-symbols-outlined text-[var(--life-teal)] text-xl"
                    >
                      verified
                    </span>
                  ) : (
                    <span
                      title="Pending Verification"
                      className="material-symbols-outlined text-[var(--empire-gold)] text-xl animate-pulse"
                    >
                      hourglass_empty
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
