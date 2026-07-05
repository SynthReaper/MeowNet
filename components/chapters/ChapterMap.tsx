'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface ChapterPin {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly lat?: number;
  readonly lng?: number;
}

interface Props {
  readonly chapters?: ChapterPin[];
}

export default function ChapterMap({ chapters = [] }: Props) {
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

  // Coordinates mapped to major regional zones or default to standard US/World grids
  const getCoordinates = (region: string) => {
    const r = region.toLowerCase();
    if (r.includes('north') || r.includes('new york')) return { lat: 40.7128, lng: -74.0060 };
    if (r.includes('west') || r.includes('california')) return { lat: 34.0522, lng: -118.2437 };
    if (r.includes('south') || r.includes('texas')) return { lat: 29.7604, lng: -95.3698 };
    if (r.includes('east') || r.includes('florida')) return { lat: 25.7617, lng: -80.1918 };
    return { lat: 39.8283, lng: -98.5795 }; // Center of US
  };

  return (
    <div className="w-full h-[350px] rounded-2xl overflow-hidden border border-white/10 relative z-10 shadow-lg">
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={3}
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

        {chapters.map((ch) => {
          const coords = getCoordinates(ch.region);
          return (
            <Circle
              key={ch.id}
              center={[coords.lat, coords.lng]}
              radius={200000} // radius in meters
              pathOptions={{
                fillColor: 'var(--life-teal)',
                color: 'var(--life-teal)',
                weight: 1,
                opacity: 0.2,
                fillOpacity: 0.15,
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
export type { ChapterPin };
