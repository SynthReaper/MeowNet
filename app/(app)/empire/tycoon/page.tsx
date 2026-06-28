// app/(app)/empire/tycoon/page.tsx — Colony Tycoon Game Portal (Server Component)
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSanctuary } from '@/lib/actions/gamification';
import { createServerClient } from '@/lib/supabase/server';
import TycoonInterface from '@/components/empire/TycoonInterface';

export const metadata: Metadata = {
  title: 'Colony Tycoon',
  description: 'Spend your empire points to customize virtual sanctuaries, buy beds, dry feeders, and boost point rates.',
};

export const forceDynamic = 'force-dynamic';

export default async function TycoonPage() {
  const res = await getSanctuary();
  const sanctuaryData = (res as any).sanctuary;
  const upgradesData = (res as any).upgrades;
  const supabase = await createServerClient();

  if (!res.success || !sanctuaryData) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-6">
        <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
        <h1 className="font-display text-2xl text-[var(--empire-cream)] font-bold">Failed to load Tycoon Sanctuary</h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/70">
          You must be logged in to participate in the Colony Tycoon game.
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

  // Fetch user profile points
  const { data: { user } } = await supabase.auth.getUser();
  let points = 0;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('empire_points')
      .eq('id', user.id)
      .single();
    points = (profile as any)?.empire_points ?? 0;
  }

  // Format sanctuary statistics
  const sanctuary = {
    id: sanctuaryData.id,
    name: sanctuaryData.name,
    level: sanctuaryData.level || 1,
    point_multiplier: Number(sanctuaryData.point_multiplier || 1.0),
    idle_points_rate: sanctuaryData.idle_points_rate || 0,
    last_claimed_at: sanctuaryData.last_claimed_at || null
  };

  const upgrades = (upgradesData ?? []) as Array<{
    id: string;
    upgrade_type: 'shelter_bed' | 'kibble_feeder' | 'first_aid' | 'play_area';
    level: number;
    cost_points: number;
  }>;

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
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>cottage</span>
          <span>Colony Tycoon Hub</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Purchase virtual sanctuaries and buy beds, automatic kibble feeders, and veterinary medical triage packs to boost your idle points multiplier.
        </p>
      </div>

      {/* Main Interface */}
      <TycoonInterface
        initialSanctuary={sanctuary}
        initialUpgrades={upgrades}
        initialUserPoints={points}
        initialAccumulatedPoints={(res as any).accumulatedPoints || 0}
      />
    </div>
  );
}
