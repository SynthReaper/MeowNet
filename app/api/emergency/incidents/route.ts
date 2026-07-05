import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { reportIncident, acknowledgeIncident, resolveIncident } from '@/lib/actions/emergency';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const severity = url.searchParams.get('severity');

  let query = supabase
    .from('incidents' as never)
    .select('*, profiles:profiles!incidents_reporter_id_fkey(display_name)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (severity) query = query.eq('severity', severity);

  const { data: incidents } = await query as unknown as { data: unknown[] | null };
  return NextResponse.json({ incidents: incidents ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const res = await reportIncident(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true, incidentId: res.incidentId });
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { incidentId, action, resolutionNotes } = body;

    if (action === 'acknowledge') {
      const res = await acknowledgeIncident(incidentId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'resolve') {
      const res = await resolveIncident(incidentId, resolutionNotes || '');
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
