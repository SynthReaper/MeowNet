import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const difficulty = url.searchParams.get('difficulty');

  let query = supabase
    .from('courses' as never)
    .select('*')
    .eq('is_published', true);

  if (category) query = query.eq('category', category);
  if (difficulty) query = query.eq('difficulty', difficulty);

  const { data: courses } = await query as unknown as { data: unknown[] | null };
  return NextResponse.json({ courses: courses ?? [] });
}
