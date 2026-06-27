'use client';
// components/cats/CatGrid/index.tsx — Responsive cat card grid

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import type { CatListItem } from '@/app/(app)/cats/page';

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string; bg: string }> = {
  stray:      { color: '#ba1a1a', label: 'Stray', icon: 'warning', bg: '#ffdad6' },
  tnr_needed: { color: '#ab2c5d', label: 'TNR Needed', icon: 'schedule', bg: '#ffd9e1' },
  adoptable:  { color: '#006a63', label: 'Adoptable', icon: 'favorite', bg: '#8bf1e6' },
  adopted:    { color: '#818CF8', label: 'Adopted', icon: 'check_circle', bg: 'rgba(129,140,248,0.15)' },
  fostered:   { color: '#818CF8', label: 'Fostered', icon: 'check_circle', bg: 'rgba(129,140,248,0.15)' },
};

function CatCard({ cat, isRestricted }: { cat: CatListItem; isRestricted: boolean }) {
  const status = STATUS_CONFIG[cat.status] ?? { color: '#887365', label: cat.status, icon: 'pets', bg: '#f1ede7' };

  const content = (
    <article className={`bg-white rounded-xl border border-[var(--bg-border)] shadow-ambient hover:shadow-[0_8px_24px_rgba(242,140,56,0.15)] transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer h-full relative`}>
      {/* Restricted Blurring Overlay */}
      {isRestricted && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-[5px] text-center text-white select-none pointer-events-auto">
          <span className="material-symbols-outlined text-3xl mb-2 text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
          <span className="font-display text-xs font-bold uppercase tracking-wider block">Sign in to view</span>
          <span className="font-body text-[10px] text-zinc-300 mt-1 block px-2 max-w-[150px] mx-auto leading-relaxed">
            Connect to see full profile details
          </span>
        </div>
      )}

      <div className={`flex flex-col flex-grow ${isRestricted ? 'filter blur-[1px] opacity-40 select-none pointer-events-none' : ''}`}>
        {/* Photo */}
        <div className="relative h-48 w-full overflow-hidden bg-[var(--bg-elevated)]">
          <img
            src={cat.photo_url}
            alt={cat.name ?? 'Cat photo'}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-2 flex-grow">
          <div className="flex justify-between items-start">
            <h2 className="font-display text-base font-bold text-[var(--empire-cream)] truncate max-w-[80%]">
              {cat.name ?? 'Unknown Cat'}
            </h2>
            <span className="material-symbols-outlined text-[var(--empire-gold)] text-lg icon-fill" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 font-body text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: status.bg, color: status.color }}>
              <span className="material-symbols-outlined text-[12px] icon-fill" style={{ fontVariationSettings: "'FILL' 1" }}>{status.icon}</span>
              {status.label}
            </span>
            {cat.breed_estimate && (
              <span className="inline-flex items-center gap-1 bg-[var(--bg-elevated)] text-[var(--empire-cream)]/70 font-body text-[10px] font-semibold px-2.5 py-1 rounded-full">
                {cat.breed_estimate}
              </span>
            )}
          </div>

          {/* Info Footer */}
          <div className="mt-auto pt-2 flex items-center gap-1 text-[var(--empire-cream)]/60 font-body text-xs">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            <span className="truncate">
              {cat.age_estimate ? `${cat.age_estimate} • ` : ''}Snapped location
            </span>
          </div>
        </div>
      </div>
    </article>
  );

  if (isRestricted) {
    return (
      <Link href="/auth/login" className="no-underline block h-full">
        {content}
      </Link>
    );
  }

  return (
    <Link href={`/cats/${cat.id}`} className="no-underline block h-full">
      {content}
    </Link>
  );
}

interface CatGridProps { cats: CatListItem[]; }

export default function CatGrid({ cats }: CatGridProps) {
  const { isSignedIn } = useUser();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isUserLoggedIn = isSignedIn || !!supabaseUser;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cats.map((cat, index) => {
        const isRestricted = !isUserLoggedIn && index >= 2;
        return <CatCard key={cat.id} cat={cat} isRestricted={isRestricted} />;
      })}

      {/* Add sighting card (Only accessible if signed in, else redirects to login) */}
      <Link href={isUserLoggedIn ? "/cats/new" : "/auth/login"} className="no-underline">
        <article className="bg-[var(--bg-elevated)] border-2 border-dashed border-[var(--bg-border)] rounded-xl flex flex-col items-center justify-center p-6 h-full min-h-[250px] hover:bg-white/50 transition-colors cursor-pointer text-center group">
          <div className="h-12 w-12 bg-white text-[var(--empire-gold)] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm">
            <span className="material-symbols-outlined text-2xl font-bold">add</span>
          </div>
          <h3 className="font-display text-base font-bold text-[var(--empire-cream)] mb-1">Add New Sighting</h3>
          <p className="font-body text-xs text-[var(--empire-cream)]/50">Log a new community cat to the directory.</p>
        </article>
      </Link>
    </div>
  );
}

