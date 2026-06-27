'use client';

// components/map/ModeratorHotspotsMap.tsx — Interactive Moderator Hotspots Map
import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Cat {
  id: string;
  name: string;
  status: 'stray' | 'tnr' | 'adoptable' | 'adopted';
  breed_estimate: string | null;
  age_estimate: string | null;
  owner_id: string | null;
  created_at: string;
  photo_url: string | null;
  is_verified: boolean;
  health_flags: string[] | null;
  health_notes: string | null;
  sterilized: boolean;
  vaccinated: boolean;
  microchipped: boolean;
  contact_info: string | null;
  bcs_estimate: number | null;
  color: string | null;
  shelter_url: string | null;
  breed_confidence: number | null;
  location: any;
}

interface TNREvent {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  status: 'pending' | 'open' | 'cancelled';
  created_at: string;
  cats_tnrd_count: number;
  event_time: string;
  organizer_id: string;
  location: any;
}

interface ModeratorHotspotsMapProps {
  cats: Cat[];
  events: TNREvent[];
  onToggleCatVerified: (catId: string, current: boolean) => void;
  onModerateEvent: (eventId: string, action: 'approve' | 'cancel') => void;
  onSelectCat: (cat: Cat) => void;
  onSelectEvent: (event: TNREvent) => void;
  actionLoadingId: string | null;
}

const parseLocation = (loc: any) => {
  let lat = 0;
  let lng = 0;
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
  return { lat, lng };
};

