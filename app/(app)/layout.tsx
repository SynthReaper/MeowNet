// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/(app)/layout.tsx — Authenticated app shell with Navbar
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Navbar from '@/components/nav/Navbar';
import OnboardingTour from '@/components/ui/OnboardingTour';
import JudgeWelcomePopup from '@/components/ui/JudgeWelcomePopup';
import Footer from '@/components/nav/Footer';

// All pages in this group require auth — skip static prerender
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { template: '%s | MeowNet', default: 'MeowNet' },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-void)' }}>
      <Navbar />
      <OnboardingTour />
      <JudgeWelcomePopup />
      <main id="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
