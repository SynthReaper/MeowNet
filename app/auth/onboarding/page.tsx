// app/auth/onboarding/page.tsx — Custom MeowNet Onboarding Page
// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OnboardingClient from './OnboardingClient';

export const metadata: Metadata = {
  title: 'Onboarding | MeowNet',
  description: 'Complete your MeowNet profile and get started in the Cat Empire.',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/auth/login');
  }

  return <OnboardingClient />;
}
