import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { addPartnerOrganization } from '@/lib/actions/partners';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: partners } = await supabase
    .from('partner_organizations' as never)
    .select('*')
    .eq('verification_status', 'verified')
    .order('name') as unknown as { data: unknown[] | null };

  return NextResponse.json({ partners: partners ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('name', body.name);
    formData.append('type', body.type);
    if (body.contact_email) formData.append('contact_email', body.contact_email);
    if (body.contact_phone) formData.append('contact_phone', body.contact_phone);
    if (body.address) formData.append('address', body.address);
    if (body.discount_code) formData.append('discount_code', body.discount_code);
    if (body.partnership_tier) formData.append('partnership_tier', body.partnership_tier);
    formData.append('benefits', JSON.stringify(body.benefits || []));

    const res = await addPartnerOrganization(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true, partnerId: res.partnerId });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
