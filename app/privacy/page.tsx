// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/privacy/page.tsx — GDPR Privacy Policy
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';

interface ShortPoint {
  readonly icon: string;
  readonly text: string;
}

interface PolicySection {
  readonly id: string;
  readonly icon: string;
  readonly heading: string;
  readonly body: string;
}

const SHORT_POINTS: readonly ShortPoint[] = [
  { icon: 'location_off', text: 'Option to fuzz location data to ~500m grid for colony privacy.' },
  { icon: 'photo_camera', text: 'EXIF/GPS stripped from all uploaded photos server-side.' },
  { icon: 'verified_user', text: 'AI analysis only runs with your explicit consent.' },
  { icon: 'delete_forever', text: 'You can delete your entire account and data in one click.' },
  { icon: 'cookie', text: 'We never sell your data or use advertising cookies.' },
];

const SECTIONS: readonly PolicySection[] = [
  {
    id: 'who-we-are',
    icon: 'groups',
    heading: '1. Who We Are',
    body: 'MeowNet is a community-run cat rescue coordination platform built for #hackthekitty 2026. We are the data controller for personal data submitted through this application.',
  },
  {
    id: 'data-we-collect',
    icon: 'database',
    heading: '2. Data We Collect',
    body: 'We collect: your email address (for account authentication); an optional display name and avatar; cat sighting reports you voluntarily submit; event signup records; and usage activity (empire points, badge progress). For cat sightings, you have the choice between \'Area\' privacy (which fuzzes location coordinates to approximately a 500-metre grid for colony protection) and \'Exact\' privacy (which stores precise coordinates to assist in rescue/adoption operations). Fully client-side encrypted private cat vital logs and custom metadata are stored locally in your browser and are never transmitted in plaintext.',
  },
  {
    id: 'use-of-data',
    icon: 'settings_suggest',
    heading: '3. How We Use Your Data',
    body: 'Legal basis: legitimate interest (Article 6(1)(f)) for platform operation; consent (Article 6(1)(a)) before AI breed analysis. We use your data to: display your cat sightings on the community map; coordinate TNR event signups; calculate Empire Points and leaderboard rankings; and send transactional emails (account confirmation, password reset) via Supabase Auth.',
  },
  {
    id: 'location-privacy',
    icon: 'my_location',
    heading: '4. Location Privacy',
    body: 'When you log a cat sighting, you can choose between \'Exact\' or \'Area\' location privacy. If you choose \'Area\' (the recommended setting), coordinates are fuzzed server-side using PostGIS ST_SnapToGrid(0.005°), equivalent to approximately 500 metres of imprecision, to protect vulnerable feral colonies from precise tracking. If you choose \'Exact\', precise coordinates are saved and displayed. Regardless of your choice, any EXIF metadata (including embedded GPS) is stripped from uploaded photos before storage using the sharp library.',
  },
  {
    id: 'ai-features',
    icon: 'psychology',
    heading: '5. AI Features',
    body: 'Our breed estimation feature uses the HuggingFace Inference API. Before using this feature, we display an explicit consent gate. Your photo is processed by a third-party ML model. We do not permanently store your photo at any AI provider. AI results are never used for automated decision-making. Model parameter requests in the AI Personal Helper proxy are restricted to a secure allowlist to prevent Server-Side Request Forgery.',
  },
  {
    id: 'data-sharing',
    icon: 'share',
    heading: '6. Data Sharing',
    body: 'We use Supabase (EU region) for database and authentication. We do not sell your data. We do not share your data with advertisers. Cat sighting data (excluding your identity) is publicly visible on the community map.',
  },
  {
    id: 'your-rights',
    icon: 'gavel',
    heading: '7. Your Rights (GDPR)',
    body: 'You have the right to: access your data (visit /profile); rectify your data (edit your profile); erase your data (use the "Delete My Account" button in /profile — this triggers a hard delete cascade within 30 days); restrict processing; data portability. To exercise any right, use the in-app tools or contact us. Details about moderation, flagging, and content removal can be found on our Community Rules & Regulations page.',
  },
  {
    id: 'data-retention',
    icon: 'history',
    heading: '8. Data Retention',
    body: 'Cat audio uploads are purged after 30 days by an automated pg_cron job. Account data is retained until you request deletion. Anonymized aggregate statistics may be retained indefinitely.',
  },
  {
    id: 'cookies',
    icon: 'cookie',
    heading: '9. Cookies',
    body: 'We use only strictly necessary session cookies managed by Supabase Auth. We do not use advertising or analytics cookies.',
  },
  {
    id: 'contact',
    icon: 'mail',
    heading: '10. Contact',
    body: 'For privacy questions, contact: synthreaperx@gmail.com.',
  },
];

export default function PrivacyPage() {
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
      <div className="absolute top-20 left-1/4 w-[350px] h-[350px] bg-[var(--life-teal)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[400px] right-1/4 w-[400px] h-[400px] bg-[var(--empire-gold)]/5 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex-grow py-12 px-4 md:px-8 relative z-10 font-sans">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-full shadow-ambient mb-6 group hover:border-[var(--empire-gold)] transition-colors duration-300">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-4xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="font-body text-sm md:text-base text-[var(--text-secondary)] max-w-2xl mx-auto font-medium">
              Last updated: July 2026 · GDPR Compliance Statement & Privacy Architecture
            </p>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient mb-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--life-teal)]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 border-b border-[var(--bg-border)]/40 pb-4">
              <span className="material-symbols-outlined text-[var(--life-teal)] text-3xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <div>
                <h2 className="font-display text-lg md:text-xl font-bold text-[var(--text-primary)]">
                  The Short Version (TL;DR)
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Core privacy safeguards built directly into the system architecture</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SHORT_POINTS.map((p) => (
                <div key={p.icon} className="flex gap-3 items-start bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/30 hover:border-[var(--life-teal)]/40 transition-all duration-300">
                  <div className="text-[var(--life-teal)] bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--bg-border)]/20 shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">
                      {p.icon}
                    </span>
                  </div>
                  <p className="font-body text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
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
                placeholder="Search privacy terms & clauses..."
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
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 ${isActive
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
