import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getVolunteerMatches } from '@/lib/actions/volunteers';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const colonyId = url.searchParams.get('colony_id');
  if (!colonyId) return NextResponse.json({ error: 'Missing colony_id parameter' }, { status: 400 });

  const res = await getVolunteerMatches(colonyId);
  if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

  return NextResponse.json({ matches: res.matches || [] });
}
