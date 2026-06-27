'use client';
// components/forms/LogCatForm/index.tsx — Full cat logging form

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logCat } from '@/lib/actions/cats';
import { HEALTH_FLAG_LABELS, type HealthFlag } from '@/lib/veterinary/triageRules';
import ConsentGate from '@/components/forms/ConsentGate';

const STATUS_OPTIONS = [
  { value: 'stray',      label: 'Stray',        desc: 'Unowned cat on the street' },
  { value: 'tnr_needed', label: 'TNR Needed',   desc: 'Unsterilized, needs TNR' },
  { value: 'adoptable',  label: 'Adoptable',     desc: 'Needs a forever home' },
  { value: 'fostered',   label: 'Fostered',      desc: 'In temporary foster care' },
];

const AGE_OPTIONS = ['kitten', 'juvenile', 'adult', 'senior'] as const;

export default function LogCatForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null!);
  const [step, setStep] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [selectedFlags, setSelectedFlags] = useState<HealthFlag[]>([]);
  const [locating, setLocating] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setShowAI(true);
  };

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { 
        setLat(coords.latitude.toFixed(6)); 
        setLng(coords.longitude.toFixed(6)); 
        setLocating(false); 
      },
      () => { 
        setError('Location access denied — enter manually'); 
        setLocating(false); 
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  const toggleFlag = (flag: HealthFlag) => {
    setSelectedFlags((prev) => prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]);
  };

  const validateStep = (currentStep: number) => {
    setError(null);
    if (currentStep === 1) {
      const fileInput = formRef.current?.querySelector('input[type="file"]') as HTMLInputElement;
      if (!fileInput?.files?.length) {
        setError('Please upload a photo of the cat to proceed.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!lat || !lng) {
        setError('Please enter both latitude and longitude coordinates.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;
    
    setIsPending(true);
    setError(null);

    const formData = new FormData(formRef.current);
    formData.set('lat', lat);
    formData.set('lng', lng);
    selectedFlags.forEach((f) => formData.append('health_flags', f));
    formData.set('consent_recorded', consentGranted ? 'true' : 'false');
    
    const isFuzzingEnabled = formRef.current?.querySelector('input[name="location_privacy"]') as HTMLInputElement;
    formData.set('location_privacy', isFuzzingEnabled?.checked ? 'area' : 'exact');

    const result = await logCat(formData);
    setIsPending(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push(`/cats/${result.catId}`), 1500);
    } else {
      setError(result.error === 'unauthorized' ? 'Please sign in to log cats' : `Error: ${result.error}`);
    }
  };

  if (success) return (
    <div className="bg-white rounded-2xl shadow-ambient border border-[var(--bg-border)] p-8 text-center max-w-md mx-auto my-12">
      <div className="flex justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
      </div>
      <h2 className="font-display text-2xl text-[var(--life-teal)] font-bold">Cat Sighting Logged!</h2>
      <p className="font-body text-sm text-[var(--empire-cream)]/70 mt-2">
        +10 Empire Points earned. Redirecting to profile…
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-0 py-8">
      {/* Header Info */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--empire-cream)] mb-2">Log a New Cat</h1>
        <p className="font-body text-base text-[var(--empire-gold)] font-semibold">You&apos;re doing great, hero!</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-[var(--bg-border)]/45 -z-10 transform -translate-y-1/2 rounded-full animate-pulse"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-[var(--empire-gold)] -z-10 transform -translate-y-1/2 rounded-full transition-all duration-300"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        ></div>

        {[
          { label: 'Photo', num: 1 },
          { label: 'Location', num: 2 },
          { label: 'Details', num: 3 },
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => step > s.num && setStep(s.num)}>
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-display text-base font-bold transition-all duration-200 ${
                step >= s.num 
                  ? 'border-[var(--empire-gold)] bg-[#ffdcc5] text-[var(--empire-gold-dim)]'
                  : 'border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--empire-cream)]/40'
              }`}
            >
              {s.num}
            </div>
            <span className={`font-body text-xs font-semibold ${step >= s.num ? 'text-[var(--empire-cream)]' : 'text-[var(--empire-cream)]/40'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Form Container */}
      <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-ambient border border-[var(--bg-border)] p-6 md:p-8 relative overflow-hidden">
        
        {/* Step 1: Photo */}
        <div className={`fade-in ${step === 1 ? 'block' : 'hidden'}`}>
          <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-2">1. Snap a Photo</h2>
          <p className="font-body text-sm text-[var(--empire-cream)]/60 mb-6">Let&apos;s get a good look at this new friend.</p>
          
          <div className="border-2 border-dashed border-[var(--bg-border)] rounded-2xl bg-[var(--bg-elevated)] min-h-[240px] p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-border)]/10 transition-colors relative group mb-4">
            <span className="material-symbols-outlined text-5xl text-[var(--empire-gold)] mb-2 group-hover:scale-105 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
              photo_camera
            </span>
            <span className="font-body text-sm font-semibold text-[var(--empire-cream)]">Click to upload or drag & drop</span>
            <span className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">JPEG, PNG or WebP format (max 5MB)</span>
            
            <input 
              type="file" 
              name="photo" 
              accept="image/jpeg,image/png,image/webp" 
              onChange={handlePhotoChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {previewUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border border-[var(--bg-border)] max-h-[300px]">
              <img src={previewUrl} alt="Cat preview" className="w-full h-full object-cover" />
            </div>
          )}

          <p className="font-body text-xs text-[var(--empire-cream)]/40 mb-6">
            All EXIF/GPS metadata is automatically stripped server-side to protect the exact location of vulnerable feline colonies.
          </p>

          {showAI && !consentGranted && (
            <div className="mb-6">
              <ConsentGate onAccept={() => setConsentGranted(true)} onDecline={() => { setShowAI(false); setConsentGranted(false); }} />
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-[var(--bg-border)]/40">
            <button 
              type="button" 
              onClick={nextStep} 
              className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold px-6 py-3 rounded-full shadow-ambient flex items-center gap-2 transform active:scale-95 transition-all"
            >
              <span>Next Step</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Step 2: Location */}
        <div className={`fade-in ${step === 2 ? 'block' : 'hidden'}`}>
          <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-2">2. Where did you see them?</h2>
          <p className="font-body text-sm text-[var(--empire-cream)]/60 mb-6">Pinpoint the location coordinates to help track their territory.</p>

          <button 
            type="button" 
            onClick={detectLocation} 
            className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/20 font-body text-sm font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mb-6"
            disabled={locating}
          >
            <span className="material-symbols-outlined text-base">my_location</span>
            <span>{locating ? 'Detecting coordinates…' : 'Use My Current Location'}</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Latitude</label>
              <input 
                type="number" 
                step="any" 
                value={lat} 
                onChange={(e) => setLat(e.target.value)} 
                placeholder="e.g. 40.7128" 
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
                placeholder="e.g. -74.0060" 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data"
              />
            </div>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/40 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="location_privacy" 
                value="area" 
                defaultChecked 
                className="mt-1 accent-[var(--life-teal)]" 
              />
              <div className="font-body text-xs text-[var(--empire-cream)]/80 leading-relaxed">
                <strong>Enable Location Fuzzing (Recommended)</strong>
                <p className="text-[var(--empire-cream)]/50 mt-0.5">MeowNet snaps GPS points to a 500m grid (`ST_SnapToGrid`) to protect cats from malicious tracking. Uncheck to save precise coordinates for rescue operations.</p>
              </div>
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-[var(--bg-border)]/40">
            <button 
              type="button" 
              onClick={prevStep} 
              className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-sm font-semibold px-6 py-3 rounded-full flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back</span>
            </button>
            <button 
              type="button" 
              onClick={nextStep} 
              className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold px-6 py-3 rounded-full shadow-ambient flex items-center gap-2 transform active:scale-95 transition-all"
            >
              <span>Next Step</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Step 3: Details */}
        <div className={`fade-in ${step === 3 ? 'block' : 'hidden'}`}>
          <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-2">3. Tell us about them</h2>
          <p className="font-body text-sm text-[var(--empire-cream)]/60 mb-6">Any distinguishing marks, breed characteristics, or behaviors?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Cat Name (Optional)</label>
              <input 
                type="text" 
                name="name" 
                maxLength={100} 
                placeholder="e.g. Whiskers, Barnaby" 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Primary Color / Pattern</label>
              <input 
                type="text" 
                name="color" 
                maxLength={100} 
                placeholder="e.g. Orange tabby, Tuxedo" 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Status Classification</label>
              <select 
                name="status" 
                required 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Age Estimate</label>
              <select 
                name="age_estimate" 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all"
              >
                <option value="">Unknown</option>
                {AGE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-3">Community Care Indicators</label>
            <div className="flex flex-wrap gap-4">
              {[
                { name: 'sterilized',   icon: 'content_cut', label: 'Sterilized' },
                { name: 'vaccinated',   icon: 'vaccines', label: 'Vaccinated' },
                { name: 'microchipped', icon: 'tag', label: 'Microchipped' },
              ].map((cb) => (
                <label key={cb.name} className="flex items-center gap-2 cursor-pointer font-body text-sm font-semibold text-[var(--empire-cream)]">
                  <input 
                    type="checkbox" 
                    name={cb.name} 
                    className="accent-[var(--life-teal)]" 
                  />
                  <span className="material-symbols-outlined text-xs text-[var(--empire-cream)]/50">{cb.icon}</span>
                  <span>{cb.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-3">Triage & Health Indicators (Optional)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(Object.keys(HEALTH_FLAG_LABELS) as HealthFlag[]).map((flag) => (
                <label 
                  key={flag} 
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
                    selectedFlags.includes(flag) 
                      ? 'bg-red-50 border-red-300 text-[#ba1a1a]' 
                      : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/40 text-[var(--empire-cream)]'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedFlags.includes(flag)} 
                    onChange={() => toggleFlag(flag)} 
                    className="accent-[#ba1a1a]" 
                  />
                  <span className="font-body text-xs font-semibold">{HEALTH_FLAG_LABELS[flag]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Observer Notes</label>
            <textarea 
              name="health_notes" 
              maxLength={2000} 
              placeholder="e.g. Friendly, has a minor limp on front left paw..." 
              rows={3}
              className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-4 border-t border-[var(--bg-border)]/40">
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Contact Info (Optional)</label>
              <input 
                type="text" 
                name="contact_info" 
                maxLength={500} 
                placeholder="Email or phone..." 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Rescue Shelter URL (Optional)</label>
              <input 
                type="url" 
                name="shelter_url" 
                placeholder="Rescue website..." 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-4 font-body text-xs mb-6">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-[var(--bg-border)]/40">
            <button 
              type="button" 
              onClick={prevStep} 
              className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-sm font-semibold px-6 py-3 rounded-full flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back</span>
            </button>
            <button 
              type="submit" 
              disabled={isPending}
              className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold px-6 py-3.5 rounded-full shadow-ambient flex items-center gap-2 transform active:scale-95 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">pets</span>
              <span>{isPending ? 'Logging friend…' : 'Log Sighting & Earn Karma (+10)'}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
