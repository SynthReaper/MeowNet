'use client';
// components/volunteers/MatchingPanel.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, startTransition } from 'react';
import { getVolunteerMatches } from '@/lib/actions/volunteers';

interface Props {
  readonly colonyId: string;
}

interface Match {
  readonly volunteer_id: string;
  readonly display_name: string;
  readonly match_score: number;
  readonly matching_skills: string[];
}

export default function MatchingPanel({ colonyId }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const res = await getVolunteerMatches(colonyId);
      if (res.success && res.matches) {
        setMatches(res.matches as Match[]);
      } else {
        setError(res.error || 'Failed to calculate matches');
      }
      setLoading(false);
    });
  };

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Smart Volunteer Matching</h3>
          <p className="text-xs text-gray-400 mt-1">Calculates optimal caretaker assignments based on proximity and credential matching.</p>
        </div>
        <button
          onClick={fetchMatches}
          disabled={loading}
          className="bg-[var(--life-teal)] text-white hover:opacity-90 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Find Matches'}
        </button>
      </div>

      {error && (
        <div className="text-center py-4 text-xs font-bold text-red-400 font-mono bg-red-950/20 rounded-xl border border-red-900/30">
          {error}
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="text-center py-8 text-xs text-gray-500 font-mono">
          Click Find Matches to run the scoring engine for this colony.
        </div>
      )}

      {matches.length > 0 && (
        <div className="flex flex-col gap-4">
          {matches.map((match) => (
            <div
              key={match.volunteer_id}
              className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-[var(--empire-cream)]">{match.display_name}</h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {match.matching_skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[9px] bg-[var(--life-teal)]/15 border border-[var(--life-teal)]/20 text-[var(--life-teal)] px-2 py-0.5 rounded-md font-mono"
                    >
                      {skill.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-black text-[var(--empire-gold)]">
                  {Math.round(match.match_score * 100)}% Match
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Smart score</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
