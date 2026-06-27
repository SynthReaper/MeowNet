// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/colonies/page.tsx — Colony management list page
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cat Colonies',
  description: 'Manage community cat colonies, track TNR progress, and coordinate caretaking.',
};

export const dynamic = 'force-dynamic';

interface ColonyListItem {
  id: string;
  name: string;
  description: string | null;
  population_estimate: number;
  tnr_count: number;
  caretaker_id: string | null;
  caretaker?: {
    display_name: string | null;
  } | null;
}

export default async function ColoniesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('colonies' as never)
    .select('id, name, description, population_estimate, tnr_count, caretaker_id, caretaker:profiles!colonies_caretaker_id_fkey(display_name)')
    .order('created_at', { ascending: false }) as { data: ColonyListItem[] | null; error: any };

  const colonies = data ?? [];

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-w-7xl w-full">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)] flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]">home_work</span>
            <span>Feral Cat Colonies</span>
          </h1>
          <p className="font-body text-lg text-[var(--empire-cream)]/70 mt-2">
            Community-managed feral and stray cat groups. Join as a caretaker, track population estimates, and coordinate TNR (Trap-Neuter-Return) campaigns.
          </p>
        </div>
        {user && (
          <Link
            href="/colonies/new"
            id="register-colony-btn"
            className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-5 py-3 rounded-xl text-sm font-bold uppercase transition-all shadow-sm flex items-center gap-2 no-underline shrink-0"
          >
            <span className="material-symbols-outlined text-base">add_business</span>
            <span>Register Colony</span>
          </Link>
        )}
      </section>

      {/* Directory Grid */}
      <section className="w-full">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl font-body text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">cloud_off</span>
            <span>Failed to load colonies registry. Please verify your connection or try again.</span>
          </div>
        ) : colonies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--bg-border)]/40 p-12 text-center shadow-ambient flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]/50">home_work</span>
            <h3 className="font-display text-base font-bold text-[var(--empire-cream)]">No colonies registered yet</h3>
            <p className="font-body text-xs text-[var(--empire-cream)]/60 max-w-sm">
              Be the first to map a local community cat colony to start tracking TNR progress and coordinating care!
            </p>
            {user && (
              <Link
                href="/colonies/new"
                className="mt-2 text-xs font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-1"
              >
                Get Started <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colonies.map((colony) => {
              const pct = colony.population_estimate > 0 
                ? Math.min(100, Math.round((colony.tnr_count / colony.population_estimate) * 100))
                : 0;

              return (
                <div
                  key={colony.id}
                  className="bg-white rounded-2xl border border-[var(--bg-border)] shadow-ambient p-6 flex flex-col gap-4 hover:shadow-active transition-all"
                >
                  <div>
                    <h3 className="font-display text-lg font-bold text-[var(--empire-cream)] truncate">
                      {colony.name}
                    </h3>
                    <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1 flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-xs text-[var(--empire-cream)]/40">assignment_ind</span>
                      <span>
                        Caretaker: {colony.caretaker?.display_name || 'No caretaker assigned'}
                      </span>
                    </p>
                  </div>

                  {colony.description && (
                    <p className="font-body text-xs text-[var(--empire-cream)]/70 line-clamp-2 min-h-[40px] leading-relaxed">
                      {colony.description}
                    </p>
                  )}

                  {/* TNR Progress */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/45">
                      <span>TNR Progress</span>
                      <span>{pct}% sterilized</span>
                    </div>
                    <div className="tnr-progress-track">
                      <div className="tnr-progress-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-[var(--empire-cream)]/50 mt-0.5">
                      <span>TNR: {colony.tnr_count}</span>
                      <span>Est. Population: {colony.population_estimate}</span>
                    </div>
                  </div>

                  <div className="border-t border-[var(--bg-border)]/20 pt-4 mt-2 flex justify-end">
                    <Link
                      href={`/colonies/${colony.id}`}
                      className="font-body text-xs font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-0.5"
                    >
                      <span>View details</span>
                      <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
