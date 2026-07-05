import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { dispatchVolunteer } from '@/lib/actions/emergency';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { incidentId, volunteerId } = body;

    const res = await dispatchVolunteer(incidentId, volunteerId);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
