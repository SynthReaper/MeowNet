import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { addEmergencyContact, deleteEmergencyContact } from '@/lib/actions/emergency';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: contacts } = await supabase
    .from('emergency_contacts' as never)
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('name') as unknown as { data: unknown[] | null };

  return NextResponse.json({ contacts: contacts ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('contact_type', body.contact_type);
    formData.append('name', body.name);
    formData.append('phone', body.phone);
    if (body.email) formData.append('email', body.email);
    if (body.relationship) formData.append('relationship', body.relationship);
    formData.append('is_primary', String(body.is_primary));

    const res = await addEmergencyContact(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const contactId = url.searchParams.get('id');
    if (!contactId) return NextResponse.json({ error: 'Missing contact ID' }, { status: 400 });

    const res = await deleteEmergencyContact(contactId);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
