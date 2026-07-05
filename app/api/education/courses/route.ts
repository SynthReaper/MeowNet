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

  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string | null } | null };

  const isStaff = profile?.role === 'admin' || profile?.role === 'moderator';

  const { data: courses } = await query as unknown as { data: any[] | null };

  const cleanCourses = (courses ?? []).map((c: any) => {
    if (isStaff) return c;
    if (c && c.content && Array.isArray(c.content.quizzes)) {
      const cleanQuizzes = c.content.quizzes.map((q: any) => {
        if (!q) return q;
        const { correct_answer, ...rest } = q;
        return rest;
      });
      return {
        ...c,
        content: {
          ...c.content,
          quizzes: cleanQuizzes
        }
      };
    }
    return c;
  });

  return NextResponse.json({ courses: cleanCourses });
}
