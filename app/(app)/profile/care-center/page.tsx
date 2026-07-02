// app/(app)/profile/care-center/page.tsx
// Routing page for the client-side encrypted Personal Care Center

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CareCenterWrapper from '@/components/personal-care/CareCenterWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Personal Care Center',
  description: 'Private, client-side encrypted cat vitals, medication calendar, and activity logs.',
};

export default async function CareCenterPage() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">
          Personal Care Center
        </h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          A fully private workspace to track your cats vitals, schedules, and daily journals. All data is client-side encrypted and inaccessible to servers or administrators.
        </p>
      </section>

      <CareCenterWrapper />
    </div>
  );
}
