'use client';
// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/weather/page.tsx — Feline Weather Watch & Shelter Safety Index

import { useState, useEffect } from 'react';

interface WeatherReport {
  neighborhood: string;
  condition: string;
  notes: string;
}

interface DistrictWeather {
  neighborhood: string;
  temp: number;
  apparentTemp: number;
  humidity: number;
  precipProb: number;
  todayMax: number;
  todayMin: number;
  comfort: string;
  status: string;
  icon: string;
  color: string;
  bg: string;
  description: string;
  windspeed: number;
}

const DISTRICT_COORDS = [
  { neighborhood: 'Northside District', lat: 40.80, lng: -73.95 },
  { neighborhood: 'West End',           lat: 40.75, lng: -74.00 },
  { neighborhood: 'Downtown Core',      lat: 40.72, lng: -74.01 },
  { neighborhood: 'East River Wharf',   lat: 40.71, lng: -73.98 },
  { neighborhood: 'Southside Ridge',    lat: 40.68, lng: -73.97 },
];

const DISTRICT_FALLBACK: DistrictWeather[] = DISTRICT_COORDS.map(d => ({
  neighborhood: d.neighborhood,
  temp: 65, apparentTemp: 63, humidity: 55, precipProb: 10,
  todayMax: 72, todayMin: 58,
  comfort: 'Good', status: 'Safe', icon: 'wb_sunny',
  color: 'text-[var(--life-teal)]', bg: 'bg-[var(--life-teal)]/10 border-[var(--life-teal)]/30',
  description: 'Clear sky', windspeed: 5,
}));

function classify(temp: number) {
  if (temp < 35) return { comfort: 'Hazardous', status: 'Alert',   icon: 'severe_cold',     color: 'text-[#ba1a1a]',            bg: 'bg-red-500/10 border-red-500/30' };
  if (temp < 45) return { comfort: 'Poor',      status: 'Alert',   icon: 'ac_unit',          color: 'text-[#ba1a1a]',            bg: 'bg-red-500/10 border-red-500/30' };
  if (temp < 55) return { comfort: 'Fair',      status: 'Caution', icon: 'cloud',            color: 'text-[var(--empire-gold)]', bg: 'bg-[var(--empire-gold)]/10 border-[var(--empire-gold)]/30' };
  if (temp < 85) return { comfort: 'Good',      status: 'Safe',    icon: 'wb_sunny',         color: 'text-[var(--life-teal)]',   bg: 'bg-[var(--life-teal)]/10 border-[var(--life-teal)]/30' };
  return           { comfort: 'Hot',       status: 'Caution', icon: 'device_thermostat', color: 'text-[var(--empire-gold)]', bg: 'bg-[var(--empire-gold)]/10 border-[var(--empire-gold)]/30' };
}

// Derive the overall alert from first district data
function buildAlertText(districts: DistrictWeather[]): { title: string; body: string; severe: boolean } {
  const alerts = districts.filter(d => d.status === 'Alert');
  if (alerts.length > 0) {
    const names = alerts.map(d => d.neighborhood).join(' & ');
    const minTemp = Math.min(...alerts.map(d => d.temp));
    return {
      severe: true,
      title: `Extreme Cold Alert: ${names}`,
      body: `Temperatures as low as ${minTemp}°F detected. Outdoor stray comfort is rated Poor or worse. Insulated cat shelters with dry straw bedding are urgently required.`,
    };
  }
  const cautions = districts.filter(d => d.status === 'Caution');
  if (cautions.length > 0) {
    return {
      severe: false,
      title: `Weather Advisory: ${cautions.map(d => d.neighborhood).join(', ')}`,
      body: `Conditions are fair but below comfortable range. Monitor outdoor colony feeding stations and check shelter insulation.`,
    };
  }
  const avgTemp = Math.round(districts.reduce((s, d) => s + d.temp, 0) / districts.length);
  return {
    severe: false,
    title: `All Districts Safe — ${avgTemp}°F Average`,
    body: 'Current conditions are suitable for community cats. Maintain regular feeding schedules and monitor for temperature drops.',
  };
}

