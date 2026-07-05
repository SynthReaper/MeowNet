'use client';
// components/emergency/IncidentReporter.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { reportIncident } from '@/lib/actions/emergency';

interface Props {
  readonly onReported?: () => void;
}

const SEVERITIES = [
  { value: 'low', label: 'Low Severity', desc: 'Non-urgent strays or minor welfare checks.' },
  { value: 'medium', label: 'Medium Severity', desc: 'Needs medical or trapping attention soon.' },
  { value: 'high', label: 'High Severity', desc: 'Active injury, sickness, or immediate safety threat.' },
  { value: 'critical', label: 'Critical / Life-Threatening', desc: 'Extreme crisis, bleeding, abuse, or disaster.' },
];

const TYPES = [
  { value: 'injury', label: 'Active Injury', icon: 'healing' },
  { value: 'disaster', label: 'Disaster Area', icon: 'flood' },
  { value: 'abuse', label: 'Abuse Report', icon: 'gavel' },
  { value: 'stray_emergency', label: 'Stray Emergency', icon: 'pets' },
  { value: 'medical', label: 'Medical Sickness', icon: 'medical_services' },
  { value: 'lost_cat', label: 'Lost / Found Cat', icon: 'search' },
];

export default function IncidentReporter({ onReported }: Props) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [type, setType] = useState('stray_emergency');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).slice(0, 5));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append('incident_type', type);
      formData.append('severity', severity);
      formData.append('description', description);
      if (lat) formData.append('lat', lat);
      if (lng) formData.append('lng', lng);

      files.forEach((file) => {
        formData.append('photos', file);
      });

      const res = await reportIncident(formData);
      if (res.success) {
        setMessage('Crisis incident logged successfully! Real-time alerts dispatched.');
        setTimeout(() => {
          setMessage(null);
          if (onReported) onReported();
          // Reset form
          setStep(1);
          setDescription('');
          setLat('');
          setLng('');
          setFiles([]);
        }, 3000);
      } else {
        setMessage(res.error || 'Failed to submit incident report');
      }
    });
  };

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Report Crisis Incident</h3>
          <p className="text-xs text-gray-400 mt-1">Logs a regional crisis. Incident location will snap to the fuzzed 0.005 privacy grid.</p>
        </div>
        <div className="text-xs font-mono text-[var(--empire-gold)]">Step {step} of 3</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Select Incident Type</label>
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    type === t.value
                      ? 'bg-[var(--life-teal)]/20 border-[var(--life-teal)] text-[var(--life-teal)]'
                      : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{t.icon}</span>
                  <span className="text-xs font-bold">{t.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-4 bg-white/10 hover:bg-white/15 text-[var(--empire-cream)] py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Select Severity Level</label>
            <div className="flex flex-col gap-3">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    severity === s.value
                      ? 'bg-[var(--empire-gold)]/10 border-[var(--empire-gold)] shadow-[0_0_12px_rgba(212,175,55,0.1)]'
                      : 'bg-black/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--empire-cream)]">{s.label}</span>
                    {severity === s.value && (
                      <span className="material-symbols-outlined text-[var(--empire-gold)] text-base">radio_button_checked</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{s.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 bg-white/10 hover:bg-white/15 text-[var(--empire-cream)] py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Incident Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Include description, condition, context, specific tags or identifiers..."
                className="w-full h-28 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Latitude (Optional)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 40.7128"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Longitude (Optional)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. -74.0060"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Photos (Up to 5)</label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-xs text-gray-300 font-bold uppercase cursor-pointer transition-all">
                  Choose Files
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {files.length > 0 && (
                  <span className="text-xs text-[var(--life-teal)] font-mono">{files.length} photo(s) selected</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isPending}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-[var(--life-teal)] text-white hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className="text-center text-xs font-bold text-[var(--empire-gold)] mt-2">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
