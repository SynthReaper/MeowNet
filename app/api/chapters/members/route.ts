import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { joinChapter, leaveChapter, getChapterMembers } from '@/lib/actions/chapters';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const chapterId = url.searchParams.get('chapterId');
  if (!chapterId) return NextResponse.json({ error: 'Missing chapterId parameter' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string | null } | null };

  const isStaff = profile?.role === 'admin' || profile?.role === 'moderator';

  if (!isStaff) {
    const { data: membership } = await supabase
      .from('chapter_members' as never)
      .select('user_id')
      .eq('chapter_id', chapterId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const data = await getChapterMembers(chapterId);
  return NextResponse.json({ members: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { chapterId } = body;

    const res = await joinChapter(chapterId);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const chapterId = url.searchParams.get('chapterId');
    if (!chapterId) return NextResponse.json({ error: 'Missing chapterId parameter' }, { status: 400 });

    const res = await leaveChapter(chapterId);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
