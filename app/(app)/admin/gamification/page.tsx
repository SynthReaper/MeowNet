// app/(app)/admin/gamification/page.tsx — Admin Gamification Management Dashboard (Server Component)
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import AdminGamificationClient from '@/components/empire/AdminGamificationClient';

export const metadata: Metadata = {
  title: 'Gamification Command Center | MeowNet',
  description: 'Manage educational trivia challenges, BINGO task templates, and regional guilds.',
};

export const forceDynamic = 'force-dynamic';

export default async function AdminGamificationPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string | null } | null };

  if (!profile || profile.role !== 'admin') {
    redirect('/cats');
  }

  // Fetch lists from database
  const [triviaRes, bingoRes, guildsRes] = await Promise.all([
    supabase.from('trivia_questions' as never).select('*').order('created_at', { ascending: true }),
    supabase.from('bingo_task_templates' as never).select('*').order('created_at', { ascending: true }),
    supabase.from('guilds' as never).select('*').order('points', { ascending: false })
  ]);

  const trivia = (triviaRes.data ?? []) as any[];
  const bingo = (bingoRes.data ?? []) as any[];
  const guilds = (guildsRes.data ?? []) as any[];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8 animate-fade-in">
      {/* Navigation and Title */}
      <div className="flex flex-col gap-2">
        <Link
          href="/admin"
          className="flex items-center gap-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] text-xs font-bold uppercase tracking-wider w-fit"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Admin Controls</span>
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-3 mt-1">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_esports</span>
          <span>Gamification Command Center</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Publish dynamic educational trivia questions, manage weekly Stray Bingo square task templates, and configure regional volunteer guilds.
        </p>
      </div>

      {/* Main Panel */}
      <AdminGamificationClient
        initialTrivia={trivia}
        initialBingo={bingo}
        initialGuilds={guilds as any}
      />
    </div>
  );
}
