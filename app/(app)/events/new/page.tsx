// app/(app)/events/new/page.tsx — Create TNR Event
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import CreateEventForm from '@/components/forms/CreateEventForm';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Host a TNR Event',
  description: 'Organize a Trap-Neuter-Return event in your community.',
};

export default async function NewEventPage() {
  const { userId: clerkUserId } = await auth();
  const supabase = await createServerClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!clerkUserId) {
    redirect('/auth/login');
  }

  if (!supabaseUser) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--empire-gold)] border-t-transparent animate-spin" />
        <h2 className="font-display text-xl font-bold text-[var(--empire-cream)]">Connecting secure session…</h2>
        <p className="font-body text-sm text-[var(--empire-cream)]/60 max-w-sm">
          Please wait while we synchronize your MeowNet credentials with our database.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <Link href="/events" className="inline-flex items-center gap-2 text-[var(--empire-gold)] hover:text-[#e6b020] font-body text-sm font-semibold transition-colors no-underline mb-4">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to TNR Events</span>
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-[var(--empire-cream)] mb-1">Host a TNR Operation</h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/60">
          Organizing a TNR operation earns you <strong className="text-[var(--empire-gold)]">+5 Empire Points</strong>. Ensure you have landowner/colony manager approval first.
        </p>
      </div>
      <CreateEventForm />
    </div>
  );
}
