'use client';
// app/auth/onboarding/OnboardingClient.tsx — Interactive Onboarding Wizard
// Design: ReactBits step flow, shadcnblocks details, 21st.dev glass styling

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type OnboardingStep = 1 | 2 | 3 | 4;

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  badgeColor: string;
  accentClass: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'TNR Expert',
    title: 'TNR Expert',
    description: 'Trap-Neuter-Return coordinator. Handle humane traps, manage clinic runs, and track colony sizes.',
    icon: 'catching_pokemon',
    badgeColor: 'bg-[var(--life-teal)]/10 text-[var(--life-teal)] border-[var(--life-teal)]/20',
    accentClass: 'group-hover:border-[var(--life-teal)] focus-within:border-[var(--life-teal)]',
  },
  {
    id: 'Colony Keeper',
    title: 'Colony Keeper',
    description: 'Monitor and care for a local cat colony. Provide daily food, fresh water, and winter shelter.',
    icon: 'home_pin',
    badgeColor: 'bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] border-[var(--empire-gold)]/20',
    accentClass: 'group-hover:border-[var(--empire-gold)] focus-within:border-[var(--empire-gold)]',
  },
  {
    id: 'Feline Caregiver',
    title: 'Feline Caregiver',
    description: 'Provide medical monitoring, foster socialization for kittens, and care for sick/injured cats.',
    icon: 'medical_services',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    accentClass: 'group-hover:border-rose-500/80 focus-within:border-rose-500/80',
  },
  {
    id: 'Community Volunteer',
    title: 'Community Volunteer',
    description: 'Help write field reports, transport cats to vets, and educate neighbors about community cats.',
    icon: 'diversity_1',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    accentClass: 'group-hover:border-indigo-500 focus-within:border-indigo-500',
  },
];

