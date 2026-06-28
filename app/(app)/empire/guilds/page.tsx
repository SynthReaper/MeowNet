// app/(app)/empire/guilds/page.tsx — Guilds Cooperation Portal (Server Component)
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import GuildsInterface from '@/components/empire/GuildsInterface';

export const metadata: Metadata = {
  title: 'Volunteer Guilds',
  description: 'Join regional volunteer guilds, collaborate on rescue quests, and pool your impact score.',
};

export const forceDynamic = 'force-dynamic';

export default async function GuildsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-6">
        <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
        <h1 className="font-display text-2xl text-[var(--empire-cream)] font-bold">Failed to load Guilds</h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/70">
          You must be logged in to participate in regional volunteer guilds.
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

  // Fetch all guilds
  const { data: dbGuilds } = await supabase
    .from('guilds' as never)
    .select('*')
    .order('points', { ascending: false });

  // Fetch current user membership
  const { data: membership } = await supabase
    .from('guild_members' as never)
    .select('guild_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const currentGuildId = membership ? (membership as any).guild_id : null;

  // Fetch user profile points
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('empire_points')
    .eq('id', user.id)
    .single();

  // Fetch active quests
  let quests: any[] = [];
  if (currentGuildId) {
    const { data: dbQuests } = await supabase
      .from('guild_quests' as never)
      .select('*')
      .eq('guild_id', currentGuildId)
      .order('is_completed', { ascending: true });
    quests = dbQuests ?? [];
  }

  // Fetch memberships to count active members
  const { data: dbMembers } = await supabase
    .from('guild_members' as never)
    .select('guild_id');

  const counts: Record<string, number> = {};
  dbMembers?.forEach((m: any) => {
    counts[m.guild_id] = (counts[m.guild_id] || 0) + 1;
  });

  const guilds = (dbGuilds ?? []).map((g: any) => ({
    ...g,
    member_count: counts[g.id] || 0
  }));

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
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
          <span>Volunteer Guilds Portal</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Coordinate local rescue efforts, pool impact points, and collaborate on targeted community quests to keep strays warm and fed.
        </p>
      </div>

      {/* Main interface */}
      <GuildsInterface
        guilds={guilds as any}
        currentGuildId={currentGuildId}
        quests={quests}
        userPoints={(profile as any)?.empire_points ?? 0}
      />
    </div>
  );
}
