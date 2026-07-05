import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getVolunteerAvailability, setVolunteerAvailability } from '@/lib/actions/volunteers';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || undefined;

  const data = await getVolunteerAvailability(userId);
  return NextResponse.json({ availability: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('day_of_week', String(body.day_of_week));
    formData.append('start_time', body.start_time);
    formData.append('end_time', body.end_time);
    formData.append('is_active', String(body.is_active));

    const res = await setVolunteerAvailability(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
