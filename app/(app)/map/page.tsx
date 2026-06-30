// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
'use client';
// app/(app)/map/page.tsx — Cat Sighting Map (client component)

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { fuzzCoordinates } from '@/lib/geo/utils';
import type { CatMarkerData } from '@/components/map/CatMap';
import FloatingActionButton from '@/components/ui/FloatingActionButton';

const CatMap = dynamic(() => import('@/components/map/CatMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-void)]">
      <span className="font-body text-sm font-semibold text-[var(--empire-gold)] animate-pulse">Loading map canvas…</span>
    </div>
  ),
});

const STATUS_COLORS: Record<string, string> = {
  adoptable: '#006a63', // Deep Emerald Teal
  tnr_needed: '#ab2c5d', // Dusty Wine Red
  stray: '#ba1a1a',      // Bold Crimson
  adopted: '#818cf8',    // Soft Indigo
  fostered: '#f28c38',   // Sunlit Amber
};

export default function MapPage() {
  const { isSignedIn } = useUser();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [cats, setCats] = useState<CatMarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const isUserLoggedIn = isSignedIn || !!supabaseUser;

  const fetchCats = useCallback(async () => {
    const { data, error } = await supabase
      .from('cats')
      .select('id, status, name, breed_estimate, photo_url, location, location_privacy, health_notes, created_at')
      .limit(200)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchCats error:', error);
      return;
    }

    const parsed = (data ?? []).map((row: Record<string, unknown>) => {
      let lat = 0;
      let lng = 0;
      const loc = row.location;

      if (loc && typeof loc === 'object') {
        const geojson = loc as { type?: string; coordinates?: number[] };
        if (geojson.type === 'Point' && Array.isArray(geojson.coordinates) && geojson.coordinates.length >= 2) {
          lng = geojson.coordinates[0];
          lat = geojson.coordinates[1];
        }
      } else if (typeof loc === 'string') {
        const match = loc.match(/POINT\(([^ ]+) ([^ )]+)\)/);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      }

      if (row.location_privacy !== 'exact') {
        const fuzzed = fuzzCoordinates(lat, lng);
        lat = fuzzed.lat;
        lng = fuzzed.lng;
      }

      return {
        id: row.id as string,
        lat,
        lng,
        status: row.status as string,
        name: row.name as string | null,
        breed_estimate: row.breed_estimate as string | null,
        photo_url: row.photo_url as string,
        health_notes: row.health_notes as string | null,
        created_at: row.created_at as string,
      };
    }).filter((c) => c.lat !== 0 || c.lng !== 0);

    setCats(parsed);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCats();
  }, [fetchCats]);

  // Apply filters
  const visibleCats = isUserLoggedIn ? cats : cats.slice(0, 3);
  const filteredCats = filterStatus
    ? visibleCats.filter((c) => c.status === filterStatus)
    : visibleCats;

  const searchedCats = filteredCats.filter((cat) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = cat.name?.toLowerCase().includes(q) ?? false;
    const breedMatch = cat.breed_estimate?.toLowerCase().includes(q) ?? false;
    return nameMatch || breedMatch;
  });

  const activeFilters = [
    { value: 'stray', label: 'Stray', color: 'bg-[#ba1a1a]' },
    { value: 'tnr_needed', label: 'TNR Needed', color: 'bg-[#ab2c5d]' },
    { value: 'adoptable', label: 'Adoptable', color: 'bg-[#006a63]' },
    { value: 'adopted', label: 'Adopted', color: 'bg-[#818cf8]' },
  ];

  // Calculate live stats for the top panel
  const stats = {
    total: cats.length,
    stray: cats.filter(c => c.status === 'stray').length,
    tnr: cats.filter(c => c.status === 'tnr_needed').length,
    adoptable: cats.filter(c => c.status === 'adoptable').length,
  };

  return (
    <div id="map-page-root" className="h-[calc(100vh-64px)] w-full flex flex-col overflow-hidden relative">
      
      {/* Top Toolbar */}
      <div className="bg-[var(--bg-surface)] px-4 md:px-12 py-3 border-b border-[var(--bg-border)]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 z-20 shadow-sm shrink-0">
        <div>
          <h1 className="font-display text-lg font-bold text-[var(--empire-cream)] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
            <span>Mission Control Map</span>
          </h1>
          <p className="font-body text-[10px] font-semibold text-[var(--empire-cream)]/50 uppercase tracking-wide">
            Locations fuzzed to ~500m unless Exact privacy is selected.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => { setFilterStatus(null); setSelectedCatId(null); }}
            className={`px-3 py-1.5 rounded-lg font-body text-xs font-semibold border transition-all ${
              filterStatus === null 
                ? 'bg-[var(--empire-gold)] text-white border-[var(--empire-gold)]' 
                : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/30 text-[var(--empire-cream)]/75 hover:bg-[var(--bg-border)]/20'
            }`}
          >
            All Sightings
          </button>
          
          {activeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilterStatus(f.value); setSelectedCatId(null); }}
              className={`px-3 py-1.5 rounded-lg font-body text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                filterStatus === f.value
                  ? 'bg-[var(--bg-surface)] border-[var(--empire-gold)] text-[var(--empire-cream)] shadow-sm'
                  : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/30 text-[var(--empire-cream)]/75 hover:bg-[var(--bg-border)]/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${f.color}`}></span>
              <span>{f.label}</span>
            </button>
          ))}

          <button 
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-lg font-body text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showHeatmap 
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/30 text-[var(--empire-cream)]/75 hover:bg-[var(--bg-border)]/20'
            }`}
          >
            <span className="material-symbols-outlined text-xs">density_small</span>
            <span>Heatmap</span>
          </button>
        </div>
      </div>

      {/* Main Map + Sidebar Workspace */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Left Sidebar (Community Radar Feed & Stats) */}
        <aside className="hidden md:flex flex-col w-80 bg-[var(--bg-surface)] border-r border-[var(--bg-border)]/40 shadow-sm z-20 shrink-0 h-full overflow-hidden">
          <div className="p-4 border-b border-[var(--bg-border)]/40 bg-[var(--bg-void)]">
            <h2 className="font-display text-sm font-bold text-[var(--empire-cream)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[var(--empire-gold)]">radar</span>
              <span>Community Radar</span>
            </h2>
            <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">Recent updates from the field.</p>
          </div>

          {/* Stats Summary Grid */}
          <div className="px-4 py-3 border-b border-[var(--bg-border)]/20 bg-[var(--bg-surface)] grid grid-cols-2 gap-2 text-[var(--empire-cream)]">
            <div className="bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--bg-border)]/10 text-center">
              <div className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Total Logged</div>
              <div className="text-xs font-bold font-data text-[var(--empire-gold)] mt-0.5">{stats.total}</div>
            </div>
            <div className="bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--bg-border)]/10 text-center">
              <div className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Active Strays</div>
              <div className="text-xs font-bold font-data text-[#ba1a1a] mt-0.5">{stats.stray}</div>
            </div>
            <div className="bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--bg-border)]/10 text-center">
              <div className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">TNR Needed</div>
              <div className="text-xs font-bold font-data text-[#ab2c5d] mt-0.5">{stats.tnr}</div>
            </div>
            <div className="bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--bg-border)]/10 text-center">
              <div className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Adoptable</div>
              <div className="text-xs font-bold font-data text-[var(--life-teal)] mt-0.5">{stats.adoptable}</div>
            </div>
          </div>

          {/* Live Search */}
          <div className="p-3 border-b border-[var(--bg-border)]/20 bg-[var(--bg-surface)]">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-base text-[var(--empire-cream)]/40">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or breed..."
                className="w-full bg-[var(--bg-elevated)] text-[var(--empire-cream)] border border-[var(--bg-border)]/30 rounded-lg pl-8 pr-3 py-1.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] transition-colors"
              />
            </div>
          </div>

          {/* Sidebar Sighting List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {searchedCats.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCatId(cat.id)}
                className={`cursor-pointer bg-[var(--bg-elevated)] border rounded-xl p-3 shadow-sm hover:shadow transition-all flex items-start gap-3 ${
                  selectedCatId === cat.id 
                    ? 'border-[var(--empire-gold)] shadow-[0_0_12px_rgba(242,140,56,0.15)] bg-[var(--bg-border)]/10' 
                    : 'border-[var(--bg-border)]/20 hover:bg-[var(--bg-border)]/15'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bg-border)]/30 overflow-hidden shrink-0 border border-[var(--bg-border)]/40 flex items-center justify-center">
                  {cat.photo_url ? (
                    <img src={cat.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🐱</span>
                  )}
                </div>
                <div className="min-w-0 flex-grow">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">
                      {cat.name ?? 'Unnamed Cat'}
                    </h4>
                    {cat.created_at && (
                      <span className="font-body text-[9px] text-[var(--empire-cream)]/40 font-semibold shrink-0">
                        {new Date(cat.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/60 line-clamp-1 mt-0.5">
                    {cat.health_notes || 'No observer notes.'}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span 
                      className="px-2 py-0.5 rounded-full font-body text-[8px] font-bold uppercase tracking-wider text-white" 
                      style={{ backgroundColor: STATUS_COLORS[cat.status] ?? '#944a00' }}
                    >
                      {cat.status.replace('_', ' ')}
                    </span>
                    <Link
                      href={`/cats/${cat.id}`}
                      onClick={(e) => e.stopPropagation()} // Prevent map selection trigger
                      className="font-body text-[9px] font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-0.5"
                    >
                      <span>Profile</span>
                      <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {searchedCats.length === 0 && (
              <div className="text-center py-12 text-[var(--empire-cream)]/40 font-body text-xs">
                No active sightings for this search.
              </div>
            )}

            {!isUserLoggedIn && (
              <>
                <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 rounded-xl p-3 opacity-40 blur-[1px] select-none pointer-events-none flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-border)]/30 overflow-hidden shrink-0 border border-[var(--bg-border)]/40 flex items-center justify-center">
                    <span className="text-xl">🐱</span>
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">Colony Cat #491</h4>
                    <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">Sign in to view notes</p>
                  </div>
                </div>
                <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 rounded-xl p-3 opacity-45 blur-[1px] select-none pointer-events-none flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-border)]/30 overflow-hidden shrink-0 border border-[var(--bg-border)]/40 flex items-center justify-center">
                    <span className="text-xl">🐱</span>
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">Stray Male</h4>
                    <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">Sign in to view notes</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Map Canvas Frame */}
        <div className="flex-1 h-full w-full relative z-10">
          <CatMap 
            cats={searchedCats} 
            onNewCat={fetchCats} 
            selectedCatId={selectedCatId} 
            onSelectCat={setSelectedCatId} 
            showHeatmap={showHeatmap}
          />
          
          {/* FAB to log sighting */}
          {isUserLoggedIn && (
            <Link 
              href="/cats/new" 
              className="hidden lg:flex absolute bottom-10 right-6 z-20 bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white w-14 h-14 rounded-full shadow-[0_8px_24px_rgba(148,74,0,0.3)] items-center justify-center hover:-translate-y-1 transform active:scale-95 transition-all"
              title="Log a Sighting"
            >
              <span className="material-symbols-outlined text-2xl font-bold">add_a_photo</span>
            </Link>
          )}

          {/* Guest Sign-In CTA Overlay */}
          {!isUserLoggedIn && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--bg-border)] p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-display text-xs font-extrabold text-[var(--empire-cream)]">Guest Sighting Preview</h4>
                <p className="font-body text-[10px] text-[var(--empire-cream)]/60 mt-0.5">Sign in to unlock all active colony coordinates.</p>
              </div>
              <Link 
                href="/auth/login" 
                className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition-all whitespace-nowrap shrink-0 shadow-sm"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

      </div>

      <FloatingActionButton />
    </div>
  );
}
