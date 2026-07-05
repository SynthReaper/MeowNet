import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { submitStory } from '@/lib/actions/education';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: stories } = await supabase
    .from('story_submissions' as never)
    .select('*, profiles:profiles!story_submissions_author_id_fkey(display_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false }) as unknown as { data: unknown[] | null };

  return NextResponse.json({ stories: stories ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const res = await submitStory(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true, storyId: res.storyId });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
