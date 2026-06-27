// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/cats/page.tsx — Cat listings with search/filter
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import CatGrid from '@/components/cats/CatGrid';
import FloatingActionButton from '@/components/ui/FloatingActionButton';

export const metadata: Metadata = {
  title: 'Find Cats',
  description: 'Browse all logged cats on MeowNet — strays, TNR-needed, and adoptable cats near you.',
};

export const revalidate = 60;

const STATUS_LABELS: Record<string, string> = {
  all: 'All Cats',
  stray: 'Strays',
  tnr_needed: 'TNR Needed',
  adoptable: 'Adoptable',
  adopted: 'Adopted',
};

export interface CatListItem {
  id: string; name: string | null; photo_url: string; status: string;
  breed_estimate: string | null; age_estimate: string | null; created_at: string;
}

export default async function CatsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = 'all', q = '' } = await searchParams;
  const supabase = await createServerClient();



  let query = supabase
    .from('cats' as never)
    .select('id, name, photo_url, status, breed_estimate, age_estimate, created_at')
    .order('created_at', { ascending: false })
    .limit(60);

  if (status !== 'all') query = query.eq('status', status);
  if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);

  const { data, error } = await query;
  const cats = (data ?? []) as CatListItem[];

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header Section */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">The Cat Directory</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          A high-density overview of our local feline friends. Use the filters to locate specific strays, coordinate TNR efforts, or find candidates needing socialization.
        </p>
      </section>

      {/* Search and Filter Toolbar */}
      <section className="bg-white rounded-xl p-4 md:p-6 shadow-ambient flex flex-col md:flex-row gap-6 items-center justify-between border border-[var(--bg-border)]">
        {/* Search Input */}
        <form className="relative w-full md:w-96" method="get" action="/cats">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--empire-cream)]/50">search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
            className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body pl-12 pr-4 py-3 rounded-full border border-[var(--bg-border)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all"
          />
        </form>

        {/* Soft Pill Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {Object.entries(STATUS_LABELS).map(([val, label]) => {
            const active = status === val;
            return (
              <Link
                key={val}
                href={`/cats?status=${val}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`font-body text-xs font-semibold px-4 py-2 rounded-full whitespace-nowrap transition-all no-underline ${
                  active
                    ? 'bg-[var(--empire-gold)] text-white shadow-sm'
                    : 'bg-white text-[var(--empire-cream)]/70 border border-[var(--bg-border)] hover:bg-[var(--bg-elevated)] hover:text-[var(--empire-cream)]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Directory Grid */}
      <section>
        {error ? (
          <div className="flex flex-col gap-6">
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl font-body text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base">cloud_off</span>
              <span>Network Error: Failed to synchronize stray cat logs. Please verify your connection or try reloading.</span>
            </div>
            {/* Empty boxes (skeletons) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-60">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-zinc-100/50 border border-zinc-200 rounded-xl p-4 flex flex-col gap-4 h-full min-h-[300px]">
                  <div className="w-full h-48 bg-zinc-200/50 rounded-lg"></div>
                  <div className="h-6 bg-zinc-200/50 w-2/3 rounded-md"></div>
                  <div className="h-5 bg-zinc-200/50 w-16 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <CatGrid cats={cats} />
        )}
      </section>
      <FloatingActionButton />
    </div>
  );
}
