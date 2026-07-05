// app/(app)/admin/volunteers/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Volunteer Management',
  description: 'Approve volunteer hours, verify specialized credentials, and assign chapter leads.',
};

export const dynamic = 'force-dynamic';

export default async function AdminVolunteersPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Verify Admin role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  if (profile?.role !== 'admin') redirect('/');

  // Query all profiles with skills and hours count
  const { data: volunteers } = await supabase
    .from('profiles' as never)
    .select('id, display_name, email, role, created_at')
    .order('created_at', { ascending: false }) as unknown as { data: any[] | null };

  // Query pending credentials
  const { data: pendingSkills } = await supabase
    .from('volunteer_skills' as never)
    .select('*, profiles:profiles(display_name)')
    .eq('verified', false) as unknown as { data: any[] | null };

  // Query pending hours
  const { data: pendingHours } = await supabase
    .from('volunteer_hours' as never)
    .select('*, profiles:profiles(display_name)')
    .is('verified_at', null) as unknown as { data: any[] | null };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--empire-gold)] uppercase tracking-wider font-mono">
          <Link href="/admin" className="hover:underline text-[var(--empire-gold)]">Admin Dashboard</Link>
          <span>/</span>
          <span>Volunteers</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)] mt-1">Volunteer Operations Admin</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Approve logged hours, verify credentials, and review regional coordinator deployments.
        </p>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Credentials */}
        <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-[var(--empire-cream)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--empire-gold)]">badge</span>
            <span>Pending Credentials ({pendingSkills?.length || 0})</span>
          </h3>

          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {!pendingSkills || pendingSkills.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-500 font-mono">No pending credentials to verify.</div>
            ) : (
              pendingSkills.map((ps) => (
                <div key={ps.id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--empire-cream)]">{ps.profiles?.display_name || 'Volunteer'}</h4>
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mt-1">
                      Skill: {ps.skill_type.replace('_', ' ')}
                    </span>
                  </div>
                  {/* Since verification requires a Server Action, we display a quick action form */}
                  <form action={`/api/volunteers/skills`} method="POST">
                    <input type="hidden" name="action" value="verify" />
                    <input type="hidden" name="userId" value={ps.user_id} />
                    <input type="hidden" name="skillType" value={ps.skill_type} />
                    <button
                      type="submit"
                      className="bg-[var(--life-teal)] text-white hover:opacity-90 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Hours Verification */}
        <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-[var(--empire-cream)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--life-teal)]">schedule</span>
            <span>Pending Hour Logs ({pendingHours?.length || 0})</span>
          </h3>

          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {!pendingHours || pendingHours.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-500 font-mono">No hours logs pending approval.</div>
            ) : (
              pendingHours.map((ph) => (
                <div key={ph.id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--empire-cream)]">{ph.profiles?.display_name || 'Volunteer'}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase">
                      {ph.activity_type.replace('_', ' ')} - {ph.hours} hours
                    </p>
                  </div>
                  <form action={`/api/volunteers/hours`} method="POST">
                    <input type="hidden" name="action" value="verify" />
                    <input type="hidden" name="hoursId" value={ph.id} />
                    <button
                      type="submit"
                      className="bg-[var(--life-teal)] text-white hover:opacity-90 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
                    >
                      Verify
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
