import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [catsResult, hoursResult, requestsResult] = await Promise.all([
    supabase.from('cats' as never).select('status, sterilized'),
    supabase.from('volunteer_hours' as never).select('hours'),
    supabase.from('supply_requests' as never).select('status, quantity_requested'),
  ]);

  const cats = catsResult.data as { status: string; sterilized: boolean }[] | null;
  const hours = hoursResult.data as { hours: number }[] | null;
  const requests = requestsResult.data as { status: string; quantity_requested: number }[] | null;

  const totalSterilized = cats?.filter((c) => c.sterilized).length ?? 0;
  const totalAdopted = cats?.filter((c) => c.status === 'adopted').length ?? 0;
  const totalHours = (hours ?? []).reduce((acc, curr) => acc + Number(curr.hours), 0);
  const totalFulfillments = requests?.filter((r) => r.status === 'fulfilled').length ?? 0;

  return NextResponse.json({
    metrics: {
      sterilizations: totalSterilized,
      adoptions: totalAdopted,
      volunteerHours: Math.round(totalHours),
      supplyFulfillments: totalFulfillments,
    },
  });
}