const createCatIcon = (status: string, isVerified: boolean) => {
  // Emerald for verified, crimson for unverified stray
  const color = isVerified
    ? '#006a63' // Deep Emerald Teal
    : status === 'tnr'
    ? '#f28c38' // Sunlit Amber
    : '#ba1a1a'; // Bold Crimson

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span class="material-symbols-outlined" style="font-size: 14px; color: white; font-weight: bold; line-height: 1;">pets</span>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createEventIcon = (status: string) => {
  const color = status === 'open' ? '#944a00' : status === 'pending' ? '#f28c38' : '#ba1a1a';
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span class="material-symbols-outlined" style="font-size: 14px; color: white; font-weight: bold; line-height: 1;">calendar_today</span>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function AutoFitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && (bounds as L.LatLngExpression[]).length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function ModeratorHotspotsMap({
  cats,
  events,
  onToggleCatVerified,
  onModerateEvent,
  onSelectCat,
  onSelectEvent,
  actionLoadingId,
}: ModeratorHotspotsMapProps) {
  const mappedCats = useMemo(() => {
    return cats
      .map((c) => {
        const { lat, lng } = parseLocation(c.location);
        return { ...c, lat, lng };
      })
      .filter((c) => c.lat !== 0 && c.lng !== 0);
  }, [cats]);

  const mappedEvents = useMemo(() => {
    return events
      .map((e) => {
        const { lat, lng } = parseLocation(e.location);
        return { ...e, lat, lng };
      })
      .filter((e) => e.lat !== 0 && e.lng !== 0);
  }, [events]);

  const bounds = useMemo(() => {
    const coords: L.LatLngExpression[] = [];
    mappedCats.forEach((c) => coords.push([c.lat, c.lng]));
    mappedEvents.forEach((e) => coords.push([e.lat, e.lng]));
    if (coords.length === 0) return null;
    return L.latLngBounds(coords);
  }, [mappedCats, mappedEvents]);

  // Default coordinate if empty (e.g. New York)
  const center: L.LatLngExpression = [40.75, -73.99];

  return (
    <div className="w-full h-[600px] rounded-2xl border border-[var(--bg-border)] overflow-hidden shadow-ambient relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bounds && <AutoFitBounds bounds={bounds as any} />}

        {/* Cats Markers */}
        {mappedCats.map((cat) => (
          <Marker
            key={`cat-${cat.id}`}
            position={[cat.lat, cat.lng]}
            icon={createCatIcon(cat.status, cat.is_verified)}
          >
            <Popup>
              <div className="p-2 min-w-[220px] flex flex-col gap-2 font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-surface)]">
                <div className="flex gap-2 items-start border-b border-zinc-200 dark:border-zinc-700 pb-2">
                  {cat.photo_url ? (
                    <img
                      src={cat.photo_url}
                      alt={cat.name}
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <span className="material-symbols-outlined text-sm">pets</span>
                    </div>
                  )}
                  <div>
                    <h5 className="font-bold font-display text-sm m-0 leading-tight">
                      {cat.name || 'Unnamed Sighting'}
                    </h5>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold block mt-0.5">
                      {cat.breed_estimate || 'Unknown Breed'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-[10px]">
                  <div>
                    <span className="text-zinc-500 font-semibold uppercase">Status:</span>{' '}
                    <span className="font-bold capitalize">{cat.status}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold uppercase">Verification:</span>{' '}
                    <span className={`font-bold ${cat.is_verified ? 'text-teal-600' : 'text-red-500'}`}>
                      {cat.is_verified ? 'Verified' : 'Awaiting Audit'}
                    </span>
                  </div>
                  {cat.health_flags && cat.health_flags.length > 0 && (
                    <div>
                      <span className="text-zinc-500 font-semibold uppercase">Health Flags:</span>{' '}
                      <span className="text-red-500 font-semibold">{cat.health_flags.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 justify-end mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => onSelectCat(cat)}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md font-bold text-[9px] uppercase cursor-pointer hover:bg-zinc-200"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => onToggleCatVerified(cat.id, cat.is_verified)}
                    disabled={actionLoadingId === `cat-verify-${cat.id}`}
                    className={`px-2 py-1 border text-[9px] font-bold uppercase rounded-md cursor-pointer disabled:opacity-50 ${
                      cat.is_verified
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-emerald-600 border-emerald-500 text-white'
                    }`}
                  >
                    {cat.is_verified ? 'Unverify' : 'Verify'}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* TNR Campaigns Markers */}
        {mappedEvents.map((ev) => (
          <Marker
            key={`event-${ev.id}`}
            position={[ev.lat, ev.lng]}
            icon={createEventIcon(ev.status)}
          >
            <Popup>
              <div className="p-2 min-w-[220px] flex flex-col gap-2 font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-surface)]">
                <div className="border-b border-zinc-200 dark:border-zinc-700 pb-2">
                  <h5 className="font-bold font-display text-sm m-0 leading-tight">
                    📅 {ev.title}
                  </h5>
                  <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5">
                    TNR Campaign
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-[10px]">
                  <div>
                    <span className="text-zinc-500 font-semibold uppercase">Status:</span>{' '}
                    <span className="font-bold capitalize">{ev.status}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold uppercase">Capacity:</span>{' '}
                    <span className="font-bold">{ev.capacity} Volunteers</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold uppercase">TNR'd count:</span>{' '}
                    <span className="font-bold">{ev.cats_tnrd_count} Cats</span>
                  </div>
                </div>

                <div className="flex gap-1.5 justify-end mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => onSelectEvent(ev)}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md font-bold text-[9px] uppercase cursor-pointer hover:bg-zinc-200"
                  >
                    View HQ
                  </button>

                  {ev.status !== 'open' && (
                    <button
                      onClick={() => onModerateEvent(ev.id, 'approve')}
                      disabled={actionLoadingId === `event-mod-${ev.id}`}
                      className="px-2 py-1 bg-emerald-600 border border-emerald-500 text-white rounded-md font-bold text-[9px] uppercase cursor-pointer"
                    >
                      Open
                    </button>
                  )}

                  {ev.status !== 'cancelled' && (
                    <button
                      onClick={() => onModerateEvent(ev.id, 'cancel')}
                      disabled={actionLoadingId === `event-mod-${ev.id}`}
                      className="px-2 py-1 bg-red-600 border border-red-500 text-white rounded-md font-bold text-[9px] uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
