// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/page.tsx — Landing page with Cozy Community theme & Three.js Globe

'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/nav/Footer';

const GlobeScene = dynamic(() => import('@/components/three/GlobeScene'), { ssr: false });

const DEMO_CAT_POINTS = [
  { lat: 40.7128, lng: -74.006 }, { lat: 51.5074, lng: -0.1278 }, { lat: 35.6762, lng: 139.6503 },
  { lat: 48.8566, lng: 2.3522 }, { lat: -33.8688, lng: 151.2093 }, { lat: 19.4326, lng: -99.1332 },
  { lat: 55.7558, lng: 37.6173 }, { lat: 28.6139, lng: 77.209 }, { lat: 1.3521, lng: 103.8198 },
  { lat: -23.5505, lng: -46.6333 }, { lat: 52.52, lng: 13.405 }, { lat: 41.9028, lng: 12.4964 },
  { lat: 37.5665, lng: 126.978 }, { lat: 31.2304, lng: 121.4737 }, { lat: 25.2048, lng: 55.2708 },
];

const DEMO_EVENT_POINTS = [
  { lat: 40.7128, lng: -74.006 }, { lat: 51.5074, lng: -0.1278 }, { lat: 35.6762, lng: 139.6503 },
  { lat: 48.8566, lng: 2.3522 }, { lat: -33.8688, lng: 151.2093 },
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
  const [activeAlert, setActiveAlert] = useState<{
    message: string;
    type: 'warning' | 'caution' | 'info';
    neighborhood?: string;
  }>({
    message: 'Cold Weather Warning: Winter shelters urgently needed in the Northside District.',
    type: 'warning'
  });

  useEffect(() => {
    // Check if loaded in this session to prevent repeat loaders
    const hasLoaded = sessionStorage.getItem('meownet_loaded');
    if (!hasLoaded) {
      setShowIntroLoader(true);
      sessionStorage.setItem('meownet_loaded', 'true');
    }

    async function fetchEvents() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
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
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        const temp = Math.round(data.temp ?? 65);
        const location: string = data.location ?? 'Global Cat Shelter';

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
        const prefix = userLocated ? `📍 ${location}` : `🌍 ${location}`;
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
        console.error('Error fetching live alert:', err);
      }
    }

    fetchEvents();
    fetchCatsCount();
    fetchLiveAlert();
  }, []);

  const featuredEvent = events[0];
  const upcomingEvents = events.slice(1);

  return (
    <>
      {showIntroLoader && <CatLoader />}
      <Navbar />
      
      <main className="flex-grow paw-pattern min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-20 pb-12 px-4 md:px-12 max-w-7xl mx-auto overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4.5 py-2 bg-white dark:bg-[var(--bg-surface)] rounded-full text-[var(--empire-gold)] font-body text-xs shadow-sm border border-[var(--bg-border)]/40 backdrop-blur-md hover:scale-102 transition-transform duration-300">
                <span className="material-symbols-outlined text-base animate-pulse">campaign</span>
                <span className="font-semibold">New: Community TNR Grants Available!</span>
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-extrabold text-[var(--empire-cream)] leading-tight tracking-tight">
                Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--empire-gold)] to-[var(--life-amber)]">MeowNet</span> Community
              </h1>
              <p className="font-body text-lg text-[var(--empire-cream)]/70 max-w-lg leading-relaxed">
                Log strays, track feeding routes, and coordinate Trap-Neuter-Return (TNR) efforts. Together, we're building a kinder world for community cats, one paw at a time.
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

            {/* Interactive Globe Container */}
            <div className="relative h-[400px] md:h-[500px] w-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(148,74,0,0.12)] hover:shadow-[0_20px_50px_rgba(148,74,0,0.22)] border border-[var(--bg-border)]/50 bg-[var(--bg-surface)] transition-all duration-500">
              <div className="w-full h-full object-cover rounded-xl overflow-hidden relative">
                <Suspense fallback={<div className="w-full h-full bg-[var(--bg-void)] flex items-center justify-center">Loading Globe...</div>}>
                  <GlobeScene catPoints={DEMO_CAT_POINTS} eventPoints={DEMO_EVENT_POINTS} />
                </Suspense>
              </div>
              {/* Floating Stat Badge */}
              <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-[#1c1a17]/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-[var(--bg-border)]/50 flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl text-[var(--empire-gold)] flex-shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
                <div>
                  <p className="font-body text-xs text-[var(--text-muted)] uppercase tracking-wider">Cats Helped</p>
                  <p className="font-display text-xl font-bold text-[var(--empire-gold)]">{catsHelped.toLocaleString()}+</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: Features & Impact */}
        <section className="py-16 px-4 md:px-12 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-[var(--empire-cream)] mb-2">Community Impact</h2>
            <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl mx-auto">See how our network of dedicated volunteers is making a difference every day.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Card 1 */}
            <div className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-border)]/60 shadow-ambient flex flex-col justify-between group h-[260px] hover:shadow-active hover:-translate-y-1 transition-all duration-300">
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
            <div className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-border)]/60 shadow-ambient flex flex-col items-center justify-center text-center space-y-4 hover:shadow-active hover:-translate-y-1 transition-all duration-300 h-[260px] group">
              <div className="bg-[var(--bg-elevated)] text-[var(--empire-gold)] p-3 rounded-full w-14 h-14 flex items-center justify-center transition-colors group-hover:bg-[var(--bg-border)]/30">
                <span className="material-symbols-outlined icon-filled text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_location</span>
              </div>
              <div>
                <h4 className="font-display text-lg font-bold text-[var(--empire-cream)]">Log a Sighting</h4>
                <p className="font-body text-xs text-[var(--text-secondary)] mt-1">Spotted a new stray? Add it to the map.</p>
              </div>
              <Link href="/cats/new" className="bg-[var(--empire-gold)] text-white hover:bg-[var(--empire-gold-dim)] px-5 py-2.5 rounded-xl text-xs font-bold no-underline shadow-sm transition-all duration-200">
                Log Cat Sighting
              </Link>
            </div>

            {/* Alert/Status Card */}
            <div className="md:col-span-2 bg-white dark:bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-border)]/60 shadow-ambient flex items-center gap-6 h-[260px] hover:shadow-active hover:-translate-y-1 transition-all duration-300">
              <div className={`p-3.5 rounded-2xl flex-shrink-0 flex items-center justify-center w-14 h-14 ${
                activeAlert.type === 'warning'
                  ? 'bg-red-500/10 text-[#ba1a1a] dark:text-red-400 border border-red-500/20'
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
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    activeAlert.type === 'warning' ? 'bg-red-600' : activeAlert.type === 'caution' ? 'bg-[var(--empire-gold)]' : 'bg-[var(--life-teal)]'
                  }`}></span>
                  <h4 className="font-body text-[10px] font-bold text-[var(--empire-cream)] uppercase tracking-wider">
                    {activeAlert.type === 'warning' ? 'Active Alert' : activeAlert.type === 'caution' ? 'Advisory' : 'Status OK'}
                  </h4>
                </div>
                <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed font-semibold">
                  {activeAlert.message}
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link href="/weather" className="bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-border)]/40 px-4 py-2 rounded-xl font-body text-xs font-bold no-underline transition-colors">View Details</Link>
                  <Link href="/weather" className="bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-border)]/40 px-4 py-2 rounded-xl font-body text-xs font-bold no-underline transition-colors">Volunteer to Help</Link>
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
