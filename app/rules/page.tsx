// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/rules/page.tsx — Community Rules & Regulations
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';

interface RuleSection {
  readonly id: string;
  readonly icon: string;
  readonly heading: string;
  readonly body: string;
}

const SECTIONS: readonly RuleSection[] = [
  {
    id: 'colony-safety',
    icon: 'my_location',
    heading: '1. Location & Colony Safety',
    body: 'Always protect vulnerable feral colonies. Avoid publishing exact locations unless coordinating active rescue, medical aid, or TNR efforts. Use "Area" privacy (fuzzed location) by default to keep colony locations safe from malicious actors.',
  },
  {
    id: 'data-accuracy',
    icon: 'verified',
    heading: '2. Data Accuracy',
    body: 'All logged sightings, health reports, and event registrations must be genuine. Do not log fake cat locations, dummy coordinate points, or duplicate images to game the system.',
  },
  {
    id: 'privacy',
    icon: 'shield_person',
    heading: '3. Respect & Privacy',
    body: 'Respect the privacy of fellow community members and property owners. Never post personal information, addresses, or private photos of individuals without explicit consent.',
  },
  {
    id: 'gamification',
    icon: 'stars',
    heading: '4. Gamification Integrity',
    body: 'Empire Points and weekly leaderboards exist to recognize genuine contributions. Any attempt to automate, exploit, or inflate points through scripts or spam logging is strictly prohibited.',
  },
  {
    id: 'moderation',
    icon: 'gavel',
    heading: '5. Moderation Policies',
    body: 'Our moderation team has the final say on content flags. Violating rules can result in message redaction, temporary limits, or permanent account ban. Redacted messages will show a notification to the author explaining the rule breach.',
  },
  {
    id: 'chat-conduct',
    icon: 'forum',
    heading: '6. Chat Conduct',
    body: 'Community rooms and DMs are spaces for rescue collaboration. Do not engage in hate speech, spamming, harassment, or verbal abuse. Users are strictly prohibited from editing or tampering with other users\' messages.',
  },
  {
    id: 'tnr-etiquette',
    icon: 'pets',
    heading: '7. TNR Event Etiquette',
    body: 'When participating in Trap-Neuter-Return events, adhere strictly to organizer instructions and colony safety guides. Wear appropriate gear and treat all cats humanely.',
  },
  {
    id: 'reporting',
    icon: 'info',
    heading: '8. Reporting Violations',
    body: 'If you witness a message or sighting violating these guidelines, use the in-app "Report" tool. Select the appropriate rule violation category to help our moderators review it quickly.',
  },
];

export default function RulesPage() {
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
                policy
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-4">
              Rules & Regulations
            </h1>
            <p className="font-body text-sm md:text-base text-[var(--text-secondary)] max-w-2xl mx-auto font-medium">
              Last updated: July 2026 · Ensuring a safe, supportive network for cat welfare.
            </p>
          </div>

          {/* Core Principle Card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient mb-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--empire-gold)]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 border-b border-[var(--bg-border)]/40 pb-4">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-3xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
              <div>
                <h2 className="font-display text-lg md:text-xl font-bold text-[var(--text-primary)]">
                  Our Golden Rule: Cats First
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">The primary operating directive for all MeowNet users</p>
              </div>
            </div>
            <p className="font-body text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-4xl font-medium">
              Everything we do on MeowNet is designed to protect and support street cats. Be honest in your data logging, be respectful in your communication, and always put the safety and welfare of local feline populations first.
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
                placeholder="Search community guidelines & rules..."
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
