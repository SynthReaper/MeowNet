import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { exportResearchData } from '@/lib/actions/partners';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const requestId = url.searchParams.get('requestId');
  if (!requestId) return NextResponse.json({ error: 'Missing requestId parameter' }, { status: 400 });

  const res = await exportResearchData(requestId);
  if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

  return NextResponse.json({ success: true, data: res.data });
}
