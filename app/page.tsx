// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/page.tsx — Landing page with Cozy Community theme & Interactive Cozy Cat

'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';
import { getPinnedNotice, type Notice } from '@/lib/actions/notices';

interface LandingPageCat {
  id: string;
  name: string;
  photo_url: string | null;
  status: string;
  breed_estimate: string | null;
  age_estimate?: string | null;
  health_notes?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  profiles: { display_name: string | null } | null;
}

const InteractiveCat = dynamic(() => import('@/components/ui/InteractiveCat'), { ssr: false });

const FALLBACK_CATS = [
  {
    id: 'fb-1',
    name: 'Marmalade',
    photo_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80',
    status: 'stray',
    breed_estimate: 'Orange Tabby',
    created_at: new Date().toISOString(),
    profiles: { display_name: 'AlexJ' }
  },
  {
    id: 'fb-2',
    name: 'Unknown Tuxedo',
    photo_url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80',
    status: 'stray',
    breed_estimate: 'Domestic Shorthair',
    created_at: new Date().toISOString(),
    profiles: { display_name: 'SarahK' }
  },
  {
    id: 'fb-3',
    name: 'Patches',
    photo_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&q=80',
    status: 'tnr',
    breed_estimate: 'Calico',
    created_at: new Date().toISOString(),
    profiles: { display_name: 'MikeR' }
  }
];

const FALLBACK_STORIES: LandingPageCat[] = [
  {
    id: 'fbs-1',
    name: "Barnaby's Big Break",
    photo_url: 'https://images.unsplash.com/photo-1533749047139-189de3cf06d3?auto=format&fit=crop&w=400&q=80',
    status: 'adopted',
    breed_estimate: 'Domestic Shorthair',
    profiles: { display_name: 'TeamNorth' },
    description: "Found shivering near a dumpster in the industrial district, Barnaby was safely trapped by Team North. After weeks of rehabilitation, he's now a beloved family lap cat."
  },
  {
    id: 'fbs-2',
    name: 'The Whisker Woods Project',
    photo_url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=400&q=80',
    status: 'tnr',
    breed_estimate: 'Domestic Shorthair',
    profiles: { display_name: 'WoodlandGroup' },
    description: 'How a small neighborhood coalition safely trapped, neutered, and returned over 50 cats in a single weekend, stabilizing the entire local colony population.'
  },
  {
    id: 'fbs-3',
    name: 'Oliver Finds a Garden',
    photo_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
    status: 'adopted',
    breed_estimate: 'Domestic Shorthair',
    profiles: { display_name: 'GardenCaretaker' },
    description: 'A feral kitten found in a construction site who was socialized by dedicated caretakers. He now helps oversee the community greenhouse garden.'
  }
];

interface TnrEvent {
  id: string;
  title: string;
  description: string | null;
  event_time: string;
  capacity: number;
  status: string;
}

const CatFace = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" className="text-[var(--empire-gold)] fill-current stroke-current">
    {/* Ears */}
    <path
      d="M20,40 L10,10 L45,30 Z"
      className="animate-ear-left"
      style={{ fill: 'var(--empire-gold)', stroke: 'var(--empire-gold)', strokeWidth: 2, strokeLinejoin: 'round' }}
    />
    <path
      d="M100,40 L110,10 L75,30 Z"
      className="animate-ear-right"
      style={{ fill: 'var(--empire-gold)', stroke: 'var(--empire-gold)', strokeWidth: 2, strokeLinejoin: 'round' }}
    />

    {/* Head Outline */}
    <path
      d="M20,40 Q60,50 100,40 Q115,70 100,85 Q60,95 20,85 Q5,70 20,40 Z"
      style={{ fill: 'var(--bg-surface)', stroke: 'var(--empire-gold)', strokeWidth: 4, strokeLinejoin: 'round' }}
    />

    {/* Eyes */}
    <ellipse cx="40" cy="55" rx="6" ry="6" className="animate-cat-blink" style={{ fill: 'var(--empire-gold)' }} />
    <ellipse cx="80" cy="55" rx="6" ry="6" className="animate-cat-blink" style={{ fill: 'var(--empire-gold)' }} />

    {/* Nose */}
    <polygon points="60,65 56,60 64,60" style={{ fill: 'var(--empire-gold)' }} />

    {/* Mouth */}
    <path d="M56,70 Q60,73 60,70 Q60,73 64,70" style={{ fill: 'none', stroke: 'var(--empire-gold)', strokeWidth: 2, strokeLinecap: 'round' }} />

    {/* Whiskers */}
    <g className="animate-whisker-left">
      <line x1="25" y1="62" x2="5" y2="60" style={{ stroke: 'var(--bg-border)', strokeWidth: 2, strokeLinecap: 'round' }} />
      <line x1="25" y1="67" x2="3" y2="67" style={{ stroke: 'var(--bg-border)', strokeWidth: 2, strokeLinecap: 'round' }} />
      <line x1="25" y1="72" x2="6" y2="74" style={{ stroke: 'var(--bg-border)', strokeWidth: 2, strokeLinecap: 'round' }} />
    </g>
    <g className="animate-whisker-right">
      <line x1="95" y1="62" x2="115" y2="60" style={{ stroke: 'var(--bg-border)', strokeWidth: 2, strokeLinecap: 'round' }} />
      <line x1="95" y1="67" x2="117" y2="67" style={{ stroke: 'var(--bg-border)', strokeWidth: 2, strokeLinecap: 'round' }} />
      <line x1="95" y1="72" x2="114" y2="74" style={{ stroke: 'var(--bg-border)', strokeWidth: 2, strokeLinecap: 'round' }} />
    </g>
  </svg>
);