export default function OnboardingClient() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [mounted, setMounted] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('Colony Keeper');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait for Supabase AuthBridge to complete and get session
  useEffect(() => {
    if (!clerkLoaded || !clerkUser) return;

    let retryCount = 0;
    const maxRetries = 10;

    async function checkSupabaseSession() {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          setSupabaseUserId(sbUser.id);
          setSyncingSupabase(false);
          
          // Pre-fill display name from Supabase profile or Clerk user
          const { data: profile } = await (supabase
            .from('profiles' as never)
            .select('display_name, bio, preferred_role, location_neighborhood, contact_phone')
            .eq('id', sbUser.id)
            .maybeSingle() as any);

          if (profile) {
            setDisplayName(profile.display_name || clerkUser?.fullName || clerkUser?.username || '');
            setBio(profile.bio || '');
            setSelectedRole(profile.preferred_role || 'Colony Keeper');
            setNeighborhood(profile.location_neighborhood || '');
            setPhone(profile.contact_phone || '');
          } else {
            setDisplayName(clerkUser?.fullName || clerkUser?.username || '');
          }
        } else {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(checkSupabaseSession, 800);
          } else {
            // Proceed anyway, let it fail gracefully during submit or fall back
            setSyncingSupabase(false);
            setDisplayName(clerkUser?.fullName || clerkUser?.username || '');
          }
        }
      } catch (err) {
        console.error('Error fetching Supabase user in onboarding:', err);
        setSyncingSupabase(false);
      }
    }

    checkSupabaseSession();
  }, [clerkUser, clerkLoaded, supabase]);

  const handleNextStep = () => {
    if (step < 4) {
      setStep((s) => (s + 1) as OnboardingStep);
      setError('');
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as OnboardingStep);
      setError('');
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Update Clerk user metadata (so header name and auth logs match)
      if (clerkUser) {
        await clerkUser.update({
          unsafeMetadata: {
            ...clerkUser.unsafeMetadata,
            full_name: displayName.trim(),
          },
        });
      }

      // 2. Update Supabase profile
      if (supabaseUserId) {
        const { error: dbError } = await supabase
          .from('profiles' as never)
          .update({
            display_name: displayName.trim(),
            bio: bio.trim(),
            preferred_role: selectedRole,
            location_neighborhood: neighborhood.trim(),
            contact_phone: phone.trim(),
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', supabaseUserId);

        if (dbError) {
          throw dbError;
        }
      }

      handleNextStep();
    } catch (err: any) {
      console.error('Failed to save profile details:', err);
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteOnboarding = () => {
    router.push('/map');
    router.refresh();
  };

  if (syncingSupabase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-void)] text-[var(--empire-cream)] p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)] animate-spin">progress_activity</span>
            <span className="absolute text-xl">🐾</span>
          </div>
          <h2 className="font-display text-xl font-bold">Setting up your Cat Empire profile</h2>
          <p className="font-body text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
            Please wait a moment while we synchronize your credentials and set up your local database records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-void)] relative overflow-hidden p-4 sm:p-8 md:p-12">
      {/* Glow effects */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,140,56,0.06) 0%, transparent 70%)',
          top: '-15%', left: '5%', filter: 'blur(70px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 450, height: 450, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,106,99,0.06) 0%, transparent 70%)',
          bottom: '-10%', right: '5%', filter: 'blur(75px)',
        }}
      />

      {/* Onboarding Box */}
      <div
        className={`w-full max-w-[550px] bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 sm:p-8 relative flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.35)] transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Step indicator */}
        <div className="flex justify-between items-center mb-8 border-b border-[var(--bg-border)]/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 select-none">
              {/* Peeking Cat behind */}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-lg z-0 animate-bounce" style={{ animationDuration: '3s' }}>
                🐱
              </span>
              {/* Main logo image */}
              <img
                src="/pet-logo.png"
                className="relative w-9 h-9 object-contain z-10 filter drop-shadow-[0_3px_8px_rgba(0,0,0,0.3)]"
                alt="MeowNet Logo"
              />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-[var(--empire-cream)]">MeowNet</p>
              <p className="font-body text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Volunteer Onboarding</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-[var(--empire-gold)]'
                    : s < step
                    ? 'w-2 bg-[var(--life-teal)]'
                    : 'w-2 bg-[var(--bg-border)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Welcome Screen */}
        {step === 1 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--empire-gold)]/10 border border-[var(--empire-gold)]/30 flex items-center justify-center mx-auto mb-4 text-3xl">
                🐱👑
              </div>
              <h2 className="font-display text-2xl font-bold text-[var(--empire-cream)]">Welcome to the Cat Empire!</h2>
              <p className="font-body text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Thank you for joining MeowNet. We are a community of volunteers dedicated to managing feral cat colonies, organizing TNR runs, and ensuring feline welfare.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 mt-2">
              <div className="flex gap-4 p-3 sm:p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:border-[var(--empire-gold)]/40 transition-colors">
                <span className="material-symbols-outlined text-[var(--empire-gold)] text-[24px] mt-0.5">map</span>
                <div>
                  <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]">Realtime Colony Mapping</h4>
                  <p className="font-body text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Log new cat colonies, monitor health stats, and fuzzed location coordinates to ensure security.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-3 sm:p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:border-[var(--life-teal)]/40 transition-colors">
                <span className="material-symbols-outlined text-[var(--life-teal)] text-[24px] mt-0.5">military_tech</span>
                <div>
                  <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]">Earn Points & Badges</h4>
                  <p className="font-body text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Earn Empire Points for every cat logged, feeder profile updated, or TNR run completed. Climb the board!
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-3 sm:p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:border-indigo-400/40 transition-colors">
                <span className="material-symbols-outlined text-indigo-400 text-[24px] mt-0.5">forum</span>
                <div>
                  <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]">Coordinate TNR Events</h4>
                  <p className="font-body text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Connect with local caretakers, sign up for community tasks, and share realtime field reports.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextStep}
              className="w-full mt-6 py-3 rounded-xl bg-[var(--empire-gold)] text-black font-display font-bold text-sm hover:brightness-110 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Get Started <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 2: Profile Details */}
        {step === 2 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--empire-cream)]">Personalize your Profile</h2>
              <p className="font-body text-[11px] text-[var(--text-secondary)] mt-1">
                Tell the community who you are. This information will be displayed on your volunteer profile.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Display Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-xs font-bold text-[var(--empire-cream)] flex items-center gap-1">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[18px] pointer-events-none">badge</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl pl-10 pr-4 py-2.5 font-body text-xs text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/40 outline-none focus:border-[var(--empire-gold)] transition-colors"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-display text-xs font-bold text-[var(--empire-cream)]">Volunteer Bio</label>
                  <span className="font-body text-[9px] text-[var(--text-secondary)]">{bio.length}/500</span>
                </div>
                <div className="relative">
                  <textarea
                    maxLength={500}
                    rows={3}
                    placeholder="Tell us about your experience with stray/feral cats, colony feeding, or TNR..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-4 py-2.5 font-body text-xs text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/40 outline-none focus:border-[var(--empire-gold)] transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Grid for Neighborhood and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Neighborhood */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-xs font-bold text-[var(--empire-cream)]">Neighborhood / Area</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[18px] pointer-events-none">home_pin</span>
                    <input
                      type="text"
                      placeholder="e.g. Brooklyn Heights"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl pl-10 pr-4 py-2.5 font-body text-xs text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/40 outline-none focus:border-[var(--empire-gold)] transition-colors"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-xs font-bold text-[var(--empire-cream)]">Contact Phone (Optional)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[18px] pointer-events-none">call</span>
                    <input
                      type="tel"
                      placeholder="e.g. 555-0199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl pl-10 pr-4 py-2.5 font-body text-xs text-[var(--empire-cream)] placeholder:text-[var(--text-secondary)]/40 outline-none focus:border-[var(--empire-gold)] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 py-3 rounded-xl border border-[var(--bg-border)] text-[var(--empire-cream)] font-display font-bold text-sm hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim()}
                className="flex-1 py-3 rounded-xl bg-[var(--empire-gold)] text-black font-display font-bold text-sm hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                ) : (
                  <>Continue <span className="material-symbols-outlined text-sm">arrow_forward</span></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Role */}
        {step === 3 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--empire-cream)]">Choose your Preferred Role</h2>
              <p className="font-body text-[11px] text-[var(--text-secondary)] mt-1">
                Select the role that matches your primary volunteer activities. You can change this at any time in settings.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedRole(opt.id)}
                  className={`group w-full text-left p-3 sm:p-4 rounded-xl bg-[var(--bg-elevated)] border-2 transition-all flex items-start gap-3.5 cursor-pointer hover:bg-[var(--bg-surface)] ${opt.accentClass} ${
                    selectedRole === opt.id
                      ? 'border-[var(--empire-gold)] shadow-[0_4px_12px_rgba(242,140,56,0.1)]'
                      : 'border-[var(--bg-border)]/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${opt.badgeColor} mt-0.5 flex-shrink-0`}>
                    <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-display text-xs font-bold text-[var(--empire-cream)] flex items-center gap-2">
                      {opt.title}
                      {selectedRole === opt.id && (
                        <span className="material-symbols-outlined text-[14px] text-[var(--empire-gold)]">check_circle</span>
                      )}
                    </h4>
                    <p className="font-body text-[10px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4 border-t border-[var(--bg-border)]/35 pt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 py-3 rounded-xl border border-[var(--bg-border)] text-[var(--empire-cream)] font-display font-bold text-sm hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3 rounded-xl bg-[var(--empire-gold)] text-black font-display font-bold text-sm hover:brightness-110 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Continue <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Explore and Complete */}
        {step === 4 && (
          <div className="flex flex-col gap-5 text-center animate-fade-in">
            <div className="mx-auto w-14 h-14 rounded-full bg-[var(--life-teal)]/10 border border-[var(--life-teal)]/30 flex items-center justify-center text-3xl">
              🌟
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--empire-cream)]">Ready to explore?</h2>
              <p className="font-body text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto leading-relaxed">
                Your profile is now set up and synchronized! You are ready to start helping cats and claiming empire rewards.
              </p>
            </div>

            {/* Feature explorer cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-2">
              <div className="p-3 sm:p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[var(--life-teal)] text-[22px]">map</span>
                <h4 className="font-display text-[11px] font-bold text-[var(--empire-cream)]">Realtime Map</h4>
                <p className="font-body text-[9px] text-[var(--text-secondary)] leading-relaxed">
                  Track live cat colony status, feeding sites and TNR.
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 text-[22px]">military_tech</span>
                <h4 className="font-display text-[11px] font-bold text-[var(--empire-cream)]">Leaderboard</h4>
                <p className="font-body text-[9px] text-[var(--text-secondary)] leading-relaxed">
                  Earn experience, climb the board, win awards.
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[var(--empire-gold)] text-[22px]">forum</span>
                <h4 className="font-display text-[11px] font-bold text-[var(--empire-cream)]">Community</h4>
                <p className="font-body text-[9px] text-[var(--text-secondary)] leading-relaxed">
                  Discuss TNR tactics, request support, share files.
                </p>
              </div>
            </div>

            <button
              onClick={handleCompleteOnboarding}
              className="w-full mt-5 py-3 sm:py-3.5 rounded-xl bg-[var(--life-teal)] text-white font-display font-bold text-sm hover:brightness-110 hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(0,106,99,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Enter the Cat Empire <span className="material-symbols-outlined text-sm">rocket_launch</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
