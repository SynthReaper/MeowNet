// app/api/privacy/delete-account/route.ts — GDPR Right to Erasure

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(_req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const admin = createServiceClient();
    await (admin as any).rpc('delete_user_account', { p_user_id: user.id });
    // Supabase Auth session cleanup
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: 'Account and all associated data deleted.' });
  } catch (err) {
    console.error('delete_user_account error:', err);
    return NextResponse.json({ error: 'deletion_failed' }, { status: 500 });
  }
}
