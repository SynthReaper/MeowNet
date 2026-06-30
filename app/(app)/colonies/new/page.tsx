'use client';
// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/(app)/colonies/new/page.tsx — Register a new cat colony

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createColony } from '@/lib/actions/colonies';

export default function NewColonyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [populationEstimate, setPopulationEstimate] = useState(5);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        alert(`Failed to retrieve coordinates: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Colony name is required.');
      return;
    }
    if (!lat || !lng) {
      setError('Coordinates (latitude & longitude) are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('population_estimate', String(populationEstimate));
      formData.append('lat', lat);
      formData.append('lng', lng);

      const res = await createColony(formData);
      if (res.success) {
        router.push('/colonies');
        router.refresh();
      } else {
        setError(res.error || 'Failed to register colony.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow w-full max-w-2xl mx-auto px-4 py-10 md:py-16 flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--empire-cream)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--empire-gold)]">add_business</span>
          <span>Register Cat Colony</span>
        </h1>
        <p className="font-body text-xs text-[var(--empire-cream)]/60 mt-1.5">
          Map a local community cat group to start tracking Trap-Neuter-Return progress and coordinate caretaker updates.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-body text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base animate-shake">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[var(--bg-border)] rounded-2xl shadow-ambient p-6 flex flex-col gap-5">
        {/* Colony Name */}
        <div>
          <label className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider block mb-1.5">Colony Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Alleyway Tabby Clan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-3 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider block mb-1.5">Colony Description</label>
          <textarea
            rows={3}
            placeholder="Details about feeding schedules, shelter setups, or general colony behavior..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-3 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none transition-all resize-none"
          />
        </div>

        {/* Population Estimate */}
        <div>
          <label className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider block mb-1.5">Estimated Population (Total Cats)</label>
          <input
            type="number"
            min="1"
            required
            value={populationEstimate}
            onChange={(e) => setPopulationEstimate(parseInt(e.target.value) || 0)}
            className="w-full max-w-[200px] bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-3 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none transition-all"
          />
        </div>

        {/* Coordinates */}
        <div className="border-t border-[var(--bg-border)]/20 pt-4 mt-2">
          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider">Colony Coordinates</label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-[10px] font-bold text-[var(--life-teal)] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">my_location</span>
              <span>Use Current Location</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] font-bold text-[var(--empire-cream)]/40 block mb-1">Latitude</span>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 40.7128"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-3 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none transition-all"
              />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[var(--empire-cream)]/40 block mb-1">Longitude</span>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. -74.0060"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-3 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end text-xs font-bold uppercase mt-4">
          <button
            type="button"
            onClick={() => router.push('/colonies')}
            className="px-4 py-2 bg-transparent text-[var(--empire-cream)]/50 hover:bg-[var(--bg-elevated)] rounded-xl border border-transparent cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[var(--empire-gold)] text-white rounded-xl hover:bg-[#e6b020] cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Registering…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Submit Colony</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
