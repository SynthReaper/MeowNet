'use client';
// components/forms/CreateEventForm/index.tsx

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent } from '@/lib/actions/events';

export default function CreateEventForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null!);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { 
        setLat(coords.latitude.toFixed(6)); 
        setLng(coords.longitude.toFixed(6)); 
        setLocating(false); 
      },
      () => setLocating(false),
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    const formData = new FormData(formRef.current);
    formData.set('lat', lat);
    formData.set('lng', lng);
    const result = await createEvent(formData);
    setIsPending(false);
    if (result.success) {
      router.push(`/events/${result.eventId}`);
    } else {
      setError(result.error === 'unauthorized' ? 'Please sign in first' : `Error: ${result.error}`);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      
      {/* Event Details Card */}
      <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
        <h2 className="font-display text-base text-[var(--empire-gold)] font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined font-normal">info</span>
          <span>Event Details</span>
        </h2>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
              Event Title <span className="text-[#ba1a1a]">*</span>
            </label>
            <input 
              type="text" 
              name="title" 
              required 
              maxLength={200} 
              placeholder="e.g. Community TNR Drive — Eastside"
              className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all duration-200"
            />
          </div>
          <div>
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea 
              name="description" 
              maxLength={1000} 
              rows={4} 
              placeholder="What should volunteers expect? Equipment needed? Meeting point?"
              className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all duration-200 resize-none font-body"
            />
          </div>
        </div>
      </div>

      {/* Date & Time Card */}
      <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
        <h2 className="font-display text-base text-[var(--empire-gold)] font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined font-normal">calendar_today</span>
          <span>Date & Time <span className="text-[#ba1a1a]">*</span></span>
        </h2>
        
        <input 
          type="datetime-local" 
          name="event_time" 
          required
          min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
          className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all duration-200"
        />
      </div>

      {/* Location Card */}
      <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
        <h2 className="font-display text-base text-[var(--empire-gold)] font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined font-normal">location_on</span>
          <span>Location <span className="text-[#ba1a1a]">*</span></span>
        </h2>

        <button 
          type="button" 
          onClick={detectLocation} 
          className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/20 font-body text-sm font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mb-4"
          disabled={locating}
        >
          <span className="material-symbols-outlined text-base">my_location</span>
          <span>{locating ? 'Detecting coordinates…' : 'Use My Current Location'}</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Latitude</label>
            <input 
              type="number" 
              step="any" 
              value={lat} 
              onChange={(e) => setLat(e.target.value)} 
              placeholder="51.5074" 
              required
              className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data"
            />
          </div>
          <div>
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Longitude</label>
            <input 
              type="number" 
              step="any" 
              value={lng} 
              onChange={(e) => setLng(e.target.value)} 
              placeholder="-0.1278" 
              required
              className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data"
            />
          </div>
        </div>
      </div>

      {/* Capacity Card */}
      <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
        <h2 className="font-display text-base text-[var(--empire-gold)] font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined font-normal">groups</span>
          <span>Volunteer Capacity <span className="text-[#ba1a1a]">*</span></span>
        </h2>
        
        <input 
          type="number" 
          name="capacity" 
          min={1} 
          max={500} 
          defaultValue={10} 
          required
          className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data"
        />
        <p className="font-body text-xs text-[var(--empire-cream)]/40 mt-2">
          Maximum number of volunteers who can RSVP to assist.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-4 font-body text-xs">
          {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={isPending}
        className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold py-3.5 rounded-full shadow-ambient flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">event</span>
        <span>{isPending ? 'Scheduling operation…' : 'Schedule TNR Operation (+5 pts)'}</span>
      </button>
    </form>
  );
}
