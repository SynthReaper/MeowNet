import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get active critical or high incidents
  const { data: alerts } = await supabase
    .from('incidents' as never)
    .select('*')
    .in('severity', ['high', 'critical'])
    .in('status', ['open', 'acknowledged', 'in_progress'])
    .order('created_at', { ascending: false }) as unknown as { data: unknown[] | null };

  return NextResponse.json({ alerts: alerts ?? [] });
}
