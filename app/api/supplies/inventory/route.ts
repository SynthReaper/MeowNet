import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { addSupply } from '@/lib/actions/supplies';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const category = url.searchParams.get('category');

  let query = supabase
    .from('supplies' as never)
    .select('*, profiles:profiles!supplies_donated_by_fkey(display_name)')
    .order('name');

  if (category) query = query.eq('category', category);

  const { data: supplies } = await query as unknown as { data: unknown[] | null };
  return NextResponse.json({ supplies: supplies ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('name', body.name);
    formData.append('category', body.category);
    formData.append('quantity', String(body.quantity));
    formData.append('unit', body.unit);
    if (body.expiration_date) formData.append('expiration_date', body.expiration_date);
    if (body.lat) formData.append('lat', String(body.lat));
    if (body.lng) formData.append('lng', String(body.lng));
    if (body.notes) formData.append('notes', body.notes);

    const res = await addSupply(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
