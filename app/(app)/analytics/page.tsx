// app/(app)/analytics/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Community Social Impact Dashboard | MeowNet',
  description: 'View aggregate sterilizations, adoptions, volunteer logged hours, and colony growth statistics.',
};

export const dynamic = 'force-dynamic';

export default async function PublicAnalyticsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query counts
  const [catsResult, hoursResult, requestsResult] = await Promise.all([
    supabase.from('cats' as never).select('status, sterilized'),
    supabase.from('volunteer_hours' as never).select('hours, activity_type'),
    supabase.from('supply_requests' as never).select('status'),
  ]);

  const cats = catsResult.data as { status: string; sterilized: boolean }[] | null;
  const hours = hoursResult.data as { hours: number; activity_type: string }[] | null;
  const requests = requestsResult.data as { status: string }[] | null;

  const totalSterilized = cats?.filter((c) => c.sterilized).length ?? 0;
  const totalAdopted = cats?.filter((c) => c.status === 'adopted').length ?? 0;
  const totalHours = (hours ?? []).reduce((acc, curr) => acc + Number(curr.hours), 0);
  const totalFulfillments = requests?.filter((r) => r.status === 'fulfilled').length ?? 0;

  // Aggregate hours by activity type
  const hoursByActivity = (hours ?? []).reduce((acc: Record<string, number>, curr) => {
    acc[curr.activity_type] = (acc[curr.activity_type] || 0) + Number(curr.hours);
    return acc;
  }, {});

  const maxHours = Math.max(...Object.values(hoursByActivity), 1);

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Community Social Impact Dashboard</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Transparent metrics displaying community TNR operations, veterinary treatments, and aggregate volunteer efforts.
        </p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Sterilizations Performed', value: totalSterilized, color: 'text-[var(--life-teal)]', icon: 'check_circle' },
          { label: 'Successful Adoptions', value: totalAdopted, color: 'text-[var(--empire-gold)]', icon: 'favorite' },
          { label: 'Volunteer Time logged', value: `${Math.round(totalHours)} hr`, color: 'text-blue-400', icon: 'schedule' },
          { label: 'Supplies Distributed', value: totalFulfillments, color: 'text-purple-400', icon: 'inventory' },
        ].map((stat) => (
          <div key={stat.label} className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-mono tracking-wider">{stat.label}</span>
              <span className={`text-2xl font-black ${stat.color} mt-1 block`}>{stat.value}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 text-gray-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Chart Panel: Hours Allocation */}
      <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl max-w-4xl flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Operations Allocation</h3>
          <p className="text-xs text-gray-400 mt-1">Relative distribution of volunteer hours logged by operational category.</p>
        </div>

        <div className="flex flex-col gap-4">
          {Object.entries(hoursByActivity).map(([act, hr]) => {
            const pct = Math.round((hr / maxHours) * 100);
            return (
              <div key={act} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-[var(--empire-cream)]">
                  <span className="capitalize">{act.replace('_', ' ')}</span>
                  <span className="font-mono">{Math.round(hr)} hours</span>
                </div>
                <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-[var(--life-teal)] h-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
