import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createChapter, listChapters } from '@/lib/actions/chapters';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await listChapters();
  return NextResponse.json({ chapters: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('name', body.name);
    formData.append('region', body.region);
    if (body.description) formData.append('description', body.description);
    if (body.meeting_schedule) formData.append('meeting_schedule', body.meeting_schedule);
    if (body.coordinator_id) formData.append('coordinator_id', body.coordinator_id);

    const res = await createChapter(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true, chapterId: res.chapterId });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
