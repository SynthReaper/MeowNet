// app/(app)/empire/bingo/page.tsx — Weekly Stray Bingo Page (Server Component)
import type { Metadata } from 'next';
import Link from 'next/link';
import { getBingoCard } from '@/lib/actions/gamification';
import BingoBoard from '@/components/empire/BingoBoard';

export const metadata: Metadata = {
  title: 'Weekly Stray Bingo',
  description: 'Complete volunteer check-ins and logging tasks to fill your 5x5 board and win point rewards.',
};

export const forceDynamic = 'force-dynamic';

export default async function BingoPage() {
  const res = await getBingoCard();

  if (!res.success || !res.card) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-6">
        <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
        <h1 className="font-display text-2xl text-[var(--empire-cream)] font-bold">Failed to load Bingo Card</h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/70">
          You must be logged in to participate in the weekly bingo challenge.
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

  const card = (res as any).card;

  // Typecast or format card data if required by BingoBoard interface
  const formattedCard = {
    id: card.id,
    week_start: card.week_start,
    squares: card.squares as Array<{ label: string; type: string; completed: boolean }>,
    completed_squares: card.completed_squares || 0,
    is_bingo_achieved: card.is_bingo_achieved || false
  };

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
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>grid_on</span>
          <span>Weekly Stray Bingo</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Achieve goals by validating tasks and completing horizontal, vertical, or diagonal rows. Earn +50 Empire points upon completion of your first line!
        </p>
      </div>

      {/* Main Board */}
      <BingoBoard initialCard={formattedCard} />
    </div>
  );
}
