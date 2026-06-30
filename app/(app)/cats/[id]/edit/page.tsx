import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import EditCatForm from '@/components/forms/EditCatForm';

export const metadata: Metadata = {
  title: '✏️ Edit Sighting',
  description: 'Update the information or status of your cat sighting.',
};

export default async function EditCatPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect('/auth/login');
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const { data: cat, error } = await supabase.from('cats' as never).select('*').eq('id', id).single() as { data: any, error: any };
  if (error || !cat) {
    notFound();
  }

  // Authorize: Only the owner can edit
  if (cat.owner_id !== user.id) {
    redirect(`/cats/${id}`);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--empire-cream)]">✏️ Edit Sighting: {cat.name ?? 'Unnamed Cat'}</h1>
        <p className="font-body text-xs text-[var(--empire-cream)]/60 mt-1">
          Update the status, health notes, color, or location of this cat.
        </p>
      </div>
      <EditCatForm cat={cat} />
    </div>
  );
}
