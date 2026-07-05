import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateCertificate } from '@/lib/actions/education';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { enrollmentId } = body;

    const res = await generateCertificate(enrollmentId);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true, certificateUrl: res.certificateUrl });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
