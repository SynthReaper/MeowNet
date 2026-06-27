// app/rules/page.tsx — Community Rules & Regulations
import type { Metadata } from 'next';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';

export const metadata: Metadata = {
  title: 'Community Rules & Regulations | MeowNet',
  description: 'MeowNet community rules and guidelines — fostering safe, respectful, and cooperative cat rescue environments.',
};

export default function RulesPage() {
  const sections = [
    {
      icon: 'my_location',
      heading: '1. Location & Colony Safety',
      body: 'Always protect vulnerable feral colonies. Avoid publishing exact locations unless coordinating active rescue, medical aid, or TNR efforts. Use "Area" privacy (fuzzed location) by default to keep colony locations safe from malicious actors.',
    },
    {
      icon: 'verified',
      heading: '2. Data Accuracy',
      body: 'All logged sightings, health reports, and event registrations must be genuine. Do not log fake cat locations, dummy coordinate points, or duplicate images to game the system.',
    },
    {
      icon: 'shield_person',
      heading: '3. Respect & Privacy',
      body: 'Respect the privacy of fellow community members and property owners. Never post personal information, addresses, or private photos of individuals without explicit consent.',
    },
    {
      icon: 'stars',
      heading: '4. Gamification Integrity',
      body: 'Empire Points and weekly leaderboards exist to recognize genuine contributions. Any attempt to automate, exploit, or inflate points through scripts or spam logging is strictly prohibited.',
    },
    {
      icon: 'gavel',
      heading: '5. Moderation Policies',
      body: 'Our moderation team has the final say on content flags. Violating rules can result in message redaction, temporary limits, or permanent account ban. Redacted messages will show a notification to the author explaining the rule breach.',
    },
    {
      icon: 'forum',
      heading: '6. Chat Conduct',
      body: 'Community rooms and DMs are spaces for rescue collaboration. Do not engage in hate speech, spamming, harassment, or verbal abuse. Users are strictly prohibited from editing or tampering with other users\' messages.',
    },
    {
      icon: 'pets',
      heading: '7. TNR Event Etiquette',
      body: 'When participating in Trap-Neuter-Return events, adhere strictly to organizer instructions and colony safety guides. Wear appropriate gear and treat all cats humanely.',
    },
    {
      icon: 'info',
      heading: '8. Reporting Violations',
      body: 'If you witness a message or sighting violating these guidelines, use the in-app "Report" tool. Select the appropriate rule violation category to help our moderators review it quickly.',
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
              policy
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--empire-cream)] mb-4">
              Community Rules & Regulations
            </h1>
            <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl mx-auto">
              Last updated: June 2026 · Ensuring a safe, supportive network for cat welfare.
            </p>
          </div>

          {/* Core Principle Card */}
          <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient mb-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--empire-gold)]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-2xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
              <h2 className="font-display text-xl font-bold text-[var(--empire-cream)]">
                Our Golden Rule: Cats First
              </h2>
            </div>
            <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              Everything we do on MeowNet is designed to protect and support street cats. Be honest in your data logging, be respectful in your communication, and always put the safety and welfare of local feline populations first.
            </p>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
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
                  <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
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
