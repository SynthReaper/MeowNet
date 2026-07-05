// app/(app)/research/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ResearchRequestForm from '@/components/research/ResearchRequestForm';

export const metadata: Metadata = {
  title: 'Academic & Ecological Research Portal | MeowNet',
  description: 'Access fully anonymized stray cat population density metadata and TNR effectiveness metrics.',
};

export const dynamic = 'force-dynamic';

export default async function ResearchPortalPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Ecological Research Portal</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Providing academic researchers with fully fuzzed population density matrices and anonymized clinic indicators.
        </p>
      </section>

      {/* GDPR Warning Callout */}
      <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-5 flex items-start gap-4">
        <span className="material-symbols-outlined text-amber-500 shrink-0 text-xl">policy</span>
        <div className="flex-grow text-xs text-amber-500/90 leading-relaxed">
          <h4 className="font-bold uppercase tracking-wider mb-1">GDPR &amp; Feline Safety Compliance</h4>
          <p>
            All download payloads are anonymized: direct caretaker associations, private notes, and raw coordinates are omitted. Location nodes are snapped to a fuzzed grid pattern (precision limit 0.005) in compliance with safety gates.
          </p>
        </div>
      </div>

      {/* Grid: Download/Request Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <ResearchRequestForm defaultEmail={user.email ?? ''} />

        {/* Info panel */}
        <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-base font-bold text-[var(--empire-cream)]">Open Data Initiative</h3>
          <div className="flex flex-col gap-3.5 text-xs text-gray-400 leading-relaxed font-body">
            <p>
              By offering fully audited public datasets, MeowNet assists researchers in modeling urban wildlife interfaces, TNR impact curves, and vaccine spread dynamics across regional quadrants.
            </p>
            <p>
              Academic papers utilizing our data indicators should reference:
            </p>
            <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono text-[var(--empire-gold)] select-all leading-normal">
              MeowNet Open Data Initiative (v0.9.0). 2026. Retrieved from: https://github.com/SynthReaper/MeowNet.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
