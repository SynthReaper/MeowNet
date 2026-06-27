'use client';

// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// components/profile/StaffProfileView/index.tsx — Staff-specific profile view with unified Volunteer capabilities

import { useState, ComponentProps } from 'react';
import Link from 'next/link';
import ProfileCard from '@/components/profile/ProfileCard';
import DataDeletion from '@/components/profile/DataDeletion';

export interface StaffProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  empire_points: number;
  role: string;
  bio: string | null;
  preferred_role: string | null;
  location_neighborhood: string | null;
  contact_phone: string | null;
  created_at: string;
  password_expires_at?: string | null;
  sub_role?: string | null;
  edits_count?: number | null;
  max_edits?: number | null;
}

interface StaffStats {
  catsApproved: number;
  catsDeleted: number;
  queriesRaised: number;
  queriesResolved: number;
  eventsModerated: number;
}

interface Sighting {
  id: string;
  name: string | null;
  photo_url: string;
  status: string;
  created_at: string;
}

interface Pledge {
  pledge: string;
  created_at: string;
  cats: {
    id: string;
    name: string | null;
    photo_url: string;
    status: string;
  } | null;
}

interface StaffProfileViewProps {
  profile: StaffProfile;
  email: string;
  stats: StaffStats;
  badges: Array<{ badge_id: string; earned_at: string }>;
  recentPoints: Array<{ activity: string; points: number; created_at: string }>;
  sightings: Sighting[];
  pledges: Pledge[];
}

const GUARDIAN_RANKS = [
  { min: 0,   title: 'Patrol Rookie',      icon: 'pets', color: '#8b8b8b' },
  { min: 10,  title: 'Colony Warden',       icon: 'shield', color: '#4ade80' },
  { min: 30,  title: 'District Enforcer',   icon: 'swords', color: '#38bdf8' },
  { min: 60,  title: 'Elite Sentinel',      icon: 'star', color: '#f59e0b' },
  { min: 100, title: 'Grand Protector',     icon: 'crown', color: 'var(--empire-gold)' },
];

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  stray:      { color: 'var(--status-stray)', label: 'Stray', bg: 'rgba(186, 26, 26, 0.15)' },
  tnr_needed: { color: 'var(--status-tnr)', label: 'TNR Needed', bg: 'rgba(242, 140, 56, 0.15)' },
  adoptable:  { color: 'var(--status-adoptable)', label: 'Adoptable', bg: 'rgba(0, 106, 99, 0.15)' },
  adopted:    { color: 'var(--status-adopted)', label: 'Adopted', bg: 'rgba(129, 140, 248, 0.15)' },
  fostered:   { color: 'var(--status-adopted)', label: 'Fostered', bg: 'rgba(129, 140, 248, 0.15)' },
};

const PLEDGE_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  food:   { label: 'Food Support', icon: 'restaurant', bg: 'rgba(242, 140, 56, 0.12)', color: 'var(--empire-gold)' },
  tnr:    { label: 'TNR Prep', icon: 'content_cut', bg: 'rgba(242, 140, 56, 0.12)', color: 'var(--status-tnr)' },
  foster: { label: 'Foster Care', icon: 'home', bg: 'rgba(0, 106, 99, 0.12)', color: 'var(--status-adoptable)' },
  vet:    { label: 'Medical Fund', icon: 'medical_services', bg: 'rgba(129, 140, 248, 0.12)', color: 'var(--status-adopted)' },
};

