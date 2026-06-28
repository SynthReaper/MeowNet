// app/(app)/empire/trivia/page.tsx — Daily Educational Trivia Page (Server Component)
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTriviaStats } from '@/lib/actions/gamification';
import TriviaInterface from '@/components/empire/TriviaInterface';

export const metadata: Metadata = {
  title: 'Daily Rescuer Trivia',
  description: 'Answer daily educational TNR and feline health challenges to grow your streak and earn points.',
};

export const forceDynamic = 'force-dynamic';

export default async function TriviaPage() {
  const res = await getTriviaStats();
  const stats = (res as any).stats;
  const question = (res as any).question;
  const playedToday = (res as any).playedToday;

  if (!res.success || !stats) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-6">
        <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
        <h1 className="font-display text-2xl text-[var(--empire-cream)] font-bold">Failed to load Trivia</h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/70">
          You must be logged in to play the daily trivia challenge.
        </p>
        <Link
          href="/empire"
          className="px-6 py-2 bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 text-[var(--empire-cream)] font-display text-xs font-bold rounded-lg hover:bg-[var(--bg-border)]/10"
        >
          Back to Empire Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Navigation and Title */}
      <div className="flex flex-col gap-2">
        <Link
          href="/empire"
          className="flex items-center gap-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] text-xs font-bold uppercase tracking-wider w-fit"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Empire Hub</span>
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-3 mt-1">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          <span>Daily Trivia Duel</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Test your knowledge on stray cat care, veterinary first-aid, and safe TNR trapping. Correct answers build your streak and award bonus points!
        </p>
      </div>

      {/* Main Interface */}
      <TriviaInterface
        initialStats={stats}
        question={question ?? null}
        playedToday={playedToday || false}
      />
    </div>
  );
}
