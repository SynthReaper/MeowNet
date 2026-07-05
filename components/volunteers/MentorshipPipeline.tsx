'use client';
// components/volunteers/MentorshipPipeline.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';

interface Mentor {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly total_hours: number;
}

interface Mentee {
  readonly id: string;
  readonly name: string;
  readonly progress: number; // 0 to 100
}

interface Props {
  readonly initialMentor?: Mentor | null;
  readonly initialMentees?: Mentee[];
}

export default function MentorshipPipeline({ initialMentor = null, initialMentees = [] }: Props) {
  const [mentor] = useState<Mentor | null>(initialMentor);
  const [mentees] = useState<Mentee[]>(initialMentees);

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl w-full">
      <div className="border-b border-white/5 pb-4 mb-6">
        <h3 className="text-lg font-bold text-[var(--empire-cream)]">Mentorship Network</h3>
        <p className="text-xs text-gray-400 mt-1">Structured program matching seasoned caretakers with newly onboarded volunteers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Mentor Section */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your assigned mentor</h4>
          {mentor ? (
            <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--life-teal)]/20 text-[var(--life-teal)] flex items-center justify-center font-bold">
                M
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-sm font-bold text-[var(--empire-cream)]">{mentor.name}</h5>
                <p className="text-xs text-gray-400 mt-0.5">{mentor.role}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[var(--empire-gold)]">{mentor.total_hours}h field</span>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-black/20 border border-dashed border-white/10 rounded-xl text-center text-xs text-gray-500">
              No mentor assigned yet. High hour volunteers are matched automatically.
            </div>
          )}
        </div>

        {/* Mentees Section */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mentees you are guiding</h4>
          {mentees.length > 0 ? (
            <div className="flex flex-col gap-3">
              {mentees.map((m) => (
                <div key={m.id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-[var(--empire-cream)]">{m.name}</h5>
                    <span className="text-[10px] text-[var(--life-teal)] font-mono">{m.progress}% Trained</span>
                  </div>
                  <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--life-teal)] h-full transition-all duration-500"
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-black/20 border border-dashed border-white/10 rounded-xl text-center text-xs text-gray-500">
              No active mentees assigned.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
