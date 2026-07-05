'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface IncidentMarker {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly incident_type: string;
  readonly severity: string;
  readonly description: string;
  readonly status: string;
}

interface Props {
  readonly incidents?: IncidentMarker[];
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#3b82f6',      // Blue
  medium: '#008080',   // Teal
  high: '#d4af37',     // Gold
  critical: '#ef4444', // Red
};

const createCircleMarker = (severity: string) => {
  const color = SEVERITY_COLORS[severity] || '#944a00';
  return L.divIcon({
    html: `
      <div class="emergency-marker">
        <div class="emergency-ping" style="background-color: ${color};"></div>
        <div class="emergency-dot" style="background-color: ${color}; border: 2px solid #000;"></div>
      </div>
    `,
    className: 'custom-emergency-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export default function IncidentMap({ incidents = [] }: Props) {
  const [mapTheme, setMapTheme] = useState('light');

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

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-white/10 relative z-10 shadow-lg">
      <MapContainer
        center={[20, 0]}
        zoom={2}
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

        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.lat, inc.lng]}
            icon={createCircleMarker(inc.severity)}
          >
            <Popup>
              <div className="p-2 text-[var(--empire-cream)] min-w-[200px] flex flex-col gap-1.5 font-body">
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full self-start"
                  style={{
                    backgroundColor: `${SEVERITY_COLORS[inc.severity]}33`,
                    color: SEVERITY_COLORS[inc.severity],
                    border: `1px solid ${SEVERITY_COLORS[inc.severity]}55`,
                  }}
                >
                  {inc.severity}
                </span>
                <div className="text-xs font-bold text-[var(--empire-cream)] font-display">
                  {inc.incident_type.replace('_', ' ')}
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-3">
                  {inc.description}
                </p>
                <div className="text-[9px] font-mono text-gray-500 mt-1 capitalize">
                  Status: {inc.status}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
export type { IncidentMarker };
