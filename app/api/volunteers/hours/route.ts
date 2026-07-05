import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logVolunteerHours, verifyHours } from '@/lib/actions/volunteers';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: hours } = await supabase
    .from('volunteer_hours' as never)
    .select('*, profiles:profiles(display_name)')
    .eq('user_id', user.id)
    .order('date', { ascending: false }) as unknown as { data: unknown[] | null };

  return NextResponse.json({ hours: hours ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    if (body.colony_id) formData.append('colony_id', body.colony_id);
    formData.append('activity_type', body.activity_type);
    formData.append('hours', String(body.hours));
    formData.append('date', body.date);
    if (body.notes) formData.append('notes', body.notes);

    const res = await logVolunteerHours(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
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
    const res = await verifyHours(body.hoursId);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
