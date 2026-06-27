// app/(app)/safety/page.tsx — Safety & Operations Watch Portal
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import SafetyQueriesClient from '@/app/(app)/safety/SafetyQueriesClient';

export const metadata: Metadata = {
  title: 'Safety Watch',
  description: 'Monitor feline safety conditions, check weather alerts, and access colony operation guides on MeowNet.',
};

export default async function SafetyWatchPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[var(--bg-void)]" />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 50% 30%, #0c4a3a 0%, transparent 60%)' }} />

        {/* Lock Icon */}
        <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-[var(--life-teal)]/15 border border-[var(--life-teal)]/30 flex items-center justify-center shadow-[0_0_40px_rgba(0,200,180,0.15)]">
            <span className="material-symbols-outlined text-4xl text-[var(--life-teal)]" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-[var(--empire-cream)] mb-2">
              Safety Watch
            </h1>
            <p className="font-body text-base text-[var(--empire-cream)]/60 leading-relaxed">
              This section is available to registered MeowNet volunteers. Sign in or create a free account to access feline safety alerts, weather boards, and colony operation guides.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/auth/login"
              className="flex-1 bg-[var(--life-teal)] hover:opacity-90 text-white font-body font-bold text-sm px-6 py-3.5 rounded-xl no-underline flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="flex-1 border-2 border-[var(--empire-gold)] text-[var(--empire-gold)] hover:bg-[var(--empire-gold)]/10 font-body font-bold text-sm px-6 py-3.5 rounded-xl no-underline flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Join Free
            </Link>
          </div>
          <p className="font-body text-xs text-[var(--empire-cream)]/30">
            Free to join · No credit card required · Protect feline lives
          </p>
        </div>
      </div>
    );
  }

  // Fetch this volunteer's queries
  const { data: userQueries } = await supabase
    .from('moderator_queries' as never)
    .select('id, message, status, response, created_at')
    .eq('volunteer_id', user.id)
    .order('created_at', { ascending: false }) as any;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-10 py-16 flex flex-col gap-10">
      {/* Portal Header */}
      <section className="flex flex-col gap-3 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#ffdcc5]/30 dark:bg-[#ffdcc5]/5 text-[var(--empire-gold)] rounded-xl font-body text-xs font-bold w-fit border border-[var(--bg-border)]/20">
          <span className="material-symbols-outlined text-sm animate-pulse">security</span>
          <span>Operational Hub</span>
        </div>
        <h1 className="font-display text-4xl font-extrabold text-[var(--empire-cream)]">
          Safety & Operations Watch
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 leading-relaxed">
          Welcome to MeowNet's central safety portal. Protect community cat colonies by monitoring local climate safety indices and reviewing neighborhood logs.
        </p>
      </section>

      {/* Main Interactive Options Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Weather Board Portal Card */}
        <div className="bg-white rounded-3xl p-8 border border-[var(--bg-border)] shadow-ambient flex flex-col justify-between group hover:shadow-[var(--shadow-active)] transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden min-h-[320px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-3xl font-normal">thermostat</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--empire-cream)] group-hover:text-[var(--empire-gold)] transition-colors">
                Feline Weather Board
              </h2>
              <p className="font-body text-sm text-[var(--empire-cream)]/60 mt-2 leading-relaxed">
                Monitor live outdoor temperatures across our 5 primary neighborhoods. Review community comfort indices, active system cold alerts, and shelter safety instructions.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--bg-border)]/20 mt-6">
            <Link 
              href="/weather" 
              className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-6 py-3.5 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 no-underline"
            >
              <span>Open Weather Board</span>
              <span className="material-symbols-outlined text-sm">thermostat</span>
            </Link>
          </div>
        </div>

        {/* Reports Feed Portal Card */}
        <div className="bg-white rounded-3xl p-8 border border-[var(--bg-border)] shadow-ambient flex flex-col justify-between group hover:shadow-[var(--shadow-active)] transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden min-h-[320px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--life-teal)]/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--life-teal)]/10 text-[var(--life-teal)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-3xl font-normal">feed</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--empire-cream)] group-hover:text-[var(--empire-gold)] transition-colors">
                Reports & Activity Logs
              </h2>
              <p className="font-body text-sm text-[var(--empire-cream)]/60 mt-2 leading-relaxed">
                Browse our consolidated feed of street sightings, local weather observations, and live bulletins. Stay updated on the latest colony counts and TNR coordination events.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--bg-border)]/20 mt-6">
            <Link 
              href="/reports" 
              className="bg-[var(--life-teal)] text-white hover:opacity-90 px-6 py-3.5 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 no-underline"
            >
              <span>Open Reports Board</span>
              <span className="material-symbols-outlined text-sm">feed</span>
            </Link>
          </div>
        </div>

      </section>

      {/* ── Interactive Volunteer Support Desk (New) ── */}
      <SafetyQueriesClient initialQueries={userQueries ?? []} userId={user.id} />

      {/* Emergency Guide & Quick Information Section */}
      <section className="bg-white p-6 md:p-8 rounded-3xl border border-[var(--bg-border)] shadow-ambient">
        <h3 className="font-display text-lg text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--empire-gold)]">health_and_safety</span>
          <span>Emergency Feline Care Guidelines</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <h4 className="font-body text-xs font-bold text-[var(--empire-cream)]">1. Provide Insulated Shelters</h4>
            <p className="font-body text-[11px] text-[var(--empire-cream)]/60 leading-relaxed">
              Winter shelters should be tightly constructed with a small opening. Pack with straw (which sheds water) instead of blankets (which absorb water and freeze).
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-body text-xs font-bold text-[var(--empire-cream)]">2. High-Calorie Winter Feeds</h4>
            <p className="font-body text-[11px] text-[var(--empire-cream)]/60 leading-relaxed">
              Stray cats require extra calories during cold waves to maintain body heat. Switch to high-energy wet food or keep dry kibble available in dry feeder ports.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-body text-xs font-bold text-[var(--empire-cream)]">3. Check Car Engines</h4>
            <p className="font-body text-[11px] text-[var(--empire-cream)]/60 leading-relaxed">
              Feral and stray cats love sleeping on warm tires and engine blocks. Always tap hard on your hood and check your wheel wells before starting your engine.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
