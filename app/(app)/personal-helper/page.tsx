// app/(app)/personal-helper/page.tsx
// Routing page for the full-screen Personal AI Helper console

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HelperPage from '@/components/personal-care/HelperPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Personal Helper',
  description: 'Chat with your secure, private assistant powered by your own API key.',
};

export default async function PersonalHelperPageRoute() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/auth/login');
  }

  return <HelperPage />;
}
