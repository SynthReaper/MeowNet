import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { enrollInCourse, updateCourseProgress, completeQuiz } from '@/lib/actions/education';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: enrollments } = await supabase
    .from('course_enrollments' as never)
    .select('*, course:courses(title, category, difficulty)')
    .eq('user_id', user.id) as unknown as { data: unknown[] | null };

  return NextResponse.json({ enrollments: enrollments ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const res = await enrollInCourse(body.course_id);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true, enrollmentId: res.enrollmentId });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { enrollmentId, action, progress, answers } = body;

    if (action === 'progress') {
      const res = await updateCourseProgress(enrollmentId, progress);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'quiz') {
      const res = await completeQuiz(enrollmentId, answers || {});
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, score: res.score, passed: res.passed });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
