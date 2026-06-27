'use client';
// app/(app)/reports/page.tsx — Consolidated reports feed & Live news bulletin
// All external API calls (catfact.ninja) are routed through /api/catfact server proxy
// to avoid Chrome extension (injectScriptAdjust.js) fetch interception.
// Proxy endpoints:
//   /api/catfact?endpoint=fact          → single random fact
//   /api/catfact?endpoint=facts&limit=4 → list of facts
//   /api/catfact?endpoint=breeds&limit=8 → breed catalogue

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface CatSighting {
  id: string;
  name: string | null;
  photo_url: string;
  status: string;
  created_at: string;
}

interface TnrEvent {
  id: string;
  title: string;
  event_time: string;
  status: string;
}

interface WeatherReport {
  neighborhood: string;
  condition: string;
  notes: string;
}

interface CatFact {
  fact: string;
  length: number;
}

interface CatBreed {
  breed: string;
  country: string;
  origin: string;
  coat: string;
  pattern: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  stray:      { color: 'var(--status-stray)',    label: 'Stray',      bg: 'rgba(186, 26, 26, 0.15)'  },
  tnr_needed: { color: 'var(--status-tnr)',      label: 'TNR Needed', bg: 'rgba(171, 44, 93, 0.15)'  },
  adoptable:  { color: 'var(--status-adoptable)',label: 'Adoptable',  bg: 'rgba(0, 106, 99, 0.15)'   },
  adopted:    { color: 'var(--status-adopted)',  label: 'Adopted',    bg: 'rgba(129, 140, 248, 0.15)' },
};

const COAT_COLORS: Record<string, string> = {
  Short:      'bg-amber-400/15 text-amber-600 dark:text-amber-300',
  Long:       'bg-violet-400/15 text-violet-600 dark:text-violet-300',
  'Semi-long':'bg-pink-400/15 text-pink-600 dark:text-pink-300',
  Hairless:   'bg-zinc-400/15 text-zinc-500',
  Medium:     'bg-sky-400/15 text-sky-600 dark:text-sky-300',
};

