'use client';
// components/profile/ProfileCard/index.tsx

import { useState, useTransition } from 'react';
import { updateProfile } from '@/lib/actions/profile';

interface Profile {
  id: string; display_name: string | null; avatar_url: string | null;
  empire_points: number; weekly_points: number; created_at: string;
  bio?: string | null;
  preferred_role?: string | null;
  location_neighborhood?: string | null;
  contact_phone?: string | null;
  password_expires_at?: string | null;
}

interface ProfileCardProps { profile: Profile; email: string; badgeCount: number; }

export default function ProfileCard({ profile, email, badgeCount }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [preferredRole, setPreferredRole] = useState(profile.preferred_role ?? '');
  const [locationNeighborhood, setLocationNeighborhood] = useState(profile.location_neighborhood ?? '');
  const [contactPhone, setContactPhone] = useState(profile.contact_phone ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('displayName', displayName);
      formData.set('avatarUrl', avatarUrl);
      formData.set('bio', bio);
      formData.set('preferredRole', preferredRole);
      formData.set('locationNeighborhood', locationNeighborhood);
      formData.set('contactPhone', contactPhone);
      if (avatarFile) {
        formData.set('avatarFile', avatarFile);
      }

      const res = await updateProfile(formData);
      if (res.success) {
        setIsEditing(false);
        setAvatarFile(null);
        const newUrl = res.avatarUrl || avatarUrl;
        if (newUrl) {
          localStorage.setItem('cached_avatar', newUrl);
        } else {
          localStorage.removeItem('cached_avatar');
        }
        window.dispatchEvent(new Event('avatar-updated'));
      } else {
        setError(res.error || 'Failed to update profile');
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col md:flex-row gap-6 items-center md:items-start transition-all w-full">
      {/* Avatar */}
      <div className="w-20 h-20 rounded-full bg-[var(--bg-border)]/20 overflow-hidden flex-shrink-0 flex items-center justify-center border-4 border-[var(--empire-gold)] shadow-sm">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-2xl font-bold text-[var(--empire-gold)]">
            {(profile.display_name ?? 'V')[0].toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow w-full">
        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Feral Queen Bertha"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Upload Profile Photo</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                className="w-full text-xs font-body text-[var(--empire-cream)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--bg-elevated)] file:text-[var(--empire-gold)] hover:file:bg-[var(--bg-border)]/20 transition-all"
              />
            </div>
            <div className="text-center font-body text-[9px] font-bold text-[var(--empire-cream)]/30 uppercase py-1">OR</div>
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Avatar Image URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="e.g. https://images.unsplash.com/..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Rescue Bio (Max 500 chars)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a bit about your cat rescue background or colony care..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all resize-none h-20"
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Rescue Focus</label>
                <select
                  value={preferredRole}
                  onChange={(e) => setPreferredRole(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                >
                  <option value="">Select Role...</option>
                  <option value="TNR Trapper">TNR Trapper</option>
                  <option value="Colony Feeder">Colony Feeder</option>
                  <option value="Kitten Foster">Kitten Foster</option>
                  <option value="Medical Transporter">Medical Transporter</option>
                  <option value="Rescue Donor">Rescue Donor</option>
                  <option value="General Volunteer">General Volunteer</option>
                </select>
              </div>
              <div>
                <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Neighborhood</label>
                <input
                  type="text"
                  value={locationNeighborhood}
                  onChange={(e) => setLocationNeighborhood(e.target.value)}
                  placeholder="e.g. Greenwich Village"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                  maxLength={20}
                />
              </div>
            </div>
            {error && <div className="text-xs text-[var(--status-stray)] font-semibold">{error}</div>}
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                disabled={isPending}
                className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setError(null); }}
                className="border border-[var(--bg-border)] text-[var(--empire-cream)]/75 hover:bg-[var(--bg-elevated)] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center md:text-left relative">
            <h2 className="font-display text-xl font-bold text-[var(--empire-cream)] flex items-center justify-center md:justify-start gap-2">
              <span>{profile.display_name ?? 'Anonymous Rescuer'}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[var(--empire-gold)] hover:text-[#e6b020] p-1 flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors"
                title="Edit Display Name / Avatar"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </h2>
            <div className="font-body text-xs text-[var(--empire-cream)]/50 mb-2">{email}</div>
            {profile.password_expires_at && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-[var(--empire-gold)] rounded-xl font-body text-xs mt-1 mb-3">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>Judge Trial Expiration: {new Date(profile.password_expires_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {!isEditing && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Points', value: profile.empire_points.toLocaleString(), color: 'text-[var(--empire-gold)]', bg: 'bg-[#ffdcc5]/20 dark:bg-[#ffdcc5]/5' },
              { label: 'Weekly', value: profile.weekly_points.toLocaleString(), color: 'text-[var(--life-teal)]', bg: 'bg-[#e8f5e9]/50 dark:bg-[#e8f5e9]/5' },
              { label: 'Badges', value: badgeCount.toString(), color: 'text-[var(--empire-gold)]', bg: 'bg-[#ffdcc5]/20 dark:bg-[#ffdcc5]/5' },
            ].map((stat) => (
              <div key={stat.label} className={`p-3 rounded-xl text-center border border-[var(--bg-border)]/20 ${stat.bg}`}>
                <div className={`font-data font-bold text-lg ${stat.color}`}>{stat.value}</div>
                <div className="font-body text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center md:text-left font-body text-[10px] text-[var(--empire-cream)]/40 font-semibold">
          Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

