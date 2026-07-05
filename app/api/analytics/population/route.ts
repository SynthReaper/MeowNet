import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rules-based population projection (Phase 14 target)
  const { data: cats } = await supabase
    .from('cats' as never)
    .select('created_at, sterilized') as unknown as { data: { created_at: string; sterilized: boolean }[] | null };

  const totalCats = cats?.length ?? 0;
  const sterilizedCats = cats?.filter((c) => c.sterilized).length ?? 0;
  const sterilizationRate = totalCats > 0 ? (sterilizedCats / totalCats) * 100 : 0;

  // Simple growth projection over the next 12 months
  const projections = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    // High sterilization rates slow down stray growth factor
    const growthFactor = sterilizationRate > 70 ? 0.01 : 0.05;
    const projectedStrayCount = Math.round(totalCats * (1 + growthFactor * monthIndex));
    return {
      month: `Month +${monthIndex}`,
      projected: projectedStrayCount,
    };
  });

  return NextResponse.json({
    totalCats,
    sterilizationRate,
    projections,
  });
}