export default function WeatherPage() {
  const [districts, setDistricts] = useState<DistrictWeather[]>(DISTRICT_FALLBACK);
  const [reports,   setReports]   = useState<WeatherReport[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('meownet_weather_reports');
    if (stored) {
      try { setReports(JSON.parse(stored)); }
      catch { /* ignore */ }
    } else {
      const initial = [
        { neighborhood: 'Northside District', condition: 'Freezing rain',  notes: 'Cats crowding near the heating vents behind the old bakery.' },
        { neighborhood: 'East River Wharf',   condition: 'High wind chill', notes: 'Colony 4 shelters are holding up, but fresh straw is needed.' },
      ];
      setReports(initial);
      localStorage.setItem('meownet_weather_reports', JSON.stringify(initial));
    }

    async function fetchLiveWeather() {
      try {
        const lats = DISTRICT_COORDS.map(c => c.lat).join(',');
        const lngs = DISTRICT_COORDS.map(c => c.lng).join(',');
        const res  = await fetch(`/api/weather?lats=${lats}&lngs=${lngs}`);
        if (!res.ok) throw new Error('proxy failed');
        const data: { results: Array<{
          temp: number; apparentTemp: number; humidity: number; precipProb: number;
          todayMax: number; todayMin: number; windspeed: number;
          weathercode: number; description: string; icon: string;
        }> } = await res.json();

        const updated: DistrictWeather[] = DISTRICT_COORDS.map((coord, i) => {
          const w = data.results?.[i];
          if (!w) return DISTRICT_FALLBACK[i];
          const cls = classify(w.temp);
          return {
            neighborhood: coord.neighborhood,
            temp:         w.temp,
            apparentTemp: w.apparentTemp,
            humidity:     w.humidity,
            precipProb:   w.precipProb,
            todayMax:     w.todayMax,
            todayMin:     w.todayMin,
            windspeed:    w.windspeed,
            description:  w.description,
            ...cls,
          };
        });
        setDistricts(updated);
      } catch (err) {
        console.error('Failed to fetch live weather, using fallback data:', err);
      } finally {
        setLoadingLive(false);
      }
    }

    fetchLiveWeather();
  }, []);

  const alert = buildAlertText(districts);

  const [form, setForm]       = useState({ neighborhood: 'Northside District', condition: '', notes: '' });
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.condition || !form.notes) return;
    const newReport = { neighborhood: form.neighborhood, condition: form.condition, notes: form.notes };
    const updated = [newReport, ...reports];
    setReports(updated);
    localStorage.setItem('meownet_weather_reports', JSON.stringify(updated));
    setSuccess(true);
    setForm({ neighborhood: 'Northside District', condition: '', notes: '' });
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl font-normal">thermostat</span>
          <span>Feline Weather Safety Watch</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Live neighborhood climate indexes powered by Open-Meteo — tracking shelter safety for community cat colonies worldwide.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Area (8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">

          {/* Active Weather Alert Hero — dynamic from live data */}
          <div className={`bg-white p-6 rounded-2xl shadow-ambient border flex flex-col md:flex-row items-center gap-6 ${alert.severe ? 'border-red-200 dark:border-red-950/40' : 'border-[var(--empire-gold)]/30'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${alert.severe ? 'bg-red-500/10 text-[#ba1a1a] dark:text-red-400' : 'bg-[var(--empire-gold)]/10 text-[var(--empire-gold)]'}`}>
              <span className={`material-symbols-outlined text-4xl ${alert.severe ? 'animate-pulse' : ''}`}>
                {alert.severe ? 'severe_cold' : 'pets'}
              </span>
            </div>
            <div className="flex-grow space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${alert.severe ? 'bg-red-600' : 'bg-[var(--empire-gold)]'}`} />
                <span className={`font-body text-[10px] font-bold uppercase tracking-widest ${alert.severe ? 'text-[#ba1a1a] dark:text-red-400' : 'text-[var(--empire-gold)]'}`}>
                  {loadingLive ? 'Loading Live Data…' : alert.severe ? 'Active System Alert' : 'Live Status: All Clear'}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--empire-cream)]">
                {loadingLive ? 'Fetching real-time weather…' : alert.title}
              </h3>
              <p className="font-body text-xs text-[var(--empire-cream)]/70 leading-relaxed">
                {loadingLive ? 'Connecting to Open-Meteo API via server proxy…' : alert.body}
              </p>
            </div>
          </div>

          {/* District Comfort Index Grid */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--empire-gold)]">radar</span>
                <span>District Feline Comfort Index</span>
              </div>
              {loadingLive ? (
                <span className="text-[10px] text-[var(--empire-gold)] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--empire-gold)] animate-ping" />
                  Live Syncing…
                </span>
              ) : (
                <span className="text-[10px] text-[var(--life-teal)] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  Open-Meteo Live Feed
                </span>
              )}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {districts.map((dist, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-2 transition-shadow hover:shadow-md ${dist.bg}`}>
                  {/* Header row */}
                  <div className="flex justify-between items-start">
                    <span className="font-body text-xs font-bold text-[var(--empire-cream)] truncate max-w-[130px]">{dist.neighborhood}</span>
                    <span className={`material-symbols-outlined text-xl ${dist.color}`}>{dist.icon}</span>
                  </div>

                  {/* Temperature */}
                  <div className="flex items-end gap-1">
                    <span className="font-data text-3xl font-bold text-[var(--empire-cream)]">{dist.temp}°</span>
                    <span className="font-body text-[10px] text-[var(--empire-cream)]/50 mb-1">F</span>
                    <span className="font-body text-[10px] text-[var(--empire-cream)]/40 mb-1 ml-1">
                      feels {dist.apparentTemp}°
                    </span>
                  </div>

                  {/* Description */}
                  <span className="font-body text-[10px] text-[var(--empire-cream)]/60 italic">{dist.description}</span>

                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[var(--bg-border)]/20">
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-xs text-[var(--empire-cream)]/40">water_drop</span>
                      <span className="font-data text-[10px] font-bold text-[var(--empire-cream)]/70">{dist.humidity}%</span>
                      <span className="font-body text-[8px] text-[var(--empire-cream)]/40">Humidity</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-xs text-[var(--empire-cream)]/40">umbrella</span>
                      <span className="font-data text-[10px] font-bold text-[var(--empire-cream)]/70">{dist.precipProb}%</span>
                      <span className="font-body text-[8px] text-[var(--empire-cream)]/40">Rain Prob</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-xs text-[var(--empire-cream)]/40">air</span>
                      <span className="font-data text-[10px] font-bold text-[var(--empire-cream)]/70">{dist.windspeed}</span>
                      <span className="font-body text-[8px] text-[var(--empire-cream)]/40">mph Wind</span>
                    </div>
                  </div>

                  {/* Daily range */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-body text-[9px] text-[var(--empire-cream)]/40">
                      ↑{dist.todayMax}° / ↓{dist.todayMin}°
                    </span>
                    <span className={`font-body text-[10px] font-bold uppercase tracking-wider ${dist.color}`}>
                      {dist.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volunteer Reports Feed */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--life-teal)]">feed</span>
              <span>Recent Field Conditions Reports</span>
            </h2>
            <div className="flex flex-col gap-3">
              {reports.map((rep, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-body text-xs font-bold text-[var(--empire-gold)]">{rep.neighborhood}</span>
                    <span className="px-2 py-0.5 bg-white/60 dark:bg-black/25 text-[var(--empire-cream)]/60 text-[9px] font-bold rounded-md uppercase tracking-wider border border-[var(--bg-border)]/10">
                      {rep.condition}
                    </span>
                  </div>
                  <p className="font-body text-xs text-[var(--empire-cream)]/75 leading-relaxed italic">
                    &ldquo;{rep.notes}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar (4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">

          {/* Open-Meteo Attribution */}
          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)] flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--empire-gold)] text-2xl">cloud_sync</span>
            <div>
              <p className="font-body text-[10px] font-bold text-[var(--empire-cream)] uppercase tracking-wider">Live Data Source</p>
              <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer"
                 className="font-body text-xs text-[var(--empire-gold)] hover:underline">
                Open-Meteo Free Weather API
              </a>
              <p className="font-body text-[9px] text-[var(--empire-cream)]/40 mt-0.5">
                Apparent temp · Humidity · Precip probability · WMO weather codes
              </p>
            </div>
          </div>

          {/* Rescue Tips */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h3 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--life-teal)]" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
              <span>Rescue Cold-Safety Tips</span>
            </h3>
            <ul className="flex flex-col gap-4">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-amber-500 flex-shrink-0 text-xl">grass</span>
                <div>
                  <h4 className="font-body text-xs font-bold text-[var(--empire-cream)]">Use Straw, Not Hay</h4>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-relaxed mt-0.5">
                    Straw repels moisture and makes great insulation. Hay absorbs moisture, molds, and freezes.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-blue-400 flex-shrink-0 text-xl">water_drop</span>
                <div>
                  <h4 className="font-body text-xs font-bold text-[var(--empire-cream)]">Elevated Plastic Bowls</h4>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-relaxed mt-0.5">
                    Keep food and water bowls off the cold ground. Use thick plastic — metal bowls can trap cat tongues when frozen.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-[#ab2c5d] flex-shrink-0 text-xl">directions_car</span>
                <div>
                  <h4 className="font-body text-xs font-bold text-[var(--empire-cream)]">Tap the Hood First</h4>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-relaxed mt-0.5">
                    Stray cats often crawl under car hoods seeking engine heat. Tap loudly before starting your car.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-[var(--empire-gold)] flex-shrink-0 text-xl">umbrella</span>
                <div>
                  <h4 className="font-body text-xs font-bold text-[var(--empire-cream)]">Watch Rain Probability</h4>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-relaxed mt-0.5">
                    When rain probability exceeds 60%, pre-check that colony shelters have watertight roofing and dry interiors.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Submit Report Form */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h3 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--empire-gold)]">edit_note</span>
              <span>Report Local Weather</span>
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Select Neighborhood</label>
                <select
                  value={form.neighborhood}
                  onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                >
                  {DISTRICT_COORDS.map(d => (
                    <option key={d.neighborhood} value={d.neighborhood}>{d.neighborhood}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Observed Condition</label>
                <input
                  type="text" value={form.condition}
                  onChange={e => setForm({ ...form, condition: e.target.value })}
                  placeholder="e.g. Freezing gusts, heavy wind"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                  maxLength={50} required
                />
              </div>

              <div>
                <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Field Observations</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Water bowl frozen over, 3 stray cats huddled under the deck…"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all resize-none h-24"
                  maxLength={300} required
                />
              </div>

              {success && (
                <div className="text-xs text-[var(--life-teal)] font-semibold flex items-center gap-1.5 py-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Report submitted! Thank you for helping cats stay safe.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white font-body text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">campaign</span>
                <span>Send Weather Report</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