export default function ReportsPage() {
  const [cats,           setCats]           = useState<CatSighting[]>([]);
  const [events,         setEvents]         = useState<TnrEvent[]>([]);
  const [weatherReports, setWeatherReports] = useState<WeatherReport[]>([]);
  const [catFact,        setCatFact]        = useState<string>('');
  const [catFacts,       setCatFacts]       = useState<CatFact[]>([]);
  const [breeds,         setBreeds]         = useState<CatBreed[]>([]);
  const [loadingFact,    setLoadingFact]    = useState(true);
  const [loadingFacts,   setLoadingFacts]   = useState(true);
  const [loadingBreeds,  setLoadingBreeds]  = useState(true);
  const [loadingDb,      setLoadingDb]      = useState(true);
  const [activeFactIdx,  setActiveFactIdx]  = useState(0);

  // ── Single random fact (Live Bulletin) ────────────────────────────────────
  const fetchCatFact = useCallback(async () => {
    setLoadingFact(true);
    try {
      const res = await fetch('/api/catfact?endpoint=fact&max_length=200');
      if (!res.ok) throw new Error(`proxy error ${res.status}`);
      const data: { fact: string; length: number; fallback?: boolean } = await res.json();
      if (data?.fact) setCatFact(data.fact);
    } catch (e) {
      console.error('Cat fact proxy failed:', e);
      setCatFact('Cats have been companions to humans for over 10,000 years — one of the most successful species in history.');
    } finally {
      setLoadingFact(false);
    }
  }, []);

  // ── Fact list (rotating bulletin feed) ────────────────────────────────────
  const fetchCatFacts = useCallback(async () => {
    setLoadingFacts(true);
    try {
      const res = await fetch('/api/catfact?endpoint=facts&limit=5&max_length=160');
      if (!res.ok) throw new Error(`proxy error ${res.status}`);
      const data: { data: CatFact[]; fallback?: boolean } = await res.json();
      if (data?.data?.length) {
        setCatFacts(data.data);
        setActiveFactIdx(0);
      }
    } catch (e) {
      console.error('Cat facts list proxy failed:', e);
    } finally {
      setLoadingFacts(false);
    }
  }, []);

  // ── Breeds catalogue ───────────────────────────────────────────────────────
  const fetchBreeds = useCallback(async () => {
    setLoadingBreeds(true);
    try {
      const res = await fetch('/api/catfact?endpoint=breeds&limit=8');
      if (!res.ok) throw new Error(`proxy error ${res.status}`);
      const data: { data: CatBreed[]; fallback?: boolean } = await res.json();
      if (data?.data?.length) setBreeds(data.data);
    } catch (e) {
      console.error('Breeds proxy failed:', e);
    } finally {
      setLoadingBreeds(false);
    }
  }, []);

  useEffect(() => {
    // 1. All three catfact.ninja endpoints (via server proxy)
    fetchCatFact();
    fetchCatFacts();
    fetchBreeds();

    // 2. Weather reports from localStorage
    const storedWeather = localStorage.getItem('meownet_weather_reports');
    if (storedWeather) {
      try { setWeatherReports(JSON.parse(storedWeather)); }
      catch (e) { console.error(e); }
    } else {
      setWeatherReports([
        { neighborhood: 'Northside District', condition: 'Freezing rain',  notes: 'Cats crowding near the heating vents behind the old bakery.' },
        { neighborhood: 'East River Wharf',   condition: 'High wind chill', notes: 'Colony 4 shelters are holding up, but fresh straw is needed.' },
      ]);
    }

    // 3. Supabase live data
    async function fetchDatabaseData() {
      try {
        const supabase = createClient();

        const { data: catData } = await supabase
          .from('cats' as never)
          .select('id, name, photo_url, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5) as { data: CatSighting[] | null };
        if (catData) setCats(catData);

        const { data: eventData } = await supabase
          .from('tnr_events' as never)
          .select('id, title, event_time, status')
          .order('event_time', { ascending: true })
          .limit(5) as { data: TnrEvent[] | null };
        if (eventData) setEvents(eventData);
      } catch (e) {
        console.error('Failed to fetch database data', e);
      } finally {
        setLoadingDb(false);
      }
    }

    fetchDatabaseData();
  }, [fetchCatFact, fetchCatFacts, fetchBreeds]);

  // Rotate fact cards every 8s
  useEffect(() => {
    if (catFacts.length < 2) return;
    const t = setInterval(() => {
      setActiveFactIdx(i => (i + 1) % catFacts.length);
    }, 8000);
    return () => clearInterval(t);
  }, [catFacts]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl">feed</span>
          <span>Feline Activity &amp; Reports Board</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Central bulletin summarizing user sightings, climate observations, TNR events, and live cat facts from the global feline network.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT: 8 columns ──────────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">

          {/* Weather Climate Reports */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ba1a1a]">thermostat</span>
                <span>Active Feline Climate Reports</span>
              </h2>
              <Link href="/weather" className="font-body text-xs font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-1">
                <span>Report weather</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            {weatherReports.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50 py-2">No active climate reports logged.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weatherReports.map((rep, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-body text-xs font-bold text-[var(--empire-cream)]">{rep.neighborhood}</span>
                      <span className="px-2 py-0.5 bg-red-500/10 text-[#ba1a1a] text-[9px] font-bold rounded-md uppercase tracking-wider border border-red-500/20">
                        {rep.condition}
                      </span>
                    </div>
                    <p className="font-body text-xs text-[var(--empire-cream)]/75 leading-relaxed italic">
                      &ldquo;{rep.notes}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rotating Cat Facts Feed (/facts endpoint) */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--empire-gold)]">psychology</span>
                <span>Feline Science Feed</span>
                <span className="text-[10px] font-body font-normal text-[var(--empire-cream)]/40 ml-1">catfact.ninja</span>
              </h2>
              <button
                onClick={fetchCatFacts}
                disabled={loadingFacts}
                className="w-7 h-7 rounded-lg border border-[var(--bg-border)]/50 hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                title="Refresh facts"
              >
                <span className={`material-symbols-outlined text-base text-[var(--empire-cream)] ${loadingFacts ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>

            {loadingFacts ? (
              <div className="space-y-3">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {catFacts.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveFactIdx(idx)}
                    className={`text-left w-full p-3 rounded-xl border transition-all duration-300 ${
                      idx === activeFactIdx
                        ? 'bg-[var(--empire-gold)]/10 border-[var(--empire-gold)]/40 shadow-sm'
                        : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/20 hover:border-[var(--empire-gold)]/20'
                    }`}
                  >
                    <p className={`font-body text-xs leading-relaxed transition-colors ${
                      idx === activeFactIdx
                        ? 'text-[var(--empire-cream)]'
                        : 'text-[var(--empire-cream)]/60'
                    }`}>
                      {idx === activeFactIdx && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--empire-gold)] mr-2 mb-0.5 animate-pulse" />
                      )}
                      {f.fact}
                    </p>
                    <span className="mt-1 inline-block font-body text-[9px] text-[var(--empire-cream)]/30">
                      {f.length} chars
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Dot indicator */}
            {catFacts.length > 1 && (
              <div className="flex gap-1.5 justify-center mt-4">
                {catFacts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveFactIdx(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      i === activeFactIdx ? 'w-6 bg-[var(--empire-gold)]' : 'w-1.5 bg-[var(--empire-cream)]/20'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sighting Logs Board */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--empire-gold)]">pets</span>
                <span>Community Sighting Logs</span>
              </h2>
              <Link href="/cats" className="font-body text-xs font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-1">
                <span>Explore Directory</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {loadingDb ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--empire-gold)] border-t-transparent animate-spin" />
              </div>
            ) : cats.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50 py-2">No cats logged in the community database.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {cats.map((cat) => {
                  const status = STATUS_CONFIG[cat.status] ?? { color: '#887365', label: cat.status, bg: 'rgba(0,0,0,0.05)' };
                  return (
                    <Link
                      key={cat.id}
                      href={`/cats/${cat.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/15 border border-[var(--bg-border)]/10 transition-all duration-200 no-underline group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-[var(--bg-border)]/20 flex-shrink-0">
                        <img src={cat.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] group-hover:text-[var(--empire-gold)] transition-colors truncate">
                          {cat.name ?? 'Unnamed Cat'}
                        </h4>
                        <p className="font-body text-[10px] text-[var(--empire-cream)]/40 mt-0.5">
                          Logged on {new Date(cat.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className="px-2.5 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: 4 columns ─────────────────────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">

          {/* Live Bulletin — single random fact (/fact endpoint) */}
          <div className="bg-white p-6 rounded-2xl shadow-[var(--shadow-active)] border border-[var(--empire-gold)] flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--empire-gold)]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-center">
              <span className="font-body text-[9px] font-bold text-[var(--empire-gold)] uppercase tracking-widest bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 px-2 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>Live Bulletin</span>
              </span>
              <button
                onClick={fetchCatFact}
                disabled={loadingFact}
                className="w-7 h-7 rounded-lg border border-[var(--bg-border)]/50 hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--empire-cream)] transition-all cursor-pointer disabled:opacity-50"
                title="Refresh bulletin"
              >
                <span className={`material-symbols-outlined text-base ${loadingFact ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-display text-sm font-bold text-[var(--empire-cream)]">Random Feline Fact</h3>
              {loadingFact ? (
                <div className="space-y-2 py-2">
                  <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-full" />
                  <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-2/3" />
                </div>
              ) : (
                <p className="font-body text-xs text-[var(--empire-cream)]/80 leading-relaxed italic border-l-2 border-[var(--empire-gold)] pl-3">
                  &ldquo;{catFact}&rdquo;
                </p>
              )}
            </div>

            <div className="text-[9px] font-body font-semibold text-[var(--empire-cream)]/40 uppercase tracking-wider">
              Powered by catfact.ninja · <code className="not-italic">/fact</code>
            </div>
          </div>

          {/* Cat Breed Catalogue (/breeds endpoint) */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--life-teal)] text-xl">library_books</span>
                <span>Breed Catalogue</span>
              </h3>
              <button
                onClick={fetchBreeds}
                disabled={loadingBreeds}
                className="w-7 h-7 rounded-lg border border-[var(--bg-border)]/50 hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                title="Refresh breeds"
              >
                <span className={`material-symbols-outlined text-base text-[var(--empire-cream)] ${loadingBreeds ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>

            {loadingBreeds ? (
              <div className="space-y-2">
                {[0,1,2,3,4,5,6,7].map(i => (
                  <div key={i} className="h-8 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {breeds.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--bg-border)]/10 hover:border-[var(--life-teal)]/20 transition-colors">
                    {/* Coat badge */}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-body flex-shrink-0 ${COAT_COLORS[b.coat] ?? 'bg-zinc-400/15 text-zinc-500'}`}>
                      {b.coat}
                    </span>
                    {/* Name + country */}
                    <div className="flex-grow min-w-0">
                      <p className="font-body text-[11px] font-bold text-[var(--empire-cream)] truncate">{b.breed}</p>
                      <p className="font-body text-[9px] text-[var(--empire-cream)]/40 truncate">{b.country} · {b.pattern}</p>
                    </div>
                    {/* Origin chip */}
                    <span className="font-body text-[8px] text-[var(--empire-cream)]/30 flex-shrink-0 hidden sm:block">{b.origin}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[9px] font-body text-[var(--empire-cream)]/30 mt-3 uppercase tracking-wider">
              Source: catfact.ninja · <code className="not-italic">/breeds</code>
            </p>
          </div>

          {/* TNR Coordination Operations */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--life-teal)]">calendar_today</span>
                <span>TNR Operations</span>
              </h2>
              <Link href="/events" className="font-body text-xs font-bold text-[var(--empire-gold)] hover:underline">
                View All
              </Link>
            </div>

            {loadingDb ? (
              <div className="flex items-center justify-center p-6">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--life-teal)] border-t-transparent animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50 py-2">No upcoming TNR events scheduled.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/15 border border-[var(--bg-border)]/10 transition-all flex gap-3 no-underline group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--life-teal)]/10 text-[var(--life-teal)] flex items-center justify-center flex-shrink-0 font-body text-xs font-bold">
                      TNR
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-center">
                      <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] group-hover:text-[var(--empire-gold)] transition-colors truncate">
                        {event.title}
                      </h4>
                      <span className="font-body text-[9px] text-[var(--empire-cream)]/40 mt-0.5">
                        {new Date(event.event_time).toLocaleDateString()} at {new Date(event.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
