// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/privacy/page.tsx — GDPR Privacy Policy
import type { Metadata } from 'next';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | MeowNet',
  description: 'MeowNet privacy policy — how we handle your data, GDPR rights, and location privacy.',
};

export default function PrivacyPage() {
  const shortPoints = [
    { icon: 'location_off', text: 'Option to fuzz location data to ~500m grid for colony privacy.' },
    { icon: 'photo_camera', text: 'EXIF/GPS stripped from all uploaded photos server-side.' },
    { icon: 'verified_user', text: 'AI analysis only runs with your explicit consent.' },
    { icon: 'delete_forever', text: 'You can delete your entire account and data in one click.' },
    { icon: 'cookie', text: 'We never sell your data or use advertising cookies.' },
  ];

  const sections = [
    {
      icon: 'groups',
      heading: '1. Who We Are',
      body: 'MeowNet is a community-run cat rescue coordination platform built for #hackthekitty 2026. We are the data controller for personal data submitted through this application.',
    },
    {
      icon: 'database',
      heading: '2. Data We Collect',
      body: 'We collect: your email address (for account authentication); an optional display name and avatar; cat sighting reports you voluntarily submit; event signup records; and usage activity (empire points, badge progress). For cat sightings, you have the choice between \'Area\' privacy (which fuzzes location coordinates to approximately a 500-metre grid for colony protection) and \'Exact\' privacy (which stores precise coordinates to assist in rescue/adoption operations).',
    },
    {
      icon: 'settings_suggest',
      heading: '3. How We Use Your Data',
      body: 'Legal basis: legitimate interest (Article 6(1)(f)) for platform operation; consent (Article 6(1)(a)) before AI breed analysis. We use your data to: display your cat sightings on the community map; coordinate TNR event signups; calculate Empire Points and leaderboard rankings; and send transactional emails (account confirmation, password reset) via Supabase Auth.',
    },
    {
      icon: 'my_location',
      heading: '4. Location Privacy',
      body: 'When you log a cat sighting, you can choose between \'Exact\' or \'Area\' location privacy. If you choose \'Area\' (the recommended setting), coordinates are fuzzed server-side using PostGIS ST_SnapToGrid(0.005°), equivalent to approximately 500 metres of imprecision, to protect vulnerable feral colonies from precise tracking. If you choose \'Exact\', precise coordinates are saved and displayed. Regardless of your choice, any EXIF metadata (including embedded GPS) is stripped from uploaded photos before storage using the sharp library.',
    },
    {
      icon: 'psychology',
      heading: '5. AI Features',
      body: 'Our breed estimation feature uses the HuggingFace Inference API. Before using this feature, we display an explicit consent gate. Your photo is processed by a third-party ML model. We do not permanently store your photo at any AI provider. AI results are never used for automated decision-making.',
    },
    {
      icon: 'share',
      heading: '6. Data Sharing',
      body: 'We use Supabase (EU region) for database and authentication. We do not sell your data. We do not share your data with advertisers. Cat sighting data (excluding your identity) is publicly visible on the community map.',
    },
    {
      icon: 'gavel',
      heading: '7. Your Rights (GDPR)',
      body: 'You have the right to: access your data (visit /profile); rectify your data (edit your profile); erase your data (use the "Delete My Account" button in /profile — this triggers a hard delete cascade within 30 days); restrict processing; data portability. To exercise any right, use the in-app tools or contact us. Details about moderation, flagging, and content removal can be found on our Community Rules & Regulations page.',
    },
    {
      icon: 'history',
      heading: '8. Data Retention',
      body: 'Cat audio uploads are purged after 30 days by an automated pg_cron job. Account data is retained until you request deletion. Anonymized aggregate statistics may be retained indefinitely.',
    },
    {
      icon: 'cookie',
      heading: '9. Cookies',
      body: 'We use only strictly necessary session cookies managed by Supabase Auth. We do not use advertising or analytics cookies.',
    },
    {
      icon: 'mail',
      heading: '10. Contact',
      body: 'For privacy questions, contact: privacy@meownet.app.',
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
              security
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--empire-cream)] mb-4">
              Privacy Policy
            </h1>
            <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl mx-auto">
              Last updated: June 2026 · Effective immediately · Built for #hackthekitty 2026
            </p>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient mb-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--life-teal)]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[var(--life-teal)] text-2xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <h2 className="font-display text-xl font-bold text-[var(--empire-cream)]">
                The Short Version (TL;DR)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shortPoints.map((p, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-[var(--life-teal)] text-lg mt-0.5">
                    {p.icon}
                  </span>
                  <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
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
                  <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
