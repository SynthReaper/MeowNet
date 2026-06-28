'use client';
// components/empire/TriviaInterface/index.tsx — Interactive Trivia Board (Client Component)

import React, { useState } from 'react';
import { submitTriviaAnswer } from '@/lib/actions/gamification';

interface TriviaStats {
  current_streak: number;
  max_streak: number;
  total_correct: number;
  total_played: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface TriviaInterfaceProps {
  initialStats: TriviaStats;
  question: Question | null;
  playedToday: boolean;
}

export default function TriviaInterface({ initialStats, question, playedToday: initialPlayedToday }: TriviaInterfaceProps) {
  const [stats, setStats] = useState<TriviaStats>(initialStats);
  const [playedToday, setPlayedToday] = useState(initialPlayedToday);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string;
    pointsAwarded: number;
    streak: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!question || selectedIdx === null || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitTriviaAnswer(question.id, selectedIdx);
      if (res.success && res.correct !== undefined) {
        setResult({
          correct: res.correct,
          explanation: res.explanation || '',
          pointsAwarded: res.pointsAwarded || 0,
          streak: res.streak || 0
        });
        setPlayedToday(true);
        // Update stats
        setStats(prev => ({
          ...prev,
          current_streak: res.streak || 0,
          max_streak: Math.max(prev.max_streak, res.streak || 0),
          total_correct: res.correct ? prev.total_correct + 1 : prev.total_correct,
          total_played: prev.total_played + 1
        }));
      } else {
        setError(res.error || 'Failed to submit answer.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      {/* Question Card */}
      <div className="md:col-span-8 bg-white rounded-2xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-6 transition-all duration-300">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[var(--empire-gold)] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
          <h2 className="font-display text-lg text-[var(--empire-cream)] font-bold">Daily Rescuer Challenge</h2>
        </div>

        {playedToday ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#e2f9f3] flex items-center justify-center text-[var(--life-teal)] border border-[var(--life-teal)]/20 shadow-sm scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-xl text-[var(--empire-cream)] font-bold">Daily Challenge Complete!</h3>
              <p className="font-body text-sm text-[var(--empire-cream)]/60">You have completed today's educational trivia. Check back tomorrow for a new question!</p>
            </div>

            {result && (
              <div className={`w-full max-w-lg mt-6 p-6 rounded-xl border ${result.correct ? 'bg-[#e9faf4] border-[#8bf1e6]/40 text-[#0d594b]' : 'bg-[#fff0f3] border-[#ffccd5]/40 text-[#a02245]'} flex flex-col gap-3 text-left`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined font-bold">
                    {result.correct ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="font-display font-bold">{result.correct ? 'Correct Answer!' : 'Incorrect Answer'}</span>
                  {result.pointsAwarded > 0 && (
                    <span className="ml-auto font-body text-xs font-extrabold bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] px-2 py-0.5 rounded-full border border-[var(--empire-gold)]/20">
                      +{result.pointsAwarded} XP
                    </span>
                  )}
                </div>
                <p className="font-body text-xs leading-relaxed opacity-90 font-medium">{result.explanation}</p>
                {result.streak > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-orange-200/50 w-fit">
                    <span className="material-symbols-outlined text-xs animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span>{result.streak} Day Streak!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          question && (
            <div className="flex flex-col gap-6">
              <p className="font-display text-base md:text-lg text-[var(--empire-cream)] font-bold leading-snug">
                {question.question}
              </p>

              <div className="flex flex-col gap-3">
                {question.options.map((option, idx) => {
                  const isSelected = selectedIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedIdx(idx)}
                      disabled={isSubmitting}
                      className={`w-full p-4 rounded-xl text-left border font-body text-sm font-semibold transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--empire-gold)] bg-[#fff7f2] text-[var(--empire-gold)] shadow-sm'
                          : 'border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--empire-cream)]/80 hover:bg-[var(--bg-border)]/10 hover:border-[var(--bg-border)]/50'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[var(--empire-gold)] font-bold text-lg">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {error && <p className="font-body text-xs font-bold text-red-500">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={selectedIdx === null || isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-[var(--empire-gold)] to-orange-500 text-white rounded-xl font-display text-sm font-extrabold hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-lg">sync</span>
                    <span>Checking Triage File...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">lock_open</span>
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          )
        )}
      </div>

      {/* Streak & Stats Sidebar */}
      <div className="md:col-span-4 flex flex-col gap-6">
        {/* Current Streak */}
        <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-red-500" />
          <div className="w-16 h-16 rounded-full bg-orange-100/50 flex items-center justify-center mb-3 text-orange-600 scale-100 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl font-bold animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          </div>
          <span className="font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider">Current Streak</span>
          <span className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 mt-1">{stats.current_streak} Days</span>
          <p className="font-body text-[11px] text-[var(--empire-cream)]/60 mt-1 font-medium">Keep answering daily to multiply your score!</p>
        </div>

        {/* Lifetime Record Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
          <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--life-teal)]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
            <span>Rescuer Records</span>
          </h3>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20">
              <span className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Highest Streak</span>
              <span className="font-display text-xs font-black text-[var(--empire-cream)]">{stats.max_streak} Days</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20">
              <span className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Correct Answers</span>
              <span className="font-display text-xs font-black text-[var(--life-teal)]">{stats.total_correct}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20">
              <span className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Total Challenges</span>
              <span className="font-display text-xs font-black text-[var(--empire-cream)]">{stats.total_played}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20">
              <span className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Accuracy Rate</span>
              <span className="font-display text-xs font-black text-[var(--empire-gold)]">
                {stats.total_played > 0 ? `${Math.round((stats.total_correct / stats.total_played) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
