// app/terms/page.tsx — Terms of Service
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | MeowNet',
  description: 'MeowNet terms of service — acceptable use, cat data ownership, and community rules.',
};

export default function TermsPage() {
  const sections = [
    {
      icon: 'verified',
      heading: '1. Acceptance of Terms',
      body: 'By creating an account on MeowNet, you agree to these Terms of Service. If you do not agree, do not use the platform.',
    },
    {
      icon: 'pets',
      heading: '2. Community Purpose',
      body: 'MeowNet exists to support community-driven cat rescue, Trap-Neuter-Return (TNR) coordination, and adoption. The platform must only be used for activities that benefit the welfare of cats and their communities.',
    },
    {
      icon: 'gavel',
      heading: '3. Acceptable Use Policy',
      body: 'You agree not to: submit false or misleading cat sighting data; use the platform to harass or identify individuals or private feral cat colonies; attempt to de-anonymize location data; use automated scripts to artificially inflate Empire Points; upload content that is illegal, harmful, or violates third-party rights. All users must adhere to the specific guidelines outlined on our Community Rules & Regulations page.',
    },
    {
      icon: 'database',
      heading: '4. Cat Data Ownership & Licensing',
      body: 'By submitting cat photos and sighting data, you grant MeowNet a non-exclusive, royalty-free licence to display this data on the community platform. You retain ownership of your content. Cat sighting reports are public and contribute to the community knowledge graph. Sighting locations are displayed publicly based on your chosen privacy option (fuzzed to a ~500m grid for \'Area\' privacy, or exact coordinates for \'Exact\' privacy).',
    },
    {
      icon: 'stars',
      heading: '5. Empire Points & Gamification',
      body: 'Empire Points are a community recognition system with no monetary value. They cannot be transferred, sold, or redeemed. We reserve the right to adjust or reset points in response to abuse.',
    },
    {
      icon: 'psychology',
      heading: '6. AI-Generated Content Disclaimer',
      body: 'AI breed estimates are provided for informational purposes only and do not constitute veterinary advice. We disclaim all liability for decisions made based on AI outputs. Always consult a qualified veterinarian for medical decisions.',
    },
    {
      icon: 'no_accounts',
      heading: '7. Account Termination',
      body: 'We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time via your user profile settings page.',
    },
    {
      icon: 'warning',
      heading: '8. Disclaimers',
      body: 'MeowNet is provided "as is" for community and educational use. We make no warranties about uptime, accuracy of cat data, or AI results. We are not liable for decisions made based on information from this platform.',
    },
    {
      icon: 'update',
      heading: '9. Changes to Terms',
      body: 'We may update these terms. Continued use after changes constitutes acceptance. We will notify users of material changes via email or system notices.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-void)]">
      <Navbar />
      
      <main className="flex-grow paw-pattern py-12 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="material-symbols-outlined text-[var(--empire-gold)] text-5xl mb-4 icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
              gavel
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--empire-cream)] mb-4">
              Terms of Service
            </h1>
            <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl mx-auto">
              Last updated: June 2026 · Built for #hackthekitty 2026
            </p>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient mb-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--empire-gold)]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-2xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                menu_book
              </span>
              <h2 className="font-display text-xl font-bold text-[var(--empire-cream)]">
                Community Agreement Summary
              </h2>
            </div>
            <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              By using MeowNet, you join a community dedicated to cat welfare. You agree to submit truthful sighting data, respect the safety of cat colonies, and behave ethically. Empire Points are purely gamified and hold no monetary value. You retain copyright over your uploads, but grant us a license to show them on MeowNet.
            </p>
          </div>

          {/* Policy Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((s, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-6 border border-[var(--bg-border)] shadow-ambient flex gap-4 hover:shadow-active transition-all duration-300"
              >
                <div className="bg-[var(--bg-elevated)] text-[var(--empire-gold)] p-3 rounded-xl h-fit">
                  <span className="material-symbols-outlined text-2xl">
                    {s.icon}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-bold text-[var(--empire-cream)]">
                    {s.heading}
                  </h3>
                  <p className="font-body text-xs text-[var(--empire-cream)]/75 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--bg-border)]/40 pt-4 text-xs text-[var(--empire-cream)]/40 font-semibold uppercase tracking-wider">
            Last updated: June 2026 · Built for #hackthekitty 2026
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
