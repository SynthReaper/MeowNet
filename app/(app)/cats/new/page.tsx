// app/(app)/cats/new/page.tsx — Log Cat page
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import LogCatForm from '@/components/forms/LogCatForm';

export const metadata: Metadata = {
  title: 'Log a Cat',
  description: 'Add a stray, adoptable, or TNR-needed cat to the MeowNet empire map.',
};

export default async function LogCatPage() {
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
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Log a Cat</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Every cat you log earns <strong style={{ color: 'var(--empire-gold)' }}>+10 Empire Points</strong>.
          Optional location fuzzing is available for feral colony safety.
        </p>
      </div>
      <LogCatForm />
    </div>
  );
}

