// app/(app)/chapters/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChapterCard from '@/components/chapters/ChapterCard';
import ChapterMapWrapper from '@/components/chapters/ChapterMapWrapper';

export const metadata: Metadata = {
  title: 'Regional Chapters',
  description: 'Connect with local caretaker chapters and synchronize community rescue missions.',
};

export const dynamic = 'force-dynamic';

export default async function ChaptersPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query chapters
  const { data: chapters } = await supabase
    .from('chapters' as never)
    .select('*')
    .order('name') as unknown as { data: any[] | null };

  // Query my memberships
  const { data: memberships } = await supabase
    .from('chapter_members' as never)
    .select('chapter_id')
    .eq('user_id', user.id) as unknown as { data: { chapter_id: string }[] | null };

  const memberChapterIds = new Set((memberships ?? []).map((m) => m.chapter_id));

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Regional Caretaker Chapters</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Sync with local quadrants, share regional storage vaults, and organize community traps and clinics in your direct zone.
        </p>
      </section>

      {/* Map Coverage */}
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Chapter Regional Coverage Area</h3>
        <ChapterMapWrapper chapters={chapters ?? []} />
      </section>

      {/* Grid */}
      <section className="flex flex-col gap-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Chapters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(chapters ?? []).map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              initialIsMember={memberChapterIds.has(chapter.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
