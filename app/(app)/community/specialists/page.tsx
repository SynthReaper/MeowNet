// app/(app)/community/specialists/page.tsx — Volunteer Specialty Directory
import { createServerClient } from '@/lib/supabase/server';
import { updateProfile } from '@/lib/actions/profile';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

interface SpecialistProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  preferred_role: string | null;
  location_neighborhood: string | null;
  contact_phone: string | null;
  empire_points: number;
}

export default async function SpecialistsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch all specialists
  const { data: profiles, error } = await supabase
    .from('profiles' as never)
    .select('id, display_name, avatar_url, role, bio, preferred_role, location_neighborhood, contact_phone, empire_points')
    .not('preferred_role', 'is', null)
    .order('empire_points', { ascending: false }) as unknown as { data: SpecialistProfile[] | null; error: any };

  const specialists = profiles ?? [];

  // Get current user's profile if logged in
  let myProfile: SpecialistProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles' as never)
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) myProfile = data as SpecialistProfile;
  }

  // Handle specialty declaration form action
  async function handleUpdateSpecialty(formData: FormData) {
    'use server';
    const res = await updateProfile(formData);
    if (res.success) {
      revalidatePath('/community/specialists');
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link 
          href="/community" 
          className="flex items-center gap-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] text-xs font-bold uppercase tracking-wider w-fit no-underline"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Community Chat</span>
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-2 mt-1">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
          <span>Rescuer Specialty & Help Directory</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          Coordinate rescue skills. Connect with fellow guardians based on trapping, foster care, or medical specialties.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Directory Search/List (8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold">Rescuer Directory</h2>
            
            {specialists.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50 italic py-4">
                No specialists registered yet. Declare your specialty on the right to be the first!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {specialists.map(spec => (
                  <div key={spec.id} className="p-4 bg-[var(--bg-elevated)]/30 border border-[var(--bg-border)]/20 rounded-2xl flex flex-col gap-3 justify-between hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-border)]/35 overflow-hidden flex-shrink-0 flex items-center justify-center border border-[var(--bg-border)]/50 shadow-sm">
                        {spec.avatar_url ? (
                          <img src={spec.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">🐱</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display text-sm font-bold text-[var(--empire-cream)] truncate">
                          {spec.display_name || 'Anonymous Rescuer'}
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-[var(--life-teal)]/10 text-[var(--life-teal)] text-[9px] font-black uppercase tracking-wider mt-1 inline-block">
                          {spec.preferred_role}
                        </span>
                      </div>
                    </div>

                    <p className="font-body text-xs text-[var(--empire-cream)]/70 line-clamp-2 italic leading-relaxed">
                      &ldquo;{spec.bio || 'No bio written yet.'}&rdquo;
                    </p>

                    <div className="border-t border-[var(--bg-border)]/15 pt-3 flex flex-col gap-1 text-[10px] text-[var(--empire-cream)]/50 font-semibold font-body">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        <span>{spec.location_neighborhood || 'Neighborhood unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-xs">call</span>
                        <span>{spec.contact_phone || 'Private contact'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Update specialty settings (4 columns) */}
        {user && (
          <div className="lg:col-span-4 flex flex-col gap-6 w-full">
            <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
              <div>
                <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">manage_accounts</span>
                  <span>Declare Your Specialty</span>
                </h3>
                <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-normal">
                  Let other volunteers find you for specific operations by listing your trapping, sheltering, or medical skills.
                </p>
              </div>

              <form action={handleUpdateSpecialty} className="flex flex-col gap-3">
                <input type="hidden" name="displayName" value={myProfile?.display_name || ''} />
                
                <div>
                  <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Rescue Specialty Role</label>
                  <select
                    name="preferredRole"
                    defaultValue={myProfile?.preferred_role || ''}
                    className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                    required
                  >
                    <option value="">-- Select Specialty --</option>
                    <option value="TNR Trapping Expert">🪤 TNR Trapping Expert</option>
                    <option value="Veterinary Aid">🩺 Veterinary Clinic / First-Aid</option>
                    <option value="Transporter">🚗 Transport / Logistics</option>
                    <option value="Colony Feeder">🥩 Colony Feeder</option>
                    <option value="Shelter Builder">🔨 Shelter Builder / Crafting</option>
                    <option value="Fostering Guide">🏠 Foster / Adoption Placement</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Primary Neighborhood</label>
                  <input
                    type="text"
                    name="locationNeighborhood"
                    defaultValue={myProfile?.location_neighborhood || ''}
                    placeholder="e.g. Brooklyn Heights, Mission District"
                    className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    defaultValue={myProfile?.contact_phone || ''}
                    placeholder="e.g. 555-0199"
                    className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Volunteer Bio / Availability</label>
                  <textarea
                    name="bio"
                    defaultValue={myProfile?.bio || ''}
                    placeholder="Share details about your trapping traps collection, medical expertise, or availability..."
                    className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 outline-none resize-none"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer mt-2"
                >
                  Save Specialty
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
