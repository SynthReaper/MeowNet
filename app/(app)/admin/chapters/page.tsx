// app/(app)/admin/chapters/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Chapter Management',
  description: 'Establish new caretaker chapters and assign regional coordinator leads.',
};

export const dynamic = 'force-dynamic';

export default async function AdminChaptersPage() {
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

  // Query all chapters
  const { data: chapters } = await supabase
    .from('chapters' as never)
    .select('*')
    .order('name') as unknown as { data: any[] | null };

  // Query potential coordinators
  const { data: coordinators } = await supabase
    .from('profiles' as never)
    .select('id, display_name')
    .limit(100) as unknown as { data: any[] | null };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--empire-gold)] uppercase tracking-wider font-mono">
          <Link href="/admin" className="hover:underline text-[var(--empire-gold)]">Admin Dashboard</Link>
          <span>/</span>
          <span>Chapters</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)] mt-1">Regional Chapters Admin</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Establish new regional chapters, deploy coordinators, and synchronize localized storage parameters.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create Chapter */}
        <div className="lg:col-span-1 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl h-fit">
          <h3 className="text-lg font-bold text-[var(--empire-cream)] mb-4">Establish Chapter</h3>
          <form action="/api/chapters" method="POST" className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Chapter Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. North Seattle Caretakers"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Region / Boundary</label>
              <input
                type="text"
                name="region"
                required
                placeholder="e.g. Seattle, WA"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Description</label>
              <textarea
                name="description"
                placeholder="Detail meeting schedule, quadrant boundaries, active colonies..."
                className="w-full h-24 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Meeting Schedule</label>
              <input
                type="text"
                name="meeting_schedule"
                placeholder="e.g. Every Sunday at 10 AM"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Assign Coordinator</label>
              <select
                name="coordinator_id"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
              >
                <option value="">-- Choose Coordinator --</option>
                {(coordinators ?? []).map((coord) => (
                  <option key={coord.id} value={coord.id}>
                    {coord.display_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-[var(--life-teal)] text-white hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Create Chapter
            </button>
          </form>
        </div>

        {/* Right Column: Active Chapters list */}
        <div className="lg:col-span-2 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Active Chapters ({chapters?.length || 0})</h3>
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1">
            {!chapters || chapters.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500 font-mono">No active chapters registered.</div>
            ) : (
              chapters.map((ch) => (
                <div key={ch.id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[var(--empire-cream)]">{ch.name}</h4>
                    <span className="text-[10px] text-gray-400 font-mono block mt-1 uppercase">Region: {ch.region}</span>
                    {ch.meeting_schedule && (
                      <p className="text-xs text-gray-400 mt-1">Schedule: {ch.meeting_schedule}</p>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="text-xs font-mono text-[var(--empire-gold)]">{ch.member_count || 0} Member(s)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
