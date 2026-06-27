// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/stories/page.tsx — Success Stories of Adopted Cats
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Success Stories',
  description: 'Celebrate our successfully adopted felines and view the happy tails of MeowNet.',
};

export const dynamic = 'force-dynamic';

interface AdoptedCat {
  id: string;
  name: string | null;
  photo_url: string;
  status: string;
  breed_estimate: string | null;
  age_estimate: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
  } | null;
}

const formatFriendlyDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr.slice(0, 10);
  }
};

export default async function StoriesPage() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('cats' as never)
    .select('id, name, photo_url, status, breed_estimate, age_estimate, created_at, updated_at, profiles:profiles(display_name)')
    .eq('status', 'adopted')
    .order('updated_at', { ascending: false }) as { data: AdoptedCat[] | null; error: any };

  const cats = data ?? [];

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header Section */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)] flex items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
          <span>Happy Tails</span>
        </h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          The ultimate goal of MeowNet. Celebrate the community's collective impact as feral strays find forever homes, warmth, and cozy care.
        </p>
      </section>

      {/* Directory Grid */}
      <section className="w-full">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl font-body text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">cloud_off</span>
            <span>Failed to sync success stories. Please verify your connection or try again.</span>
          </div>
        ) : cats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--bg-border)]/40 p-16 text-center shadow-ambient flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]/40">pets</span>
            <h3 className="font-display text-base font-bold text-[var(--empire-cream)]">Awaiting happy stories</h3>
            <p className="font-body text-xs text-[var(--empire-cream)]/60 max-w-sm">
              No cat sightings have been marked as adopted yet. Keep up the rescue and volunteer work!
            </p>
            <Link
              href="/cats"
              className="mt-2 text-xs font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-1"
            >
              Browse Stray Cats <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cats.map((cat) => (
              <div
                key={cat.id}
                className="story-card flex flex-col h-full bg-white border border-[var(--bg-border)] rounded-2xl shadow-ambient hover:shadow-active transition-all"
              >
                {/* Photo frame */}
                <div className="h-56 bg-[var(--bg-elevated)] relative overflow-hidden border-b border-[var(--bg-border)]/20 flex items-center justify-center">
                  {cat.photo_url ? (
                    <img src={cat.photo_url} alt={cat.name || 'Happy cat'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-5xl text-[var(--empire-gold)]/30">pets</span>
                  )}
                  <span className="absolute top-3 right-3 bg-[var(--life-teal)] text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                    Adopted
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-grow justify-between">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-display text-base font-bold text-[var(--empire-cream)] truncate">
                      {cat.name || 'Happy Feline'}
                    </h3>
                    <p className="font-body text-[10px] text-[var(--empire-cream)]/60 font-semibold uppercase tracking-wider">
                      {cat.breed_estimate || 'Community Tabby'} · {cat.age_estimate || 'Adult'}
                    </p>
                    <p className="font-body text-xs text-[var(--empire-cream)]/75 mt-1 leading-relaxed italic">
                      "I have officially moved from the streets into a loving forever home! Big purrs to everyone who looked out for me."
                    </p>
                  </div>

                  <div className="border-t border-[var(--bg-border)]/15 pt-3 mt-2 flex flex-col gap-1 text-[10px] font-body text-[var(--empire-cream)]/50">
                    <div className="flex justify-between">
                      <span>Sighted By:</span>
                      <strong className="text-[var(--empire-cream)]/70">{cat.profiles?.display_name || 'Volunteer'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Happy Tail Date:</span>
                      <strong className="text-[var(--empire-cream)]/70">{formatFriendlyDate(cat.updated_at)}</strong>
                    </div>
                    <Link
                      href={`/cats/${cat.id}`}
                      className="font-body text-[10px] font-bold text-[var(--empire-gold)] hover:underline mt-2 text-right flex items-center gap-0.5 self-end"
                    >
                      <span>Read Journey</span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
