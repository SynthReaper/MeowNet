'use client';
// components/forms/EditCatForm/index.tsx — Cat profile edit form

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { updateCat } from '@/lib/actions/cats';
import { HEALTH_FLAG_LABELS, type HealthFlag } from '@/lib/veterinary/triageRules';
import { getSafeImageSrc } from '@/lib/security/url';

interface EditCatFormProps {
  cat: {
    id: string;
    photo_url: string;
    status: string;
    name: string | null;
    breed_estimate: string | null;
    age_estimate: string | null;
    color: string | null;
    location_privacy: string;
    location: any;
    sterilized: boolean;
    vaccinated: boolean;
    microchipped: boolean;
    health_flags: string[];
    health_notes: string | null;
    contact_info: string | null;
    shelter_url: string | null;
  };
}

const STATUS_OPTIONS = [
  { value: 'stray',      label: 'Stray',        desc: 'Unowned cat on the street' },
  { value: 'tnr_needed', label: 'TNR Needed',   desc: 'Unsterilized, needs TNR' },
  { value: 'adoptable',  label: 'Adoptable',     desc: 'Needs a forever home' },
  { value: 'fostered',   label: 'Fostered',      desc: 'In temporary foster care' },
  { value: 'adopted',    label: 'Adopted',       desc: 'Adopted to a forever home' },
];

const AGE_OPTIONS = ['kitten', 'juvenile', 'adult', 'senior'] as const;

