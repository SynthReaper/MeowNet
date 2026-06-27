'use client';
// components/empire/Leaderboard/index.tsx — Weekly leaderboard with 30s refresh and geolocation Local filter

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';

interface LeaderboardEntry {
  id: string; display_name: string | null; avatar_url: string | null;
  weekly_points: number; actions_taken: number; badge_ids: string[] | null;
}

interface LeaderboardProps { entries: LeaderboardEntry[]; currentUserId?: string; }

const fetcher = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.from('leaderboard_weekly' as never).select('*').limit(20);
  if (error) throw error;
  return data as LeaderboardEntry[];
};

// Haversine formula to calculate distance in km between two coordinates
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Leaderboard({ entries: initialEntries, currentUserId }: LeaderboardProps) {
  const { data: entries = initialEntries } = useSWR('leaderboard_weekly', fetcher, {
    fallbackData: initialEntries,
    refreshInterval: 30_000,
  });

  const [view, setView] = useState<'global' | 'local'>('global');
  const [localUserIds, setLocalUserIds] = useState<string[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const handleLocalClick = async () => {
    setView('local');
    if (localUserIds !== null) return; // already loaded

    setLocating(true);
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by browser');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Fetch all cats to resolve local coordinates
          const supabase = createClient();
          const { data: catsData } = await supabase
            .from('cats' as never)
            .select('owner_id, location')
            .limit(1000);

          if (!catsData) {
            setLocalUserIds([]);
            setLocating(false);
            return;
          }

          const localOwners = new Set<string>();

          catsData.forEach((row: any) => {
            let catLat = 0;
            let catLng = 0;
            const loc = row.location;

            if (loc && typeof loc === 'object') {
              const geojson = loc as { type?: string; coordinates?: number[] };
              if (geojson.type === 'Point' && Array.isArray(geojson.coordinates) && geojson.coordinates.length >= 2) {
                catLng = geojson.coordinates[0];
                catLat = geojson.coordinates[1];
              }
            } else if (typeof loc === 'string') {
              const match = loc.match(/POINT\(([^ ]+) ([^ )]+)\)/);
              if (match) {
                catLng = parseFloat(match[1]);
                catLat = parseFloat(match[2]);
              }
            }

            if (catLat !== 0 && catLng !== 0) {
              const dist = getDistance(lat, lng, catLat, catLng);
              if (dist <= 100) { // within 100km radius
                localOwners.add(row.owner_id);
              }
            }
          });

          // Always include the current user so they see themselves
          if (currentUserId) {
            localOwners.add(currentUserId);
          }

          setLocalUserIds(Array.from(localOwners));
        } catch (err) {
          console.error(err);
          setLocError('Failed to scan local sightings');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocError('Location permission denied');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Filter entries based on the view mode
  const filteredEntries = view === 'local' && localUserIds !== null
    ? entries.filter((e) => localUserIds.includes(e.id))
    : entries;

  // Combine and sort properly by points to guarantee podium ranks are mathematically correct
  const combined = [...filteredEntries].sort((a, b) => b.weekly_points - a.weekly_points);

  const top1 = combined[0];
  const top2 = combined[1];
  const top3 = combined[2];

  const remainingEntries = combined.slice(3);

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--empire-cream)]">Top Guardians</h2>
          <p className="font-body text-sm text-[var(--empire-cream)]/60">This week&apos;s most active community members.</p>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex bg-[var(--bg-elevated)] rounded-xl p-1 border border-[var(--bg-border)]/20">
          <button 
            onClick={() => setView('global')}
            type="button"
            className={`px-4 py-2 rounded-lg font-body text-xs font-bold cursor-pointer transition-all ${
              view === 'global' 
                ? 'bg-white text-[var(--empire-gold)] shadow-sm' 
                : 'text-[var(--empire-cream)]/60 hover:bg-white/30'
            }`}
          >
            Global
          </button>
          <button 
            onClick={handleLocalClick}
            type="button"
            className={`px-4 py-2 rounded-lg font-body text-xs font-bold cursor-pointer transition-all ${
              view === 'local' 
                ? 'bg-white text-[var(--empire-gold)] shadow-sm' 
                : 'text-[var(--empire-cream)]/60 hover:bg-white/30'
            }`}
          >
            Local
          </button>
        </div>
      </div>

      {/* Geolocation feedback states */}
      {locating && (
        <div className="text-center py-4 font-body text-xs text-[var(--empire-gold)] animate-pulse flex items-center justify-center gap-1.5 mb-6">
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          <span>Scanning local radar for nearby mappers...</span>
        </div>
      )}
      {locError && (
        <div className="text-center py-3 px-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-[var(--empire-gold)] rounded-xl font-body text-xs mb-8 flex items-center justify-center gap-1.5 shadow-sm">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{locError}. Showing global rankings instead.</span>
        </div>
      )}

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-4 md:gap-8 mb-12 h-60 mt-8 pt-8">
        {/* 2nd Place */}
        {top2 ? (
          <div className="flex flex-col items-center w-24 md:w-32 transform translate-y-4">
            <div className="relative mb-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-white shadow-md bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden">
                {top2.avatar_url ? (
                  <img src={top2.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-bold text-[var(--empire-gold)]">
                    {(top2.display_name ?? 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[var(--bg-border)] rounded-full flex items-center justify-center shadow-sm font-display text-xs font-bold text-[var(--empire-cream)]">
                2
              </div>
            </div>
            <span className="font-body text-xs font-semibold text-center truncate w-full">{top2.display_name ?? 'Anonymous'}</span>
            <span className="font-body text-[10px] text-[var(--empire-gold)] font-bold">{top2.weekly_points.toLocaleString()} pts</span>
            <div className="w-full h-24 bg-[var(--bg-elevated)] rounded-t-xl mt-3 flex items-start justify-center pt-4 border-t-2 border-[var(--bg-border)] opacity-80">
              <span className="material-symbols-outlined text-[var(--empire-cream)]/30 text-2xl">military_tech</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-24 md:w-32 transform translate-y-4">
            <div className="relative mb-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-dashed border-[var(--bg-border)]/60 bg-[var(--bg-elevated)]/30 flex items-center justify-center overflow-hidden">
                <span className="font-display text-xl font-bold text-[var(--empire-cream)]/30">
                  -
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[var(--bg-border)] rounded-full flex items-center justify-center shadow-sm font-display text-xs font-bold text-[var(--empire-cream)]/40">
                2
              </div>
            </div>
            <span className="font-body text-xs font-semibold text-center text-[var(--empire-cream)]/40 truncate w-full">Empty Slot</span>
            <span className="font-body text-[10px] text-[var(--empire-cream)]/30 font-bold">0 pts</span>
            <div className="w-full h-24 bg-[var(--bg-elevated)]/30 rounded-t-xl mt-3 flex items-start justify-center pt-4 border-t-2 border-dashed border-[var(--bg-border)] opacity-50">
              <span className="material-symbols-outlined text-[var(--empire-cream)]/20 text-2xl">military_tech</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {top1 ? (
          <div className="flex flex-col items-center w-28 md:w-36 z-10">
            <div className="relative mb-3">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[var(--empire-gold)] animate-bounce" style={{ animationDuration: '3s' }}>
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </div>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-[var(--empire-gold)] shadow-lg ring-4 ring-[#ffdcc5] bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden">
                {top1.avatar_url ? (
                  <img src={top1.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-2xl font-bold text-[var(--empire-gold)]">
                    {(top1.display_name ?? 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[var(--empire-gold)] rounded-full flex items-center justify-center shadow-sm font-display text-xs font-bold text-[var(--empire-gold)]">
                1
              </div>
            </div>
            <span className="font-body text-sm font-bold text-center truncate w-full text-[var(--empire-gold)]">{top1.display_name ?? 'Anonymous'}</span>
            <span className="font-body text-xs text-[var(--empire-gold)] font-extrabold">{top1.weekly_points.toLocaleString()} pts</span>
            <div className="w-full h-32 bg-[#ffdcc5]/40 rounded-t-xl mt-3 flex items-start justify-center pt-4 border-t-4 border-[var(--empire-gold)]">
              <span className="font-body text-[10px] text-[var(--empire-gold-dim)] uppercase tracking-wider font-bold">Guardian</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-28 md:w-36 z-10">
            <div className="relative mb-3">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-dashed border-[var(--bg-border)]/60 bg-[var(--bg-elevated)]/30 flex items-center justify-center overflow-hidden">
                <span className="font-display text-2xl font-bold text-[var(--empire-cream)]/30">
                  -
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[var(--bg-border)] rounded-full flex items-center justify-center shadow-sm font-display text-xs font-bold text-[var(--empire-cream)]/40">
                1
              </div>
            </div>
            <span className="font-body text-sm font-bold text-center text-[var(--empire-cream)]/40 truncate w-full">Empty Slot</span>
            <span className="font-body text-xs text-[var(--empire-cream)]/30 font-extrabold">0 pts</span>
            <div className="w-full h-32 bg-[var(--bg-elevated)]/20 rounded-t-xl mt-3 flex items-start justify-center pt-4 border-t-4 border-dashed border-[var(--bg-border)] opacity-50">
              <span className="font-body text-[10px] text-[var(--empire-cream)]/20 uppercase tracking-wider font-bold">Guardian</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3 ? (
          <div className="flex flex-col items-center w-24 md:w-32 transform translate-y-8">
            <div className="relative mb-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-white shadow-md bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden">
                {top3.avatar_url ? (
                  <img src={top3.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-bold text-[var(--empire-gold)]">
                    {(top3.display_name ?? 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[var(--bg-border)] rounded-full flex items-center justify-center shadow-sm font-display text-xs font-bold text-[var(--empire-cream)]">
                3
              </div>
            </div>
            <span className="font-body text-xs font-semibold text-center truncate w-full">{top3.display_name ?? 'Anonymous'}</span>
            <span className="font-body text-[10px] text-[var(--empire-gold)] font-bold">{top3.weekly_points.toLocaleString()} pts</span>
            <div className="w-full h-20 bg-[var(--bg-elevated)] rounded-t-xl mt-3 flex items-start justify-center pt-4 border-t border-[var(--bg-border)]/50 opacity-70">
              <span className="material-symbols-outlined text-[var(--empire-cream)]/20 text-2xl">military_tech</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-24 md:w-32 transform translate-y-8">
            <div className="relative mb-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-dashed border-[var(--bg-border)]/60 bg-[var(--bg-elevated)]/30 flex items-center justify-center overflow-hidden">
                <span className="font-display text-xl font-bold text-[var(--empire-cream)]/30">
                  -
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[var(--bg-border)] rounded-full flex items-center justify-center shadow-sm font-display text-xs font-bold text-[var(--empire-cream)]/40">
                3
              </div>
            </div>
            <span className="font-body text-xs font-semibold text-center text-[var(--empire-cream)]/40 truncate w-full">Empty Slot</span>
            <span className="font-body text-[10px] text-[var(--empire-cream)]/30 font-bold">0 pts</span>
            <div className="w-full h-20 bg-[var(--bg-elevated)]/30 rounded-t-xl mt-3 flex items-start justify-center pt-4 border-t border-dashed border-[var(--bg-border)]/50 opacity-50">
              <span className="material-symbols-outlined text-[var(--empire-cream)]/20 text-2xl">military_tech</span>
            </div>
          </div>
        )}
      </div>

      {/* List View (4th onwards) */}
      <div className="flex flex-col gap-2 flex-grow">
        {remainingEntries.map((entry, idx) => {
          const isCurrentUser = entry.id === currentUserId;
          return (
            <div 
              key={entry.id} 
              className={`flex items-center gap-4 p-3 rounded-xl transition-all border ${
                isCurrentUser 
                  ? 'bg-[#ffdcc5]/20 border-[var(--empire-gold)]/40 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-[var(--bg-elevated)] hover:border-[var(--bg-border)]/40'
              }`}
            >
              <div className="w-8 font-display text-xs font-bold text-center text-[var(--empire-cream)]/40">
                {idx + 4}
              </div>
              <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--bg-border)]/30">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-xs font-bold text-[var(--empire-gold)]">
                    {(entry.display_name ?? 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-grow">
                <span className={`font-body text-sm font-semibold ${isCurrentUser ? 'text-[var(--empire-gold)] font-bold' : 'text-[var(--empire-cream)]'}`}>
                  {entry.display_name ?? 'Anonymous Rescuer'}
                </span>
                {isCurrentUser && (
                  <span className="ml-2 px-1.5 py-0.5 bg-[#ffdcc5] text-[var(--empire-gold-dim)] rounded-md font-body text-[9px] font-bold uppercase tracking-wider">
                    you
                  </span>
                )}
                <div className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">
                  {entry.actions_taken} actions logged
                </div>
              </div>
              <div className="text-right font-data text-xs font-bold text-[var(--life-teal)] flex items-center gap-1">
                <span>{entry.weekly_points.toLocaleString()}</span>
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              </div>
            </div>
          );
        })}

        {combined.length === 0 && (
          <div className="text-center py-12 text-[var(--empire-cream)]/40 font-body text-sm">
            No entries logged this week. Start logging sightings or participating in events to rank!
          </div>
        )}
      </div>
    </div>
  );
}