const LOADER_PHRASES = [
  "Herding stray kittens...",
  "Distributing premium catnip...",
  "Polishing empire point badges...",
  "Warming up colony thermal shelters...",
  "Syncing whisker coordinates...",
  "Grooming fluffy tails...",
  "Purr-fecting the maps...",
  "Calculating nap durations..."
];

function CatLoader() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % LOADER_PHRASES.length);
    }, 600);

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2200);

    const unmountTimer = setTimeout(() => {
      setMounted(false);
    }, 2850);

    return () => {
      clearInterval(phraseInterval);
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className={`cat-loader-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <div className="flex flex-col items-center gap-6">
        <CatFace />

        {/* Paws loader */}
        <div className="flex gap-3 text-2xl text-[var(--empire-gold)] mt-2">
          <span className="animate-paw-1">🐾</span>
          <span className="animate-paw-2">🐾</span>
          <span className="animate-paw-3">🐾</span>
          <span className="animate-paw-4">🐾</span>
        </div>

        {/* Loading text */}
        <p className="font-display text-sm font-semibold tracking-wider text-[var(--empire-cream)] uppercase animate-text-cycle min-h-[20px]">
          {LOADER_PHRASES[phraseIdx]}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [events, setEvents] = useState<TnrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntroLoader, setShowIntroLoader] = useState(false);
  const [catsHelped, setCatsHelped] = useState(12450);
  const [activeColonies, setActiveColonies] = useState(3241);
  const [recentCats, setRecentCats] = useState<LandingPageCat[]>([]);
  const [successStories, setSuccessStories] = useState<LandingPageCat[]>([]);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [activeAlert, setActiveAlert] = useState<{
    message: string;
    type: 'warning' | 'caution' | 'info';
    neighborhood?: string;
  }>({
    message: 'Cold Weather Warning: Winter shelters urgently needed in the Northside District.',
    type: 'warning'
  });
  const [pinnedNotice, setPinnedNotice] = useState<Notice | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('tnr_events' as never)
          .select('id, title, description, event_time, capacity, status')
          .eq('status', 'open')
          .gte('event_time', new Date().toISOString())
          .order('event_time', { ascending: true })
          .limit(4);

        if (data) {
          setEvents(data as TnrEvent[]);
        }
      } catch (err) {
        console.error('Error fetching events from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchCatsCount() {
      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from('cats' as never)
          .select('*', { count: 'exact', head: true });
        if (count !== null && !error) {
          setCatsHelped(12450 + count);
          setActiveColonies(3240 + count);
        }
      } catch (err) {
        console.error('Error fetching cats count:', err);
      }
    }

    async function fetchLiveAlert() {
      // Build weather URL — try browser geolocation first, fall back to random cat shelter
      async function buildWeatherUrl(): Promise<{ url: string; userLocated: boolean }> {
        if (!('geolocation' in navigator)) {
          return { url: '/api/weather', userLocated: false };
        }
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              // Reverse-geocode city with a free nominatim call (server-side nominatim is fine client-side for display)
              const cityParam = encodeURIComponent('Your Location');
              resolve({
                url: `/api/weather?lat=${latitude.toFixed(4)}&lng=${longitude.toFixed(4)}&city=${cityParam}`,
                userLocated: true,
              });
            },
            () => resolve({ url: '/api/weather', userLocated: false }),
            { timeout: 4000 }
          );
        });
      }

      try {
        const { url, userLocated } = await buildWeatherUrl();

        const res = await fetch(url);
        let temp = 65;
        let location = 'Global Cat Shelter';
        const userLoc = userLocated;

        if (res.ok) {
          const data = await res.json();
          temp = Math.round(data.temp ?? 65);
          location = data.location ?? 'Global Cat Shelter';
        } else {
          console.warn('Weather API returned error status. Using default fallback weather.');
        }

        setTemperature(temp);

        // Check for volunteer field reports first
        const stored = localStorage.getItem('meownet_weather_reports');
        if (stored) {
          const reports = JSON.parse(stored);
          if (reports.length > 0) {
            const latest = reports[0];
            setActiveAlert({
              message: `Field Report from ${latest.neighborhood}: "${latest.condition} - ${latest.notes}"`,
              type: temp < 45 ? 'warning' : 'info',
              neighborhood: latest.neighborhood,
            });
            return;
          }
        }

        // Build alert based on live temperature + location
        const prefix = userLoc ? `📍 ${location}` : `🌍 ${location}`;
        if (temp < 35) {
          setActiveAlert({
            message: `Hazardous Cold at ${prefix}: ${temp}°F — Emergency heated shelters urgently needed for community cats.`,
            type: 'warning',
            neighborhood: location,
          });
        } else if (temp < 45) {
          setActiveAlert({
            message: `Cold Alert at ${prefix}: ${temp}°F — Insulated cat shelters and extra feeding needed.`,
            type: 'warning',
            neighborhood: location,
          });
        } else if (temp < 55) {
          setActiveAlert({
            message: `Advisory at ${prefix}: ${temp}°F — Cool conditions. Keep feeding stations dry and sheltered.`,
            type: 'caution',
            neighborhood: location,
          });
        } else {
          setActiveAlert({
            message: `Status OK at ${prefix}: ${temp}°F — Comfortable conditions for community cats. Stay pawsome!`,
            type: 'info',
            neighborhood: location,
          });
        }
      } catch (err) {
        console.warn('Failed to fetch live weather details: fallback used.', err);
        setTemperature(65);
        setActiveAlert({
          message: `Status OK at 🌍 Global Cat Shelter: 65°F — Comfortable conditions for community cats. Stay pawsome!`,
          type: 'info',
          neighborhood: 'Global Cat Shelter',
        });
      }
    }

    async function fetchRecentSightings() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('cats' as never)
          .select('id, name, photo_url, status, breed_estimate, created_at, profiles:profiles(display_name)')
          .order('created_at', { ascending: false })
          .limit(3) as unknown as { data: LandingPageCat[] | null; error: unknown };
        if (data && !error && data.length > 0) {
          setRecentCats(data);
        }
      } catch (err) {
        console.error('Error fetching recent cats:', err);
      }
    }

    async function fetchSuccessStories() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('cats' as never)
          .select('id, name, photo_url, status, breed_estimate, age_estimate, health_notes, updated_at, profiles:profiles(display_name)')
          .eq('status', 'adopted')
          .order('updated_at', { ascending: false })
          .limit(3) as unknown as { data: LandingPageCat[] | null; error: unknown };
        if (data && !error && data.length > 0) {
          setSuccessStories(data);
        }
      } catch (err) {
        console.error('Error fetching success stories:', err);
      }
    }

    async function fetchPinnedNotice() {
      try {
        const res = await getPinnedNotice();
        if (res.success && res.data) {
          setPinnedNotice(res.data);
        }
      } catch (err) {
        console.error('Error fetching pinned notice:', err);
      }
    }

    fetchEvents();
    fetchCatsCount();
    fetchLiveAlert();
    fetchRecentSightings();
    fetchSuccessStories();
    fetchPinnedNotice();

    const hasLoaded = sessionStorage.getItem('meownet_loaded');
    if (!hasLoaded) {
      sessionStorage.setItem('meownet_loaded', 'true');
      setShowIntroLoader(true);
    }
  }, []);

  const featuredEvent = events[0];
  const upcomingEvents = events.slice(1);

  return (
    <>
      {showIntroLoader && <CatLoader />}
      <Navbar />

      <main className="flex-grow paw-pattern min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-20 pb-12 px-4 md:px-12 max-w-7xl mx-auto overflow-hidden reveal-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 reveal-fade-in delay-100">
              {pinnedNotice ? (
                <Link
                  href="/notices"
                  className="inline-flex items-center gap-2.5 p-1.5 pr-4 bg-white/95 dark:bg-[var(--bg-surface)]/95 rounded-full text-xs shadow-sm border border-[var(--bg-border)]/40 hover:border-[var(--empire-gold)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group no-underline w-fit"
                >
                  <span className="bg-[var(--empire-gold)] text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
                    {pinnedNotice.is_broadcast ? pinnedNotice.broadcast_type : 'Notice'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-body font-semibold text-[var(--text-primary)] group-hover:text-[var(--empire-gold)] transition-colors">
                      {pinnedNotice.title}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-sm text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                </Link>
              ) : (
                <Link
                  href="/notices"
                  className="inline-flex items-center gap-2.5 p-1.5 pr-4 bg-white/95 dark:bg-[var(--bg-surface)]/95 rounded-full text-xs shadow-sm border border-[var(--bg-border)]/40 hover:border-[var(--empire-gold)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group no-underline w-fit"
                >
                  <span className="bg-[var(--empire-gold)] text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
                    Grants
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-body font-semibold text-[var(--text-primary)] group-hover:text-[var(--empire-gold)] transition-colors">
                      2026 TNR Rescue Funding applications open
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-sm text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                </Link>
              )}
              <h1 className="font-display text-4xl md:text-6xl font-extrabold text-[var(--empire-cream)] leading-tight tracking-tight">
                Join the <span className="text-[var(--empire-gold)] dark:text-[var(--life-amber)] relative inline-block">
                  MeowNet
                  <svg className="absolute w-full h-3 -bottom-1.5 left-0 text-[var(--life-amber)] opacity-50 z-[-1]" preserveAspectRatio="none" viewBox="0 0 100 10">
                    <path d="M0 5 Q 50 10 100 5 L 100 10 L 0 10 Z" fill="currentColor"></path>
                  </svg>
                </span> Community
              </h1>
              <p className="font-body text-lg text-[var(--empire-cream)]/70 max-w-lg leading-relaxed">
                Log strays, track feeding routes, and coordinate Trap-Neuter-Return (TNR) efforts. Together, we&apos;re building a kinder world for community cats, one paw at a time.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/map" className="bg-[var(--empire-gold)] text-white hover:bg-[var(--empire-gold-dim)] px-8 py-4 rounded-xl font-semibold shadow-[0_4px_16px_rgba(148,74,0,0.15)] hover:shadow-[0_8px_24px_rgba(148,74,0,0.3)] transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 no-underline">
                  <span className="material-symbols-outlined text-base">explore</span>
                  <span>Start Mapping</span>
                </Link>
                <Link href="/cats" className="border-2 border-[var(--bg-border)] text-[var(--empire-gold)] hover:bg-[var(--bg-elevated)] px-8 py-4 rounded-xl font-semibold shadow-sm transition-all duration-300 flex items-center gap-2 no-underline transform hover:-translate-y-0.5 active:translate-y-0">
                  Explore Directory
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* Interactive Cat illustration Container */}
            <div className="relative h-[400px] md:h-[500px] w-full rounded-[3rem] overflow-hidden shadow-2xl border-8 border-[var(--bg-elevated)] z-10 transform rotate-2 hover:rotate-0 transition-all duration-500 reveal-fade-in delay-200">
              <div className="w-full h-full rounded-xl overflow-hidden relative">
                <Suspense fallback={<div className="w-full h-full bg-[var(--bg-void)] flex items-center justify-center">Loading cozy friend...</div>}>
                  <InteractiveCat temperature={temperature} />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* Floating Stats Banner */}
        <section className="stats-banner text-white py-10 px-8 max-w-7xl mx-auto rounded-3xl reveal-fade-in my-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#ffdcc5]">favorite</span>
              <span className="font-display text-4xl font-black stats-banner-text">{catsHelped.toLocaleString()}+</span>
              <span className="font-body text-xs font-bold uppercase tracking-wider stats-banner-sub">Cats Helped</span>
            </div>
            <div className="flex flex-col items-center space-y-2 border-y md:border-y-0 md:border-x border-white/10 py-6 md:py-0">
              <span className="material-symbols-outlined text-4xl text-[#ffdcc5]">map</span>
              <span className="font-display text-4xl font-black stats-banner-text">{activeColonies.toLocaleString()}</span>
              <span className="font-body text-xs font-bold uppercase tracking-wider stats-banner-sub">Colonies Mapped</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#ffdcc5]">group</span>
              <span className="font-display text-4xl font-black stats-banner-text">8,902</span>
              <span className="font-body text-xs font-bold uppercase tracking-wider stats-banner-sub">Active Guardians</span>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-10 px-4 md:px-12 max-w-7xl mx-auto reveal-fade-in delay-100 relative">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-[var(--empire-cream)] mb-2">How It Works</h2>
            <p className="font-body text-sm text-[var(--empire-cream)]/70 max-w-2xl mx-auto">
              It&apos;s as easy as 1-2-3 to make a difference in your neighborhood.
            </p>
          </div>
          <div className="relative pb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="premium-glass-card p-8 border border-[var(--life-teal)]/20 shadow-ambient text-center flex flex-col items-center space-y-4 hover:scale-102 transition-all duration-300 reveal-fade-in delay-200">
                <div className="w-20 h-20 bg-[var(--life-teal)]/15 text-[var(--life-teal)] rounded-full flex items-center justify-center mb-2 shadow-md transform -rotate-6">
                  <span className="material-symbols-outlined text-4xl">visibility</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--empire-cream)]">1. Spot</h3>
                <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                  See a community cat hanging around? Take a mental note of their location and condition.
                </p>
              </div>
              <div className="premium-glass-card p-8 border border-pink-500/15 shadow-ambient text-center flex flex-col items-center space-y-4 hover:scale-102 transition-all duration-300 reveal-fade-in delay-300 md:translate-y-4">
                <div className="w-20 h-20 bg-pink-500/15 text-pink-500 rounded-full flex items-center justify-center mb-2 shadow-md transform rotate-3">
                  <span className="material-symbols-outlined text-4xl">edit</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--empire-cream)]">2. Log</h3>
                <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                  Drop a pin on our map, add details, and earn <span className="text-[var(--empire-gold)] font-bold">+10 pts</span> for your contribution!
                </p>
              </div>
              <div className="premium-glass-card p-8 border border-[var(--empire-gold)]/15 shadow-ambient text-center flex flex-col items-center space-y-4 hover:scale-102 transition-all duration-300 reveal-fade-in delay-400 md:translate-y-8">
                <div className="w-20 h-20 bg-[var(--empire-gold)]/15 text-[var(--empire-gold)] rounded-full flex items-center justify-center mb-2 shadow-md transform -rotate-3">
                  <span className="material-symbols-outlined text-4xl">medical_services</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--empire-cream)]">3. Rescue</h3>
                <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                  Local volunteers coordinate to feed, TNR, or rescue based on your log. High fives all around!
                </p>
              </div>
            </div>
            {/* Playful connecting line hidden on mobile */}
            <svg className="hidden md:block absolute top-[30%] left-[12%] w-[76%] h-32 -z-10 text-[var(--bg-border)] opacity-30 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0 10 Q 25 -5 50 10 T 100 10" fill="none" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.5"></path>
            </svg>
          </div>
        </section>

        {/* Meet Your Neighbors Section */}
        <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto bg-[var(--bg-elevated)]/30 rounded-[3rem] my-10 shadow-sm border border-[var(--bg-border)]/35 reveal-fade-in delay-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-[var(--empire-cream)] flex items-center gap-2">
                <span>Meet Your Neighbors</span>
                <span className="text-xl">🐾</span>
              </h2>
              <p className="font-body text-sm text-[var(--empire-cream)]/70 mt-1">Recent sightings by our amazing community.</p>
            </div>
            <Link href="/map" className="text-sm font-semibold uppercase tracking-wider text-[var(--empire-gold)] hover:underline no-underline flex items-center gap-1">
              View Full Map <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(recentCats.length > 0 ? recentCats : FALLBACK_CATS).map((cat, idx) => {
              const initials = (cat.profiles?.display_name || 'Anonymous').slice(0, 2).toUpperCase();
              const isTnr = cat.status === 'tnr_done' || cat.status === 'tnr';
              const isAdopted = cat.status === 'adopted';
              const badgeText = isAdopted ? 'Adopted' : isTnr ? "TNR'd" : cat.status === 'adoptable' ? 'Adoptable' : 'New';
              const points = isAdopted || isTnr ? 50 : 10;

              return (
                <div key={cat.id || idx} className="premium-glass-card overflow-hidden group reveal-fade-in flex flex-col justify-between" style={{ animationDelay: `${150 + idx * 50}ms` }}>
                  <div>
                    <div className="h-44 relative overflow-hidden">
                      <img
                        src={cat.photo_url || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80'}
                        alt={cat.name || 'Community Cat'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-white ${isAdopted ? 'bg-pink-500/90' : isTnr ? 'bg-[var(--empire-gold)]/90' : 'bg-[var(--life-teal)]/90'
                        } backdrop-blur-sm shadow-sm`}>
                        {badgeText}
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      <div>
                        <h4 className="font-display text-base font-bold text-[var(--empire-cream)] truncate">
                          {cat.name ? `"${cat.name}"` : 'Unnamed Sighting'}
                        </h4>
                        <p className="font-body text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">pets</span>
                          <span>{cat.breed_estimate || 'Domestic Shorthair'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 pt-0">
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--bg-border)]/15">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] flex items-center justify-center text-[8px] font-bold uppercase">
                          {initials}
                        </div>
                        <span className="font-body text-[10px] text-[var(--text-muted)] truncate max-w-[80px]">
                          {cat.profiles?.display_name || 'Anonymous'}
                        </span>
                      </div>
                      <span className="font-data text-[10px] font-bold text-[var(--life-teal)] bg-[var(--life-teal)]/10 px-2 py-0.5 rounded">
                        +{points} pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--bg-border)]/80 flex flex-col justify-center items-center text-center p-6 space-y-4 hover:border-[var(--empire-gold)]/60 hover:bg-[var(--bg-elevated)]/20 transition-all duration-300 reveal-fade-in delay-300">
              <div className="bg-[var(--bg-elevated)] text-[var(--empire-gold)] p-3 rounded-full w-14 h-14 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">add_a_photo</span>
              </div>
              <div>
                <h4 className="font-display text-base font-bold text-[var(--empire-cream)]">Spot a new friend?</h4>
                <p className="font-body text-xs text-[var(--text-secondary)] mt-1">Help map strays in your local community.</p>
              </div>
              <Link href="/cats/new" className="bg-[var(--empire-gold)] text-white hover:bg-[var(--empire-gold-dim)] px-6 py-3 rounded-xl text-xs font-bold no-underline shadow-sm transition-all duration-200">
                Log a Sighting
              </Link>
            </div>
          </div>
        </section>

        {/* Success Stories Section */}
        <section className="py-10 px-4 md:px-12 max-w-7xl mx-auto border-t border-[var(--bg-border)]/20 reveal-fade-in delay-100">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-[var(--empire-cream)] mb-2">Success Stories</h2>
              <p className="font-body text-sm text-[var(--empire-cream)]/70 max-w-xl">
                Real impact, real lives changed. See the journeys of the cats our community has rallied to protect.
              </p>
            </div>
            <Link href="/stories" className="text-sm font-semibold uppercase tracking-wider text-[var(--empire-gold)] hover:underline no-underline flex items-center gap-1">
              All Stories <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(successStories.length > 0 ? successStories : FALLBACK_STORIES).map((story, idx) => {
              const name = story.name || 'Adopted Cat';
              const description = story.health_notes || story.description || 'Adopted safely into a loving forever home.';
              const isFallback = story.id.startsWith('fbs-');
              const targetHref = isFallback ? '/stories' : `/cats/${story.id}`;

              return (
                <div key={story.id || idx} className="premium-glass-card overflow-hidden group flex flex-col justify-between reveal-fade-in" style={{ animationDelay: `${150 + idx * 100}ms` }}>
                  <div>
                    <div className="h-48 relative overflow-hidden">
                      <img
                        src={story.photo_url || 'https://images.unsplash.com/photo-1533749047139-189de3cf06d3?auto=format&fit=crop&w=400&q=80'}
                        alt={name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-3 right-3 bg-pink-500 text-white px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                        {story.status === 'adopted' ? 'Adopted' : 'Success'}
                      </span>
                    </div>
                    <div className="p-6 space-y-2">
                      <h3 className="font-display text-lg font-bold text-[var(--empire-cream)] truncate">{name}</h3>
                      <p className="font-body text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                        {description}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <Link href={targetHref} className="text-[var(--empire-gold)] hover:text-[var(--empire-gold-dim)] font-body text-xs font-bold no-underline flex items-center gap-1 group-hover:underline">
                      Read Story <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bento Grid: Features & Impact */}
        <section className="py-12 px-4 md:px-12 max-w-7xl mx-auto border-t border-[var(--bg-border)]/20 reveal-fade-in delay-100">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-[var(--empire-cream)] mb-2">Community Impact</h2>
            <p className="font-body text-sm text-[var(--empire-cream)]/70 max-w-2xl mx-auto">See how our network of dedicated volunteers is making a difference every day.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Card 1 */}
            <div className="premium-glass-card p-8 flex flex-col justify-between group h-[260px] reveal-fade-in delay-150">
              <div className="flex justify-between items-start">
                <div className="bg-[var(--bg-elevated)] text-[var(--empire-gold)] p-2.5 rounded-xl flex items-center justify-center w-12 h-12">
                  <span className="material-symbols-outlined text-3xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                </div>
                <span className="bg-[var(--bg-elevated)] text-[var(--empire-cream)]/80 px-3 py-1.5 rounded-full font-body text-xs font-semibold">This Month</span>
              </div>
              <div>
                <p className="font-display text-4xl font-extrabold text-[var(--empire-cream)] group-hover:text-[var(--empire-gold)] transition-colors duration-300">{activeColonies.toLocaleString()}</p>
                <p className="font-body text-sm text-[var(--text-secondary)] mt-1">Active Colonies Mapped</p>
              </div>
            </div>

            {/* Featured Event Card (Loads dynamically from Supabase) */}
            {featuredEvent ? (
              <div className="md:col-span-2 bg-[#f28c38] text-white rounded-3xl p-8 border border-white/10 shadow-ambient relative overflow-hidden flex flex-col justify-end min-h-[260px] group hover:shadow-active hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 z-0">
                  <img className="w-full h-full object-cover opacity-30 mix-blend-overlay transition-transform duration-700 group-hover:scale-105" alt="Featured TNR Event" src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=cover&w=800&q=80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
                </div>
                <div className="relative z-10 space-y-3">
                  <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full font-body text-[10px] font-bold uppercase tracking-wider inline-block">
                    Active TNR Operation
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-white">
                    {featuredEvent.title}
                  </h3>
                  <p className="font-body text-sm text-white/95 max-w-md line-clamp-2 leading-relaxed">
                    {featuredEvent.description || "Help trap, neuter, and return community cats in the neighborhood."}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-white/90 pt-1 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      <span>{new Date(featuredEvent.event_time).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">group</span>
                      <span>Capacity: {featuredEvent.capacity} spots</span>
                    </span>
                  </div>
                  <Link href={`/events/${featuredEvent.id}`} className="mt-4 text-white font-body text-sm font-bold flex items-center gap-1 hover:underline no-underline">
                    Join Operation & RSVP <span className="material-symbols-outlined text-sm transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 bg-[#f28c38] text-white rounded-3xl p-8 border border-white/10 shadow-ambient relative overflow-hidden flex flex-col justify-end min-h-[260px] group hover:shadow-active hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 z-0">
                  <img className="w-full h-full object-cover opacity-35 mix-blend-overlay" alt="Host TNR Event" src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=cover&w=800&q=80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
                </div>
                <div className="relative z-10 space-y-2">
                  <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full font-body text-[10px] font-bold uppercase tracking-wider inline-block">
                    TNR Operations
                  </span>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Host a Community TNR Drive
                  </h3>
                  <p className="font-body text-sm text-white/90 max-w-md">
                    No active operations are scheduled right now. Coordinate and lead a TNR drive to help stabilize colony populations.
                  </p>
                  <Link href="/events/new" className="mt-4 text-white font-body text-sm font-bold flex items-center gap-1 hover:underline no-underline">
                    Host First Operation <span className="material-symbols-outlined text-sm transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Action Card */}
            <div className="premium-glass-card p-8 flex flex-col items-center justify-center text-center space-y-4 h-[260px] group reveal-fade-in delay-200">
              <div className="bg-[var(--bg-elevated)] text-[var(--empire-gold)] p-3 rounded-full w-14 h-14 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--bg-border)]/35 shadow-inner">
                <span className="material-symbols-outlined icon-filled text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_location</span>
              </div>
              <div>
                <h4 className="font-display text-lg font-bold text-[var(--empire-cream)]">Log a Sighting</h4>
                <p className="font-body text-xs text-[var(--text-secondary)] mt-1">Spotted a new stray? Add it to the map.</p>
              </div>
              <Link href="/cats/new" className="bg-gradient-to-r from-[var(--empire-gold)] to-[var(--life-amber)] text-white hover:opacity-95 shadow-md px-5 py-2.5 rounded-xl text-xs font-bold no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                Log Cat Sighting
              </Link>
            </div>

            {/* Alert/Status Card */}
            <div className={`premium-glass-card p-8 flex items-center gap-6 h-[260px] reveal-fade-in delay-300 md:col-span-2 border transition-all duration-300 ${activeAlert.type === 'warning'
                ? 'border-red-500/20 shadow-[0_4px_24px_rgba(220,38,38,0.04)] hover:shadow-[0_4px_24px_rgba(220,38,38,0.08)]'
                : activeAlert.type === 'caution'
                  ? 'border-[var(--empire-gold)]/20 shadow-[0_4px_24px_rgba(242,140,56,0.04)] hover:shadow-[0_4px_24px_rgba(242,140,56,0.08)]'
                  : 'border-[var(--life-teal)]/20 shadow-[0_4px_24px_rgba(0,106,99,0.04)] hover:shadow-[0_4px_24px_rgba(0,106,99,0.08)]'
              }`}>
              <div className={`p-3.5 rounded-2xl flex-shrink-0 flex items-center justify-center w-14 h-14 ${activeAlert.type === 'warning'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  : activeAlert.type === 'caution'
                    ? 'bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] border border-[var(--empire-gold)]/20'
                    : 'bg-[var(--life-teal)]/10 text-[var(--life-teal)] border border-[var(--life-teal)]/20'
                }`}>
                <span className="material-symbols-outlined icon-filled text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {activeAlert.type === 'warning' ? 'warning' : activeAlert.type === 'caution' ? 'error' : 'check_circle'}
                </span>
              </div>
              <div className="flex-grow space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${activeAlert.type === 'warning' ? 'bg-red-600' : activeAlert.type === 'caution' ? 'bg-[var(--empire-gold)]' : 'bg-[var(--life-teal)]'
                    }`}></span>
                  <h4 className={`font-body text-[10px] font-bold uppercase tracking-wider ${activeAlert.type === 'warning' ? 'text-red-500' : activeAlert.type === 'caution' ? 'text-[var(--empire-gold)]' : 'text-[var(--life-teal)]'
                    }`}>
                    {activeAlert.type === 'warning' ? 'Active Alert' : activeAlert.type === 'caution' ? 'Advisory' : 'Status OK'}
                  </h4>
                </div>
                <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed font-semibold">
                  {activeAlert.message}
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link href="/weather" className={`px-4 py-2 rounded-xl font-body text-xs font-bold no-underline transition-all duration-200 hover:shadow-md ${activeAlert.type === 'warning'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : activeAlert.type === 'caution'
                        ? 'bg-[var(--empire-gold)] hover:bg-[var(--empire-gold-dim)] text-white'
                        : 'bg-[var(--life-teal)] hover:bg-[var(--life-teal)]/95 text-white'
                    }`}>
                    View Details
                  </Link>
                  <Link href="/weather" className="bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-border)]/40 border border-[var(--bg-border)] px-4 py-2 rounded-xl font-body text-xs font-bold no-underline transition-colors">
                    Volunteer to Help
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Upcoming Operations Section (Supabase Controlled) */}
        {!loading && upcomingEvents.length > 0 && (
          <section className="py-8 px-4 md:px-12 max-w-7xl mx-auto border-t border-[var(--bg-border)]/20 mt-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xl font-bold text-[var(--empire-cream)]">Upcoming TNR Operations</h3>
              <Link href="/events" className="text-xs font-semibold uppercase tracking-wider text-[var(--empire-gold)] hover:underline no-underline flex items-center gap-1">
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="no-underline group">
                  <div className="bg-white dark:bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--bg-border)] shadow-ambient hover:shadow-active transition-all flex flex-col justify-between h-[160px]">
                    <div>
                      <span className="bg-[#ffdcc5] dark:bg-[var(--bg-elevated)] text-[var(--empire-gold-dim)] dark:text-[var(--empire-gold)] font-body text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        TNR Operation
                      </span>
                      <h4 className="font-display text-sm font-bold text-[var(--empire-cream)] mt-3 group-hover:text-[var(--empire-gold)] transition-colors truncate">
                        {event.title}
                      </h4>
                      <p className="font-body text-xs text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">
                        {event.description || "Help trap, neuter, and return community cats."}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--bg-border)]/20 font-body text-[10px] text-[var(--text-muted)] font-semibold">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        <span>{new Date(event.event_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      <span>{event.capacity} spots</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Footer />
      </main>
    </>
  );
}
