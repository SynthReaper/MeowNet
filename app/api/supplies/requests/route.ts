import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requestSupply, approveSupplyRequest, fulfillSupplyRequest } from '@/lib/actions/supplies';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  let query = supabase
    .from('supply_requests' as never)
    .select('*, requester:profiles!supply_requests_requester_id_fkey(display_name), supply:supplies(name, category, quantity, unit)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data: requests } = await query as unknown as { data: unknown[] | null };
  return NextResponse.json({ requests: requests ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('supply_id', body.supply_id);
    formData.append('quantity_requested', String(body.quantity_requested));
    formData.append('purpose', body.purpose);

    const res = await requestSupply(formData);
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
    const { requestId, action } = body;

    if (action === 'approve') {
      const res = await approveSupplyRequest(requestId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'fulfill') {
      const res = await fulfillSupplyRequest(requestId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
