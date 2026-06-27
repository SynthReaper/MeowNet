'use client';
// components/map/CatMap/index.tsx — React-Leaflet map with cat markers

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createClient } from '@/lib/supabase/client';
import { useCatInserts } from '@/hooks/useRealtime';
import { fuzzCoordinates } from '@/lib/geo/utils';

export interface CatMarkerData {
  id: string;
  lat: number;
  lng: number;
  status: string;
  name?: string | null;
  breed_estimate?: string | null;
  photo_url: string;
  health_notes?: string | null;
  created_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  adoptable: '#006a63', // Deep Emerald Teal
  tnr_needed: '#ab2c5d', // Dusty Wine Red
  stray: '#ba1a1a',      // Bold Crimson
  adopted: '#818cf8',    // Soft Indigo
  fostered: '#f28c38',   // Sunlit Amber
};

// Custom pulsing radar blip icon
const createRadarIcon = (status: string) => {
  const color = STATUS_COLORS[status] || '#944a00';
  return L.divIcon({
    html: `
      <div class="radar-marker">
        <div class="radar-pulse" style="background-color: ${color};"></div>
        <div class="radar-dot" style="background-color: ${color};"></div>
      </div>
    `,
    className: 'custom-radar-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Map controller to handle panning/flying to a selected cat
function MapController({ selectedCat }: { selectedCat: CatMarkerData | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCat) {
      map.flyTo([selectedCat.lat, selectedCat.lng], 16, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [selectedCat, map]);

  return null;
}

function MarkerLayer({ 
  cats, 
  onNewCat,
  onSelectCat 
}: { 
  cats: CatMarkerData[]; 
  onNewCat: () => void;
  onSelectCat?: (id: string | null) => void;
}) {
  useCatInserts(useCallback(() => onNewCat(), [onNewCat]));

  return (
    <>
      {cats.map((cat) => (
        <Marker
          key={cat.id}
          position={[cat.lat, cat.lng]}
          icon={createRadarIcon(cat.status)}
          eventHandlers={{
            click: () => {
              onSelectCat?.(cat.id);
            },
          }}
        />
      ))}
    </>
  );
}

interface CatMapProps {
  cats?: CatMarkerData[];
  onNewCat?: () => void;
  selectedCatId?: string | null;
  onSelectCat?: (id: string | null) => void;
  showHeatmap?: boolean;
}

export default function CatMap({ cats: propCats, onNewCat, selectedCatId, onSelectCat, showHeatmap = false }: CatMapProps) {
  const [cats, setCats] = useState<CatMarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapTheme, setMapTheme] = useState('light');
  const supabase = createClient();

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setMapTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const updatedTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setMapTheme(updatedTheme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const fetchCats = useCallback(async () => {
    if (propCats) {
      setCats(propCats);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('cats')
      .select('id, status, name, breed_estimate, photo_url, location, location_privacy, health_notes, created_at')
      .limit(500)
      .order('created_at', { ascending: false });

    if (error) { console.error('fetchCats error:', error); return; }

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
  }, [supabase, propCats]);

  useEffect(() => {
    if (propCats) {
      setCats(propCats);
      setLoading(false);
    } else {
      fetchCats();
    }
  }, [fetchCats, propCats]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-void)]">
        <span className="font-body text-sm font-semibold text-[var(--empire-gold)] animate-pulse">Loading map assets…</span>
      </div>
    );
  }

  const handleNewCatTrigger = () => {
    if (onNewCat) {
      onNewCat();
    } else {
      fetchCats();
    }
  };

  const selectedCat = cats.find(c => c.id === selectedCatId) || null;

  return (
    <MapContainer
      center={selectedCat ? [selectedCat.lat, selectedCat.lng] : [20, 0]}
      zoom={selectedCat ? 16 : 2}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      className="z-10"
    >
      <TileLayer
        key={mapTheme}
        url={
          mapTheme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        }
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <MapController selectedCat={selectedCat} />
      
      {showHeatmap ? (
        (() => {
          const grid: Record<string, { lat: number; lng: number; count: number }> = {};
          cats.forEach((cat) => {
            const latGrid = Math.round(cat.lat * 100) / 100;
            const lngGrid = Math.round(cat.lng * 100) / 100;
            const key = `${latGrid},${lngGrid}`;
            if (!grid[key]) {
              grid[key] = { lat: latGrid, lng: lngGrid, count: 0 };
            }
            grid[key].count += 1;
          });
          const densityGrid = Object.values(grid);
          const maxCount = Math.max(...densityGrid.map(c => c.count), 1);

          return densityGrid.map((cell, idx) => {
            const opacity = Math.min(0.8, 0.25 + (cell.count / maxCount) * 0.45);
            const radius = 250 + cell.count * 150;
            return (
              <Circle
                key={idx}
                center={[cell.lat, cell.lng]}
                radius={radius}
                pathOptions={{
                  fillColor: 'var(--empire-gold)',
                  color: 'var(--empire-gold)',
                  weight: 1,
                  opacity: 0.1,
                  fillOpacity: opacity,
                }}
              />
            );
          });
        })()
      ) : (
        <MarkerLayer cats={cats} onNewCat={handleNewCatTrigger} onSelectCat={onSelectCat} />
      )}
      
      {selectedCat && (
        <Popup
          position={[selectedCat.lat, selectedCat.lng]}
          eventHandlers={{
            remove: () => onSelectCat?.(null)
          }}
        >
          <div className="font-body min-w-[180px] p-1 flex flex-col gap-2 text-[var(--empire-cream)]">
            {selectedCat.photo_url && (
              <div className="w-full h-24 rounded-lg overflow-hidden border border-[var(--bg-border)]/30">
                <img
                  src={selectedCat.photo_url}
                  alt={selectedCat.name ?? 'Cat'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <div className="font-display text-xs font-bold text-[var(--empire-cream)]">
                {selectedCat.name ?? 'Unnamed Cat'}
              </div>
              {selectedCat.breed_estimate && (
                <div className="font-body text-[10px] text-[var(--empire-cream)]/60 mt-0.5">
                  {selectedCat.breed_estimate}
                </div>
              )}
              <div className="inline-block mt-1.5 px-2 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: STATUS_COLORS[selectedCat.status] ?? '#944a00' }}>
                {selectedCat.status.replace('_', ' ')}
              </div>
            </div>
            <a
              href={`/cats/${selectedCat.id}`}
              className="font-body text-[11px] font-bold text-[var(--empire-gold)] hover:text-[#e6b020] transition-colors mt-2 block no-underline"
            >
              View Full Profile →
            </a>
          </div>
        </Popup>
      )}
    </MapContainer>
  );
}
