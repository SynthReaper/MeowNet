// app/(app)/partners/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Corporate Partners & Sponsorships | MeowNet',
  description: 'View corporate matching gift programs, veterinary sponsors, and community clinic partnerships.',
};

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query verified partner organizations
  const { data: partners } = await supabase
    .from('partner_organizations' as never)
    .select('*')
    .eq('verified', true)
    .order('name') as unknown as { data: any[] | null };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Sponsorships &amp; Corporate Partners</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Collaborating with corporate matchers and veterinary clinics to sponsor localized food banks and medical operations.
        </p>
      </section>

      {/* Partners Grid */}
      <section className="flex flex-col gap-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider font-mono">Verified Corporate Allies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!partners || partners.length === 0 ? (
            <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-16 text-center text-xs text-gray-500 font-mono">
              No verified corporate partners listed. Corporate outreach is currently in progress.
            </div>
          ) : (
            partners.map((partner) => (
              <div
                key={partner.id}
                className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col justify-between gap-4 h-full"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-base font-bold text-[var(--empire-cream)]">{partner.name}</h4>
                    <span className="text-[9px] bg-[var(--life-teal)]/20 text-[var(--life-teal)] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                      {partner.partner_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">{partner.description}</p>
                </div>

                <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-1.5 text-[10px] font-mono text-gray-500">
                  <div className="flex justify-between">
                    <span>MATCHING RATIO:</span>
                    <span className="text-[var(--empire-gold)]">{partner.matching_ratio}x</span>
                  </div>
                  {partner.website_url && (
                    <a
                      href={partner.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--life-teal)] hover:underline self-end mt-2 flex items-center gap-0.5"
                    >
                      Visit Website <span className="material-symbols-outlined text-xs">arrow_outward</span>
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
