// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/terms/page.tsx — Terms of Service
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';

interface TermsSection {
  readonly id: string;
  readonly icon: string;
  readonly heading: string;
  readonly body: string;
}

const SECTIONS: readonly TermsSection[] = [
  {
    id: 'acceptance',
    icon: 'verified',
    heading: '1. Acceptance of Terms',
    body: 'By creating an account on MeowNet, you agree to these Terms of Service. If you do not agree, do not use the platform.',
  },
  {
    id: 'purpose',
    icon: 'pets',
    heading: '2. Community Purpose',
    body: 'MeowNet exists to support community-driven cat rescue, Trap-Neuter-Return (TNR) coordination, and adoption. The platform must only be used for activities that benefit the welfare of cats and their communities.',
  },
  {
    id: 'acceptable-use',
    icon: 'gavel',
    heading: '3. Acceptable Use Policy',
    body: 'You agree not to: submit false or misleading cat sighting data; use the platform to harass or identify individuals or private feral cat colonies; attempt to de-anonymize location data; use automated scripts to artificially inflate Empire Points; upload content that is illegal, harmful, or violates third-party rights. All users must adhere to the specific guidelines outlined on our Community Rules & Regulations page. Users are strictly prohibited from editing or tampering with other users\' chat messages.',
  },
  {
    id: 'data-ownership',
    icon: 'database',
    heading: '4. Cat Data Ownership & Licensing',
    body: 'By submitting cat photos and sighting data, you grant MeowNet a non-exclusive, royalty-free licence to display this data on the community platform. You retain ownership of your content. Cat sighting reports are public and contribute to the community knowledge graph. Sighting locations are fuzzed to a ~500m grid under \'Area\' privacy or stored precisely under \'Exact\' privacy. Image metadata (EXIF/GPS tags) is stripped server-side before storage.',
  },
  {
    id: 'gamification',
    icon: 'stars',
    heading: '5. Empire Points & Gamification',
    body: 'Empire Points are a community recognition system with no monetary value. They cannot be transferred, sold, or redeemed. Points are awarded exclusively via a secure RPC server gate. We reserve the right to adjust or reset points in response to abuse.',
  },
  {
    id: 'ai-disclaimer',
    icon: 'psychology',
    heading: '6. AI-Generated Content Disclaimer',
    body: 'AI breed estimates and meow translation classifications are provided for informational purposes only and do not constitute veterinary advice. We disclaim all liability for decisions made based on AI outputs. Always consult a qualified veterinarian for medical decisions.',
  },
  {
    id: 'termination',
    icon: 'no_accounts',
    heading: '7. Account Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time via your user profile settings page which triggers GDPR Article 17 erasure cascade.',
  },
  {
    id: 'disclaimer',
    icon: 'warning',
    heading: '8. Disclaimers',
    body: 'MeowNet is provided "as is" for community and educational use. We make no warranties about uptime, accuracy of cat data, or AI results. We are not liable for decisions made based on information from this platform.',
  },
  {
    id: 'changes',
    icon: 'update',
    heading: '9. Changes to Terms',
    body: 'We may update these terms. Continued use after changes constitutes acceptance. We will notify users of material changes via email or system notices.',
  },
];

export default function TermsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('');

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const query = searchQuery.toLowerCase();
    return SECTIONS.filter(
      (s) => s.heading.toLowerCase().includes(query) || s.body.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 120,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-void)]">
      <Navbar />

      {/* Decorative Orbs */}
      <div className="absolute top-20 right-1/4 w-[350px] h-[350px] bg-[var(--empire-gold)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[400px] left-1/4 w-[400px] h-[400px] bg-[var(--life-teal)]/5 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex-grow py-12 px-4 md:px-8 relative z-10 font-sans">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-full shadow-ambient mb-6 group hover:border-[var(--empire-gold)] transition-colors duration-300">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-4xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                gavel
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="font-body text-sm md:text-base text-[var(--text-secondary)] max-w-2xl mx-auto font-medium">
              Last updated: July 2026 · Standard Terms & Community Service Agreement
            </p>
          </div>

          {/* Quick Agreement Card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient mb-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--empire-gold)]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 border-b border-[var(--bg-border)]/40 pb-4">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-3xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                menu_book
              </span>
              <div>
                <h2 className="font-display text-lg md:text-xl font-bold text-[var(--text-primary)]">
                  Community Agreement Summary
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Please review the highlights of this agreement before using our platform</p>
              </div>
            </div>
            <p className="font-body text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-4xl font-medium">
              By using MeowNet, you join a community dedicated to cat welfare. You agree to submit truthful sighting data, respect the safety of cat colonies, and behave ethically. Empire Points are purely gamified and hold no monetary value. You retain copyright over your uploads, but grant us a license to show them on MeowNet.
            </p>
          </div>

          {/* Interactive Search Bar */}
          <div className="mb-10 max-w-lg mx-auto">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms, agreements, & legal disclaimers..."
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--bg-border)] rounded-xl focus:outline-none focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] shadow-sm text-sm font-medium transition-all duration-200 placeholder-[var(--text-muted)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-4 shadow-ambient">
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)] border-b border-[var(--bg-border)]/40 pb-3 mb-3">
                  Document Sections
                </h3>
                <nav className="space-y-1">
                  {SECTIONS.map((s) => {
                    const isActive = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleLinkClick(s.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 ${
                          isActive
                            ? 'bg-[var(--bg-elevated)] text-[var(--empire-gold)] shadow-sm border-l-2 border-[var(--empire-gold)] pl-2.5'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {s.icon}
                        </span>
                        <span className="truncate">{s.heading.substring(3)}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3 space-y-6">
              {filteredSections.length > 0 ? (
                filteredSections.map((s) => (
                  <div
                    key={s.heading}
                    id={s.id}
                    className="bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient flex flex-col sm:flex-row gap-6 hover:shadow-active transition-all duration-300 scroll-mt-24 group relative overflow-hidden"
                  >
                    {/* Hover Active Highlight Strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--empire-gold)] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

                    <div className="bg-[var(--bg-elevated)] text-[var(--empire-gold)] p-3.5 rounded-2xl h-fit w-fit border border-[var(--bg-border)]/35 shadow-sm group-hover:bg-[var(--bg-surface)] group-hover:border-[var(--empire-gold)]/40 transition-colors duration-300 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">
                        {s.icon}
                      </span>
                    </div>
                    <div className="space-y-3 flex-grow">
                      <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
                        {s.heading}
                      </h3>
                      <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] shadow-ambient">
                  <span className="material-symbols-outlined text-5xl text-[var(--text-muted)] mb-4">
                    search_off
                  </span>
                  <p className="font-display text-lg font-bold text-[var(--text-primary)]">
                    No results found
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Try searching for different keywords or clear the filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