function getGuardianRank(total: number) {
  for (let i = GUARDIAN_RANKS.length - 1; i >= 0; i--) {
    if (total >= GUARDIAN_RANKS[i].min) return GUARDIAN_RANKS[i];
  }
  return GUARDIAN_RANKS[0];
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

export default function StaffProfileView({
  profile,
  email,
  stats,
  badges,
  recentPoints,
  sightings,
  pledges,
}: StaffProfileViewProps) {
  const [profileTab, setProfileTab] = useState<'staff' | 'volunteer'>('staff');

  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [preferredRole, setPreferredRole] = useState(profile.preferred_role ?? '');
  const [locationNeighborhood, setLocationNeighborhood] = useState(profile.location_neighborhood ?? '');
  const [contactPhone, setContactPhone] = useState(profile.contact_phone ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [isDossierPending, setIsDossierPending] = useState(false);

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    setDossierError(null);
    setIsDossierPending(true);

    try {
      const { updateProfile } = await import('@/lib/actions/profile');
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
        setIsEditingDossier(false);
        setAvatarFile(null);
        const newUrl = res.avatarUrl || avatarUrl;
        if (newUrl) {
          localStorage.setItem('cached_avatar', newUrl);
        } else {
          localStorage.removeItem('cached_avatar');
        }
        window.dispatchEvent(new Event('avatar-updated'));
        window.location.reload();
      } else {
        setDossierError(res.error || 'Failed to update profile');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred';
      setDossierError(errMsg);
    } finally {
      setIsDossierPending(false);
    }
  };

  const isAdmin = profile.role === 'admin';
  const totalActions = stats.catsApproved + stats.catsDeleted + stats.queriesRaised + stats.queriesResolved + stats.eventsModerated;
  const currentRank = getGuardianRank(totalActions);
  const accentColor = 'var(--empire-gold)';
  const accentBg = 'color-mix(in srgb, var(--empire-gold) 8%, transparent)';
  const roleLabel = isAdmin ? 'System Administrator' : 'Community Moderator';
  const roleIcon = isAdmin ? 'crown' : 'shield';

  // Trial expiration countdown
  const trialExpiresAt = profile.password_expires_at;
  let daysRemaining: number | null = null;
  if (trialExpiresAt) {
    // eslint-disable-next-line react-hooks/purity
    const diff = new Date(trialExpiresAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // Sub-moderator edit limits
  const subRole = profile.sub_role;
  const editsCount = profile.edits_count ?? 0;
  const maxEdits = profile.max_edits ?? 20;
  const isSubMod = subRole === 'sub_moderator';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Staff Identity Card */}
      <div className="relative rounded-3xl overflow-hidden border border-[var(--bg-border)] shadow-ambient"
        style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)' }}>
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 70% 50%, ${accentColor} 0%, transparent 65%)` }} />
        <div className="relative p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 flex-shrink-0 shadow-xl relative"
            style={{ borderColor: accentColor }}>
            {profile.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-elevated)]" style={{ background: accentBg }}>
                <span className="material-symbols-outlined text-5xl" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>
                  {roleIcon}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2 flex-grow text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="material-symbols-outlined text-sm" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>
                {roleIcon}
              </span>
              <span className="font-body text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                {roleLabel}
              </span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-[var(--empire-cream)]">
              {profile.display_name ?? 'Anonymous Staff'}
            </h1>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="material-symbols-outlined text-lg animate-pulse" style={{ color: currentRank.color, fontVariationSettings: "'FILL' 1" }}>
                {currentRank.icon}
              </span>
              <span className="font-display text-base font-bold" style={{ color: currentRank.color }}>
                {currentRank.title}
              </span>
              <span className="text-[var(--empire-cream)]/30 text-sm">|</span>
              <span className="font-body text-xs text-[var(--empire-cream)]/50">{totalActions} total actions</span>
            </div>
            <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">
              {email} · Member since {formatDate(profile.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Trial Expiration + Sub-Moderator Banners */}
      {daysRemaining !== null && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
          daysRemaining <= 3
            ? 'bg-red-500/10 border-red-500/25 text-red-400'
            : daysRemaining <= 7
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
            : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/50 text-[var(--empire-gold)]'
        }`}>
          <span className="material-symbols-outlined text-xl flex-shrink-0">
            {daysRemaining <= 3 ? 'timer_off' : 'schedule'}
          </span>
          <div>
            <div className="font-display text-sm font-bold">
              {daysRemaining === 0
                ? 'Trial Access Expired — Contact admin to renew'
                : `Trial Access: ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
            </div>
            <div className="font-body text-xs opacity-70 mt-0.5">
              Expires {new Date(trialExpiresAt || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      )}

      {isSubMod && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
          editsCount >= maxEdits
            ? 'bg-red-500/10 border-red-500/25 text-red-400'
            : editsCount >= maxEdits - 3
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
            : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/50 text-[var(--empire-gold)]'
        }`}>
          <span className="material-symbols-outlined text-xl flex-shrink-0">
            {editsCount >= maxEdits ? 'block' : 'edit_note'}
          </span>
          <div className="flex-grow">
            <div className="font-display text-sm font-bold">
              Sub-Moderator Edit Limit: {editsCount} / {maxEdits} edits used
            </div>
            <div className="font-body text-xs opacity-70 mt-0.5">
              {editsCount >= maxEdits
                ? 'Edit limit reached — further edits will be rejected at the database level'
                : `${maxEdits - editsCount} edit${maxEdits - editsCount === 1 ? '' : 's'} remaining before limit is enforced`}
            </div>
          </div>
          {/* Visual progress bar */}
          <div className="w-24 h-1.5 bg-[var(--bg-border)]/30 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((editsCount / maxEdits) * 100, 100)}%`,
                background: editsCount >= maxEdits ? '#f87171' : editsCount >= maxEdits - 3 ? '#fbbf24' : 'var(--empire-gold)',
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-[var(--bg-border)]/30 gap-6">
        <button
          onClick={() => setProfileTab('staff')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            profileTab === 'staff'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/40 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          <span className="material-symbols-outlined text-base">shield</span>
          <span>Staff Operations</span>
        </button>
        <button
          onClick={() => setProfileTab('volunteer')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            profileTab === 'volunteer'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/40 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          <span className="material-symbols-outlined text-base">volunteer_activism</span>
          <span>Volunteer Dossier</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {profileTab === 'staff' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Moderation Stats Grid */}
            <div className="bg-white rounded-2xl p-6 border border-[var(--bg-border)] shadow-ambient">
              <h2 className="font-display text-base font-bold text-[var(--empire-cream)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>
                  analytics
                </span>
                <span>Moderation Statistics</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Cats Approved', value: stats.catsApproved, icon: 'check_circle', color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
                  { label: 'Cats Removed', value: stats.catsDeleted, icon: 'delete_forever', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
                  { label: 'Queries Raised', value: stats.queriesRaised, icon: 'question_answer', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                  { label: 'Queries Resolved', value: stats.queriesResolved, icon: 'task_alt', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
                  { label: 'Events Actioned', value: stats.eventsModerated, icon: 'event_available', color: 'var(--empire-gold)', bg: 'rgba(242,140,56,0.08)' }, // Removed Pink color
                  { label: 'Total Actions', value: totalActions, icon: 'bolt', color: accentColor, bg: accentBg },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl border border-[var(--bg-border)]/30 bg-[var(--bg-elevated)]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: stat.bg }}>
                      <span className="material-symbols-outlined text-lg" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>
                        {stat.icon}
                      </span>
                    </div>
                    <div>
                      <div className="font-data text-xl font-black text-[var(--empire-cream)]">{stat.value}</div>
                      <div className="font-body text-[9px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 leading-tight">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Dossier */}
            {isEditingDossier ? (
              <form onSubmit={handleSaveDossier} className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
                <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3 justify-between w-full">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>badge</span>
                    <span>Edit Staff Profile</span>
                  </span>
                  <span className="text-[var(--empire-cream)]/35 text-xs">Editing Mode</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Display Name"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Preferred Focus / Role</label>
                      <input
                        type="text"
                        value={preferredRole}
                        onChange={(e) => setPreferredRole(e.target.value)}
                        placeholder="e.g. TNR Coordination, Colony Welfare"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Primary Area</label>
                      <input
                        type="text"
                        value={locationNeighborhood}
                        onChange={(e) => setLocationNeighborhood(e.target.value)}
                        placeholder="e.g. Brooklyn, Queens"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Phone number"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Avatar Image URL</label>
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="e.g. https://example.com/image.jpg"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">OR Upload Photo</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                        className="w-full text-[11px] font-body text-[var(--empire-cream)] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-[var(--bg-elevated)] file:text-[var(--empire-gold)] hover:file:bg-[var(--bg-border)]/20 transition-all"
                      />
                    </div>
                    <div className="flex-grow flex flex-col">
                      <label className="block font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Staff Bio (Max 500 chars)</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Write your staff biography here..."
                        className="w-full flex-grow bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none transition-all resize-none min-h-[90px]"
                        maxLength={500}
                      />
                    </div>
                  </div>
                </div>

                {dossierError && <div className="text-xs text-red-500 font-semibold">{dossierError}</div>}
                
                <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/10 pt-3">
                  <button
                    type="button"
                    onClick={() => { setIsEditingDossier(false); setDossierError(null); }}
                    className="border border-[var(--bg-border)] text-[var(--empire-cream)]/75 hover:bg-[var(--bg-elevated)] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDossierPending}
                    className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isDossierPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
                <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3 justify-between w-full">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>badge</span>
                    <span>Staff Dossier</span>
                  </span>
                  <button
                    onClick={() => setIsEditingDossier(true)}
                    className="text-[var(--empire-gold)] hover:text-[#e6b020] text-xs font-bold flex items-center gap-1 bg-transparent border-none cursor-pointer transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    <span>Edit Profile</span>
                  </button>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    {[
                      { icon: 'psychology', label: 'Preferred Focus', value: profile.preferred_role || 'General Moderation', color: 'var(--life-teal)' },
                      { icon: 'location_on', label: 'Primary Area', value: profile.location_neighborhood || 'Not specified', color: accentColor },
                      { icon: 'call', label: 'Emergency Contact', value: profile.contact_phone || 'No phone listed', color: 'var(--empire-gold)' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: item.color + '15', color: item.color }}>
                          <span className="material-symbols-outlined text-base">{item.icon}</span>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider">{item.label}</div>
                          <div className="text-xs font-bold text-[var(--empire-cream)]">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/15">
                    <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <span className="material-symbols-outlined text-[11px]">format_quote</span>
                      <span>Staff Bio</span>
                    </div>
                    <p className="font-body text-xs text-[var(--empire-cream)]/75 italic leading-relaxed whitespace-pre-line">
                      {profile.bio || "No bio written yet. Your dedication speaks for itself — every approved cat, every resolved query is a testament to your commitment."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Guardian Rank Card */}
            <div className="rounded-2xl p-6 border border-[var(--bg-border)] shadow-ambient text-center"
              style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)' }}>
              <span className="material-symbols-outlined text-4xl" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>
                {currentRank.icon}
              </span>
              <div className="font-body text-xs font-bold uppercase tracking-wider mt-2 mb-1" style={{ color: accentColor }}>
                Guardian Rank
              </div>
              <div className="font-display text-xl font-bold text-[var(--empire-cream)]">{currentRank.title}</div>
              <div className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">{totalActions} moderation actions</div>
              <div className="mt-4 w-full h-1.5 rounded-full bg-[var(--bg-border)]/20">
                <div className="h-full rounded-full" style={{ width: `${Math.min((totalActions / 100) * 100, 100)}%`, background: accentColor }} />
              </div>
            </div>

            {/* Quick Access */}
            <div className="bg-white rounded-2xl p-6 border border-[var(--bg-border)] shadow-ambient">
              <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base" style={{ color: accentColor }}>bolt</span>
                <span>Quick Access</span>
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Moderation Queue', href: '/moderator', icon: 'shield' },
                  { label: 'Mission Control Map', href: '/map', icon: 'explore' },
                  { label: 'Staff HQ Dashboard', href: '/empire', icon: 'castle' },
                  ...(isAdmin ? [{ label: 'Admin Panel', href: '/admin', icon: 'admin_panel_settings' }] : []),
                  { label: 'Community Hub', href: '/community', icon: 'forum' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors no-underline group"
                  >
                    <span className="material-symbols-outlined text-base text-[var(--empire-cream)]/40 group-hover:text-[var(--empire-cream)] transition-colors">{link.icon}</span>
                    <span className="font-body text-xs font-semibold text-[var(--empire-cream)]/70 group-hover:text-[var(--empire-cream)] transition-colors">{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Volunteer Main View (8 columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            <ProfileCard profile={profile as unknown as ComponentProps<typeof ProfileCard>['profile']} email={email} badgeCount={badges.length} />

            {/* Bento Grid: Sighting Logs & Active Pledges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* My Sighting Logs */}
              <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col min-h-[250px]">
                <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
                  <span>My Sighting Logs ({sightings.length})</span>
                </h2>

                {sightings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--bg-border)] flex-grow">
                    <span className="material-symbols-outlined text-3xl text-[var(--empire-cream)]/30 mb-2">add_a_photo</span>
                    <p className="font-body text-xs text-[var(--empire-cream)]/50 mb-3">No cats logged yet. Help map street cats in your area!</p>
                    <Link
                      href="/cats/new"
                      className="px-4 py-1.5 bg-[var(--empire-gold)] text-white font-body text-xs font-bold rounded-lg hover:bg-[var(--empire-gold-dim)] transition-colors no-underline"
                    >
                      Log Sighting
                    </Link>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-3">
                    {sightings.map((cat) => {
                      const status = STATUS_CONFIG[cat.status] ?? { color: '#887365', label: cat.status, bg: '#f1ede7' };
                      return (
                        <Link
                          key={cat.id}
                          href={`/cats/${cat.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/10 transition-colors border border-[var(--bg-border)]/10 no-underline group"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-[var(--bg-border)]/30 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cat.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">
                              {cat.name ?? 'Unnamed Cat'}
                            </div>
                            <div className="font-body text-[9px] text-[var(--empire-cream)]/40 mt-0.5 font-semibold">
                              Logged {new Date(cat.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
                            style={{ backgroundColor: status.bg, color: status.color }}
                          >
                            {status.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My Active Pledges */}
              <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col min-h-[250px]">
                <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  <span>Active Pledges ({pledges.length})</span>
                </h2>

                {pledges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--bg-border)] flex-grow">
                    <span className="material-symbols-outlined text-3xl text-[var(--empire-cream)]/30 mb-2">volunteer_activism</span>
                    <p className="font-body text-xs text-[var(--empire-cream)]/50 mb-3">No active pledges. Spot cats on the map to lend a paw!</p>
                    <Link
                      href="/map"
                      className="px-4 py-1.5 border border-[var(--empire-gold)] text-[var(--empire-gold)] font-body text-xs font-bold rounded-lg hover:bg-[#ffdcc5]/20 transition-colors no-underline"
                    >
                      View Map
                    </Link>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-3">
                    {pledges.map((pledge, idx) => {
                      const cat = pledge.cats;
                      const pledgeInfo = PLEDGE_CONFIG[pledge.pledge] ?? { label: pledge.pledge, icon: 'favorite', bg: 'rgba(0,0,0,0.05)', color: 'inherit' };
                      return (
                        <Link
                          key={idx}
                          href={cat ? `/cats/${cat.id}` : '#'}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/10 transition-colors border border-[var(--bg-border)]/10 no-underline group"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-[var(--bg-border)]/30 flex-shrink-0">
                            {cat?.photo_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={cat.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-elevated)]">
                                <span className="material-symbols-outlined text-sm text-[var(--empire-cream)]/30">pets</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">
                              {cat?.name ?? 'Unnamed Cat'}
                            </div>
                            <div className="font-body text-[9px] text-[var(--empire-cream)]/40 mt-0.5 font-semibold">
                              Pledged {new Date(pledge.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1"
                            style={{ backgroundColor: pledgeInfo.bg, color: pledgeInfo.color }}
                          >
                            <span className="material-symbols-outlined text-[10px] font-bold">{pledgeInfo.icon}</span>
                            {pledgeInfo.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Points Ledger Log */}
            <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
              <h2 className="font-display text-lg text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">analytics</span>
                <span>Recent Activity Log</span>
              </h2>

              {recentPoints.length === 0 ? (
                <p className="font-body text-xs text-[var(--empire-cream)]/50 py-4">No activity logged yet. Help map stray cats or join TNR operations to earn points!</p>
              ) : (
                <div className="flex flex-col">
                  {recentPoints.map((log, i) => (
                    <div
                      key={i}
                      className={`flex justify-between items-center py-3 ${
                        i < recentPoints.length - 1 ? 'border-b border-[var(--bg-border)]/40' : ''
                      }`}
                    >
                      <div>
                        <div className="font-body text-xs font-bold text-[var(--empire-cream)] capitalize">
                          {log.activity.replace(/_/g, ' ').toLowerCase()}
                        </div>
                        <div className="font-body text-[10px] text-[var(--empire-cream)]/40 mt-0.5 font-semibold">
                          {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="font-data text-xs font-bold text-[var(--life-teal)]">
                        +{log.points} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Volunteer Sidebar (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6 w-full">
            {/* Badges Earned */}
            <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
              <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">stars</span>
                <span>Earned Badges ({badges.length})</span>
              </h2>

              {badges.length === 0 ? (
                <p className="font-body text-xs text-[var(--empire-cream)]/50">No badges earned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((b) => (
                    <span
                      key={b.badge_id}
                      className="px-2.5 py-1 bg-[#ffdcc5] text-[var(--empire-gold-dim)] rounded-lg font-body text-[10px] font-bold uppercase tracking-wider border border-[var(--bg-border)]/20 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[10px]">workspace_premium</span>
                      <span>{b.badge_id.replace(/_/g, ' ')}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* GDPR Settings */}
            <DataDeletion />
          </div>
        </div>
      )}
    </div>
  );
}
