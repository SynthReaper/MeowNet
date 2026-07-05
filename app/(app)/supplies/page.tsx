// app/(app)/supplies/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InventoryGrid from '@/components/supplies/InventoryGrid';

export const metadata: Metadata = {
  title: 'Colony Supply Vault',
  description: 'Request food, medical supplements, trapping equipment, and colony shelter gear.',
};

export const dynamic = 'force-dynamic';

export default async function SuppliesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query supplies
  const { data: supplies } = await supabase
    .from('supplies' as never)
    .select('*')
    .order('name') as unknown as { data: any[] | null };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Colony Supply Vault</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Request dietary packages, medical packs, trapping materials, and winterized colony shelter structures to assist strays in your regional quadrant.
        </p>
      </section>

      <InventoryGrid initialSupplies={supplies ?? []} />
    </div>
  );
}