export default function EditCatForm({ cat }: Readonly<EditCatFormProps>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null!);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(cat.photo_url);
  const [selectedFlags, setSelectedFlags] = useState<HealthFlag[]>(cat.health_flags as HealthFlag[]);
  
  // Extract coordinates
  let initialLng = '';
  let initialLat = '';
  if (cat.location && typeof cat.location === 'object') {
    if (cat.location.type === 'Point' && Array.isArray(cat.location.coordinates)) {
      initialLng = String(cat.location.coordinates[0]);
      initialLat = String(cat.location.coordinates[1]);
    }
  }

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [locating, setLocating] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lat || !lng) {
      setError('Please enter both latitude and longitude coordinates.');
      return;
    }
    
    setIsPending(true);
    setError(null);

    const formData = new FormData(formRef.current);
    formData.set('lat', lat);
    formData.set('lng', lng);
    selectedFlags.forEach((f) => formData.append('health_flags', f));
    
    const isFuzzingEnabled = formRef.current?.querySelector('input[name="location_privacy"]') as HTMLInputElement;
    formData.set('location_privacy', isFuzzingEnabled?.checked ? 'area' : 'exact');

    const result = await updateCat(cat.id, formData);
    setIsPending(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push(`/cats/${cat.id}`), 1000);
    } else {
      setError(`Error updating: ${result.error}`);
    }
  };
  if (success) return (
    <div className="bg-white rounded-2xl shadow-ambient border border-[var(--bg-border)] p-8 text-center max-w-md mx-auto my-12">
      <div className="flex justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
      </div>
      <h2 className="font-display text-2xl text-[var(--life-teal)] font-bold">Cat Profile Updated!</h2>
      <p className="font-body text-sm text-[var(--empire-cream)]/70 mt-2">
        Saving changes and redirecting back to profile...
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-0 py-8">
      <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-ambient border border-[var(--bg-border)] p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden">
        
        {/* Photo Section */}
        <div>
          <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-2">1. Cat Photo</h2>
          <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-4">Keep existing photo or upload a replacement.</p>
          
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {previewUrl && (
              <div className="w-40 h-40 rounded-xl overflow-hidden border border-[var(--bg-border)] shrink-0 shadow-sm">
                <img src={getSafeImageSrc(previewUrl)} alt="Cat preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-grow w-full">
              <div className="border-2 border-dashed border-[var(--bg-border)] rounded-2xl bg-[var(--bg-elevated)] min-h-[120px] p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-border)]/10 transition-colors relative group">
                <span className="material-symbols-outlined text-3xl text-[var(--empire-gold)] mb-1 group-hover:scale-105 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
                  photo_camera
                </span>
                <span className="font-body text-xs font-semibold text-[var(--empire-cream)]">Upload New Photo</span>
                <span className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">JPEG, PNG or WebP (max 5MB)</span>
                
                <input 
                  type="file" 
                  name="photo" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handlePhotoChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-t border-[var(--bg-border)]/40" />

        {/* Location Section */}
        <div>
          <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-2">2. Sighting Location</h2>
          <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-4">Correct territory coordinates if needed.</p>

          <button 
            type="button" 
            onClick={detectLocation} 
            className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/20 font-body text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 mb-4"
            disabled={locating}
          >
            <span className="material-symbols-outlined text-base">my_location</span>
            <span>{locating ? 'Detecting coordinates…' : 'Detect My Location'}</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Latitude
                <input 
                  type="number" 
                  step="any" 
                  value={lat} 
                  required
                  onChange={(e) => setLat(e.target.value)} 
                  placeholder="e.g. 40.7128" 
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data text-xs mt-1.5 font-normal normal-case"
                />
              </label>
            </div>
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Longitude
                <input 
                  type="number" 
                  step="any" 
                  value={lng} 
                  required
                  onChange={(e) => setLng(e.target.value)} 
                  placeholder="e.g. -74.0060" 
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-[var(--empire-cream)] focus:border-[var(--empire-gold)] focus:ring-1 focus:ring-[var(--empire-gold)] outline-none transition-all font-data text-xs mt-1.5 font-normal normal-case"
                />
              </label>
            </div>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/40">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="location_privacy" 
                value="area" 
                defaultChecked={cat.location_privacy === 'area'} 
                className="mt-1 combat-accent accent-[var(--life-teal)]" 
              />
              <span className="font-body text-xs text-[var(--empire-cream)]/80 leading-relaxed">
                <strong>Enable Location Fuzzing (Recommended)</strong>
                <span className="block text-[var(--empire-cream)]/50 mt-0.5">Snaps GPS points to a 500m grid (`ST_SnapToGrid`) to protect cats from malicious tracking. Uncheck to save precise coordinates for rescue operations.</span>
              </span>
            </label>
          </div>
        </div>

        <hr className="border-t border-[var(--bg-border)]/40" />

        {/* Details Section */}
        <div>
          <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-2">3. Cat Details</h2>
          <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-4">Edit profile fields below.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Cat Name
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={cat.name ?? ''}
                  maxLength={100} 
                  placeholder="e.g. Whiskers" 
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all mt-1.5 font-normal normal-case"
                />
              </label>
            </div>
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Breed Estimate
                <input 
                  type="text" 
                  name="breed_estimate" 
                  defaultValue={cat.breed_estimate ?? ''}
                  maxLength={100} 
                  placeholder="e.g. British Shorthair" 
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all mt-1.5 font-normal normal-case"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Status Classification
                <select 
                  name="status" 
                  required 
                  defaultValue={cat.status}
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all mt-1.5 font-normal normal-case"
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
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Age Estimate
                <select 
                  name="age_estimate" 
                  defaultValue={cat.age_estimate ?? ''}
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all mt-1.5 font-normal normal-case"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Primary Color / Pattern
                <input 
                  type="text" 
                  name="color" 
                  defaultValue={cat.color ?? ''}
                  maxLength={100} 
                  placeholder="e.g. Orange tabby" 
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all mt-1.5 font-normal normal-case"
                />
              </label>
            </div>
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
                Rescue Contact Info
                <input 
                  type="text" 
                  name="contact_info" 
                  defaultValue={cat.contact_info ?? ''}
                  maxLength={500} 
                  placeholder="Email/phone..." 
                  className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all mt-1.5 font-normal normal-case"
                />
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-1.5">
              Rescue Shelter URL
              <input 
                type="url" 
                name="shelter_url" 
                defaultValue={cat.shelter_url ?? ''}
                placeholder="Rescue website..." 
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all mt-1.5 font-normal normal-case"
              />
            </label>
          </div>

          <div className="mb-4">
            <span className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Community Care Indicators</span>
            <div className="flex flex-wrap gap-4">
              {[
                { name: 'sterilized',   icon: 'content_cut', label: 'Sterilized', defaultChecked: cat.sterilized },
                { name: 'vaccinated',   icon: 'vaccines', label: 'Vaccinated', defaultChecked: cat.vaccinated },
                { name: 'microchipped', icon: 'tag', label: 'Microchipped', defaultChecked: cat.microchipped },
              ].map((cb) => (
                <label key={cb.name} className="flex items-center gap-2 cursor-pointer font-body text-xs font-semibold text-[var(--empire-cream)]">
                  <input 
                    type="checkbox" 
                    name={cb.name} 
                    defaultChecked={cb.defaultChecked}
                    className="accent-[var(--life-teal)]" 
                  />
                  <span className="material-symbols-outlined text-xs text-[var(--empire-cream)]/50">{cb.icon}</span>
                  <span>{cb.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <span className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">Triage & Health Indicators</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(Object.keys(HEALTH_FLAG_LABELS) as HealthFlag[]).map((flag) => (
                <label 
                  key={flag} 
                  className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border transition-all ${
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

          <div className="mb-4">
            <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase tracking-wider mb-2">
              Observer Notes
              <textarea 
                name="health_notes" 
                defaultValue={cat.health_notes ?? ''}
                maxLength={2000} 
                placeholder="Add observation details..." 
                rows={3}
                className="w-full bg-white border border-[var(--bg-border)] rounded-xl px-4 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all resize-y font-normal normal-case mt-2"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-4 font-body text-xs">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-[var(--bg-border)]/40">
          <button 
            type="button" 
            onClick={() => router.push(`/cats/${cat.id}`)} 
            className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-xs font-semibold px-5 py-2.5 rounded-full transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isPending}
            className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold px-5 py-2.5 rounded-full shadow-ambient flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            <span>{isPending ? 'Saving changes…' : 'Save Changes'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
