// app/auth/onboarding/page.tsx — Custom MeowNet Onboarding Page
// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OnboardingClient from './OnboardingClient';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Onboarding | MeowNet',
  description: 'Complete your MeowNet profile and get started in the Cat Empire.',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { userId: clerkUserId } = await auth();
  const supabase = await createServerClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!clerkUserId && !supabaseUser) {
    redirect('/auth/login');
  }

  return <OnboardingClient />;
}
