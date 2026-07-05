'use client';
// components/forms/LogCatForm/index.tsx — Full cat logging form

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logCat } from '@/lib/actions/cats';
import { HEALTH_FLAG_LABELS, type HealthFlag } from '@/lib/veterinary/triageRules';
import { getSafeImageSrc } from '@/lib/security/url';

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
  const [selectedFlags, setSelectedFlags] = useState<HealthFlag[]>([]);
  const [locating, setLocating] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const [detectedBreed, setDetectedBreed] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setDetectedBreed('');
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
    } else if (currentStep === 3) {
      const colorInput = formRef.current?.querySelector('input[name="color"]') as HTMLInputElement;
      if (!colorInput?.value?.trim()) {
        setError('Please enter a Primary Color / Pattern (e.g. Orange tabby).');
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
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
    
    setIsPending(true);
    setError(null);

    const formData = new FormData(formRef.current);
    formData.set('lat', lat);
    formData.set('lng', lng);
    selectedFlags.forEach((f) => formData.append('health_flags', f));
    formData.set('consent_recorded', 'false');
    
    const isFuzzingEnabled = formRef.current?.querySelector('input[name="location_privacy"]') as HTMLInputElement;
    formData.set('location_privacy', isFuzzingEnabled?.checked ? 'area' : 'exact');

    const result = await logCat(formData);
    setIsPending(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push(`/cats/${result.catId}`), 1500);
    } else {
      const friendlyErrors: Record<string, string> = {
        unauthorized:        'Please sign in to log a cat sighting.',
        photo_required:      'A photo is required — please upload one.',
        photo_too_large:     'Photo is too large (max 5 MB). Please compress it first.',
        invalid_image_format:'Unsupported image format. Use JPEG, PNG, or WebP.',
        upload_failed:       'Photo upload failed. Please try again.',
        validation_failed:   'Some fields are invalid. Check your inputs and retry.',
        insert_failed:       'Could not save the sighting. Please try again shortly.',
      };
      setError(friendlyErrors[result.error] ?? `Something went wrong — ${result.error}`);
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
          <button 
            type="button"
            key={s.num} 
            className="flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none p-0 outline-none" 
            onClick={() => step > s.num && setStep(s.num)}
          >
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
          </button>
        ))}
      </div>

      {/* Form Container */}
      <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-ambient border border-[var(--bg-border)] p-6 md:p-8 relative overflow-hidden">
        
        {/* Step 1: Photo */}
        <div className={`fade-in ${step === 1 ? 'block' : 'hidden'}`}>
          <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-2">1. Snap a Photo</h2>
          <p className="font-body text-sm text-[var(--empire-cream)]/60 mb-6">Let&apos;s get a good look at this new friend.</p>
          
          <div className={`${previewUrl ? 'hidden' : 'block'}`}>
            <div className="border-2 border-dashed border-[var(--bg-border)] rounded-2xl bg-[var(--bg-elevated)] min-h-[240px] p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-border)]/10 transition-colors relative group mb-4">
              <span className="material-symbols-outlined text-5xl text-[var(--empire-gold)] mb-2 group-hover:scale-105 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
                photo_camera
              </span>
              <span className="font-body text-sm font-semibold text-[var(--empire-cream)]">Click to upload or drag & drop</span>
              <span className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">JPEG, PNG or WebP format (max 5MB)</span>{' '}
              
              <input 
                type="file" 
                name="photo" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handlePhotoChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {previewUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border border-[var(--bg-border)] max-h-[300px] relative group">
              <img src={getSafeImageSrc(previewUrl)} alt="Cat preview" className="w-full h-full object-cover w-full" />
              <button 
                type="button" 
                onClick={() => {
                  setPreviewUrl(null);
                  const fileInput = formRef.current?.querySelector('input[name="photo"]') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.value = '';
                  }
                }}
                className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 z-10 hover:scale-110"
                aria-label="Remove photo"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>
          )}

          <div className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 rounded-2xl p-4 mb-6 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-lg mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-xs font-bold text-[var(--empire-cream)]">Privacy Protection Enabled</span>
                <span className="font-body text-[11px] text-[var(--empire-cream)]/65 leading-relaxed">
                  All EXIF/GPS metadata is automatically stripped server-side to protect the exact location of vulnerable feline colonies.
                </span>
              </div>
            </div>
            
            <div className="border-t border-[var(--bg-border)]/30 pt-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[var(--life-teal)] text-lg mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-xs font-bold text-[var(--life-teal)]">AI/ML Breed & Health Classifier</span>
                <span className="font-body text-[11px] text-[var(--empire-cream)]/65 leading-relaxed">
                  Automatically estimate breed and identify urgent health triage flags using local computer vision models. <span className="font-bold text-[var(--life-teal)]">(Coming soon)</span>
                </span>
              </div>
            </div>
          </div>


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
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span>Latitude</span>{' '}
                <input 
                  type="number" 
                  step="any" 
                  value={lat} 
                  onChange={(e) => setLat(e.target.value)} 
                  placeholder="e.g. 40.7128" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data mt-2 font-normal normal-case"
                />
              </label>
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span>Longitude</span>{' '}
                <input 
                  type="number" 
                  step="any" 
                  value={lng} 
                  onChange={(e) => setLng(e.target.value)} 
                  placeholder="e.g. -74.0060" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data mt-2 font-normal normal-case"
                />
              </label>
            </div>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/40 mb-6">
            <label htmlFor="location_privacy_log" className="flex items-start gap-3 cursor-pointer" aria-label="Enable Location Fuzzing">
              <input 
                id="location_privacy_log"
                type="checkbox" 
                name="location_privacy" 
                value="area" 
                defaultChecked 
                className="mt-1 accent-[var(--life-teal)]" 
              />
              <span className="font-body text-xs text-[var(--empire-cream)]/80 leading-relaxed">
                <strong>Enable Location Fuzzing (Recommended)</strong>
                <span className="block text-[var(--empire-cream)]/50 mt-0.5">MeowNet snaps GPS points to a 500m grid (`ST_SnapToGrid`) to protect cats from malicious tracking. Uncheck to save precise coordinates for rescue operations.</span>
              </span>
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
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold">3. Tell us about them</h2>
            </div>
            <div className="relative group">
              <button 
                type="button" 
                disabled 
                className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 text-[var(--empire-cream)]/40 rounded-full font-body text-xs font-semibold select-none cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-xs" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>lock</span>
                <span>Use AI</span>
                <span className="bg-[var(--bg-border)]/30 text-[9px] text-[var(--empire-cream)]/50 px-1 py-0.5 rounded font-bold uppercase tracking-wider">coming soon</span>
              </button>
              
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 w-64 p-2.5 bg-[#1c1c18] dark:bg-[#fdf9f3] text-[#fdf9f3] dark:text-[#1c1c18] text-[11px] font-body font-normal rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 pointer-events-none leading-relaxed text-left">
                Use photo to identify breed & health indicators automatically
                <div className="absolute top-0 right-6 -mt-1 w-2 h-2 bg-[#1c1c18] dark:bg-[#fdf9f3] rotate-45"></div>
              </div>
            </div>
          </div>
          <p className="font-body text-sm text-[var(--empire-cream)]/60 mb-6">Any distinguishing marks, breed characteristics, or behaviors?</p>

          <input type="hidden" name="breed_confidence" value="" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span className="block min-h-[40px] flex items-end pb-1">Cat Name (Optional)</span>
                <input 
                  type="text" 
                  name="name" 
                  maxLength={100} 
                  placeholder="e.g. Whiskers" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all mt-2 font-normal normal-case"
                />
              </label>
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span className="block min-h-[40px] flex items-end pb-1">Primary Color / Pattern</span>
                <input 
                  type="text" 
                  name="color" 
                  maxLength={100} 
                  placeholder="e.g. Orange tabby" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all mt-2 font-normal normal-case"
                />
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span className="min-h-[40px] flex items-end pb-1 w-full">
                  <span>Breed Estimate (Optional)</span>
                </span>
                <input 
                  type="text" 
                  name="breed_estimate" 
                  maxLength={100} 
                  value={detectedBreed}
                  onChange={(e) => setDetectedBreed(e.target.value)}
                  placeholder="e.g. Tabby" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all mt-2 font-normal normal-case"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span className="block min-h-[20px] flex items-end pb-0.5">Status Classification</span>
                <select 
                  name="status" 
                  required 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all mt-2 font-normal normal-case"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span className="block min-h-[20px] flex items-end pb-0.5">Age Estimate</span>
                <select 
                  name="age_estimate" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all mt-2 font-normal normal-case"
                >
                  <option value="">Unknown</option>
                  {AGE_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <span className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-3">Community Care Indicators</span>
            <div className="flex flex-wrap gap-3">
              {[
                { name: 'sterilized',   icon: 'content_cut', label: 'Sterilized' },
                { name: 'vaccinated',   icon: 'vaccines', label: 'Vaccinated' },
                { name: 'microchipped', icon: 'tag', label: 'Microchipped' },
              ].map((cb) => (
                <label key={cb.name} className="flex items-center gap-2.5 cursor-pointer px-4 py-2.5 rounded-xl border border-[var(--bg-border)]/40 bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/10 font-body text-sm font-semibold text-[var(--empire-cream)] transition-all select-none">
                  <input 
                    type="checkbox" 
                    name={cb.name} 
                    className="w-4 h-4 rounded border-gray-300 text-[var(--life-teal)] focus:ring-[var(--life-teal)] accent-[var(--life-teal)]" 
                  />
                  <span className="material-symbols-outlined text-sm text-[var(--empire-cream)]/60">{cb.icon}</span>
                  <span>{cb.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <span className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-3">Triage & Health Indicators (Optional)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(HEALTH_FLAG_LABELS) as HealthFlag[]).map((flag) => (
                <label 
                  key={flag} 
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all select-none ${
                    selectedFlags.includes(flag) 
                      ? 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400' 
                      : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/40 text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/10'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedFlags.includes(flag)} 
                    onChange={() => toggleFlag(flag)} 
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 accent-red-600" 
                  />
                  <span className="font-body text-xs font-semibold">{HEALTH_FLAG_LABELS[flag]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span>Observer Notes</span>{' '}
                <textarea 
                name="health_notes" 
                maxLength={2000} 
                placeholder="e.g. Friendly, has a minor limp on front left paw..." 
                rows={3}
                className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all resize-y mt-2 font-normal normal-case"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-4 border-t border-[var(--bg-border)]/40">
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span>Contact Info (Optional)</span>{' '}
                <input 
                  type="text" 
                  name="contact_info" 
                  maxLength={500} 
                  placeholder="Email or phone..." 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all mt-2 font-normal normal-case"
                />
              </label>
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
                <span>Rescue Shelter URL (Optional)</span>{' '}
                <input 
                  type="url" 
                  name="shelter_url" 
                  placeholder="Rescue website..." 
                  className="w-full bg-[var(--input-bg)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all mt-2 font-normal normal-case"
                />
              </label>
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
