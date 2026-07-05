// app/(app)/stories/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StoriesHubClient from '@/components/stories/StoriesHubClient';

export const metadata: Metadata = {
  title: 'Success Stories & Happy Tails',
  description: 'Celebrate our successfully adopted felines and view the happy tails of MeowNet.',
};

export const dynamic = 'force-dynamic';

export default async function StoriesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query adopted cats
  const { data: adoptedCats } = await supabase
    .from('cats' as never)
    .select('id, name, photo_url, status, breed_estimate, age_estimate, created_at, updated_at, profiles:profiles(display_name)')
    .eq('status', 'adopted')
    .order('updated_at', { ascending: false }) as unknown as { data: any[] | null };

  // Query published stories
  const { data: stories } = await supabase
    .from('story_submissions' as never)
    .select('*, profiles:profiles!story_submissions_author_id_fkey(display_name)')
    .eq('status', 'published')
    .order('created_at', { ascending: false }) as unknown as { data: any[] | null };

  return (
    <StoriesHubClient
      adoptedCats={(adoptedCats ?? []) as any[]}
      stories={(stories ?? []) as any[]}
    />
  );
}
