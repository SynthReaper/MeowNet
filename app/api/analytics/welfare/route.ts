import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get average welfare score historical aggregate
  const { data: welfare } = await supabase
    .from('volunteer_hours' as never)
    .select('date, hours, activity_type')
    .order('date') as unknown as { data: { date: string; hours: number; activity_type: string }[] | null };

  // Calculate simulated welfare indexes for display
  const monthlyWelfare = (welfare ?? []).reduce((acc: Record<string, { total: number; count: number }>, curr) => {
    const month = curr.date.substring(0, 7);
    if (!acc[month]) acc[month] = { total: 0, count: 0 };
    // Simulate mapping hour activities to a welfare index 0-100
    const activityWeight = curr.activity_type === 'trapping' ? 85 : curr.activity_type === 'feeding' ? 95 : 75;
    acc[month].total += activityWeight;
    acc[month].count += 1;
    return acc;
  }, {});

  const trends = Object.entries(monthlyWelfare).map(([month, val]) => ({
    month,
    score: Math.round(val.total / val.count),
  }));

  return NextResponse.json({ trends });
}
