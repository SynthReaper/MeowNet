import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  empire_points: number;
  weekly_points: number;
  created_at: string;
  bio?: string | null;
  preferred_role?: string | null;
  location_neighborhood?: string | null;
  role?: string | null;
  is_enabled?: boolean;
}

interface Sighting {
  id: string;
  name: string | null;
  photo_url: string;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  stray:      { color: 'var(--status-stray)', label: 'Stray', bg: 'rgba(186, 26, 26, 0.15)' },
  tnr_needed: { color: 'var(--status-tnr)', label: 'TNR Needed', bg: 'rgba(171, 44, 93, 0.15)' },
  adoptable:  { color: 'var(--status-adoptable)', label: 'Adoptable', bg: 'rgba(0, 106, 99, 0.15)' },
  adopted:    { color: 'var(--status-adopted)', label: 'Adopted', bg: 'rgba(129, 140, 248, 0.15)' },
  fostered:   { color: 'var(--status-adopted)', label: 'Fostered', bg: 'rgba(129, 140, 248, 0.15)' },
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: profile } = await (supabase
    .from('profiles' as never)
    .select('display_name')
    .eq('id', id)
    .single() as any);

  return {
    title: `👤 ${profile?.display_name ?? 'Volunteer'} | MeowNet`,
    description: `View ${profile?.display_name ?? 'volunteer'}'s rescue portfolio and milestones.`,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;
  const supabase = await createServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect('/auth/login');
  }

  // Fetch viewer role
  const { data: viewerProfile } = await (supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', currentUser.id)
    .single() as any);
  const isStaff = viewerProfile?.role === 'moderator' || viewerProfile?.role === 'admin';

  // Fetch target profile
  const { data: profile, error } = await (supabase
    .from('profiles' as never)
    .select('*')
    .eq('id', targetUserId)
    .single() as any);

  if (error || !profile) {
    notFound();
  }

  // Check if profile is disabled
  if (profile.is_enabled === false && !isStaff && currentUser.id !== targetUserId) {
    return (
      <div className="w-full min-h-[60vh] max-w-2xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-[var(--status-stray)]">lock</span>
        <h1 className="font-display text-2xl font-bold text-[var(--empire-cream)]">Profile Disabled</h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/60 max-w-md">
          This user profile has been disabled by moderation and is currently unavailable for viewing.
        </p>
        <Link href="/empire" className="mt-4 px-6 py-2 bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white font-body text-xs font-bold rounded-xl no-underline transition-all">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  // If viewer is staff, log audit view profile
  if (isStaff && currentUser.id !== targetUserId) {
    const serviceClient = (await import('@/lib/supabase/server')).createServiceClient();
    await serviceClient
      .from('staff_audit_logs' as never)
      .insert({
        actor_id: currentUser.id,
        actor_role: viewerProfile.role,
        action: 'view_profile',
        target_id: targetUserId,
        details: `Viewed public profile of ${profile.display_name ?? 'Anonymous'}`,
      } as never);
  }

  const [badgesRes, recentRes, sightingsRes] = await Promise.all([
    supabase.from('user_badges' as never).select('badge_id, earned_at').eq('user_id', targetUserId).order('earned_at', { ascending: false }),
    supabase.from('point_log' as never).select('activity, points, created_at').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(5),
    supabase.from('cats' as never).select('id, name, photo_url, status, created_at').eq('owner_id', targetUserId).order('created_at', { ascending: false }),
  ]);

  const badges = (badgesRes.data ?? []) as any[];
  const recentPoints = (recentRes.data ?? []) as any[];
  const sightings = (sightingsRes.data ?? []) as Sighting[];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-12 py-10 flex flex-col gap-8">
      {/* Header card */}
      <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col sm:flex-row gap-6 items-center sm:items-start w-full relative overflow-hidden">
        {profile.is_enabled === false && (
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg font-body text-[10px] font-bold uppercase tracking-wider">
            Disabled by Moderation
          </div>
        )}
        
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-[var(--bg-border)]/20 overflow-hidden flex-shrink-0 flex items-center justify-center border-4 border-[var(--empire-gold)] shadow-sm">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">🐱</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-grow w-full text-center sm:text-left">
          <h1 className="font-display text-2xl font-extrabold text-[var(--empire-cream)] flex items-center justify-center sm:justify-start gap-2">
            <span>{profile.display_name ?? 'Anonymous Rescuer'}</span>
            {profile.role === 'admin' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wider">
                Admin
              </span>
            )}
            {profile.role === 'moderator' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[9px] font-bold uppercase tracking-wider">
                Mod
              </span>
            )}
          </h1>
          <p className="font-body text-xs text-[var(--empire-cream)]/55 mt-1">
            Registered volunteer since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-6 max-w-sm mx-auto sm:mx-0">
            <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--bg-border)]/20">
              <div className="font-data font-bold text-lg text-[var(--empire-gold)]">{profile.empire_points.toLocaleString()}</div>
              <div className="font-body text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mt-0.5">Total Points</div>
            </div>
            <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--bg-border)]/20">
              <div className="font-data font-bold text-lg text-[var(--life-teal)]">{profile.weekly_points.toLocaleString()}</div>
              <div className="font-body text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider mt-0.5">Weekly Points</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bio & Details (2 cols) */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3">
              <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
              <span>Volunteer Rescue Dossier</span>
            </h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider text-left">Rescue Role Focus</div>
                  <div className="text-xs font-bold text-[var(--empire-cream)] mt-1 text-left">{profile.preferred_role || 'General Volunteer'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider text-left">Neighborhood</div>
                  <div className="text-xs font-bold text-[var(--empire-cream)] mt-1 text-left">{profile.location_neighborhood || 'Not specified'}</div>
                </div>
              </div>
              <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/15 mt-2">
                <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider mb-2 text-left">Volunteer Bio</div>
                <p className="font-body text-xs text-[var(--empire-cream)]/75 italic leading-relaxed whitespace-pre-line text-left">
                  {profile.bio || "No rescue bio written yet."}
                </p>
              </div>
            </div>
          </div>

          {/* Sighting logs */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
              <span>Sighting Logs ({sightings.length})</span>
            </h2>
            {sightings.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50 py-4">No stray cat sightings logged yet by this volunteer.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {sightings.slice(0, 5).map((cat) => {
                  const status = STATUS_CONFIG[cat.status] ?? { color: '#887365', label: cat.status, bg: '#f1ede7' };
                  return (
                    <Link 
                      key={cat.id} 
                      href={`/cats/${cat.id}`} 
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/10 transition-colors border border-[var(--bg-border)]/10 no-underline group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-[var(--bg-border)]/30 flex-shrink-0">
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
        </div>

        {/* Sidebar badges/points (1 col) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              <span>Earned Badges ({badges.length})</span>
            </h2>
            {badges.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50">No badges earned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span 
                    key={b.badge_id} 
                    className="px-2.5 py-1 bg-[#ffdcc5] text-[var(--empire-gold-dim)] rounded-lg font-body text-[10px] font-bold uppercase tracking-wider border border-[var(--bg-border)]/20"
                  >
                    ✨ {b.badge_id.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">analytics</span>
              <span>Recent Contributions</span>
            </h2>
            {recentPoints.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50">No recent activity logged.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentPoints.map((log, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-body font-bold text-[var(--empire-cream)] capitalize">{log.activity.replace(/_/g, ' ').toLowerCase()}</div>
                      <div className="text-[9px] text-[var(--empire-cream)]/40 mt-0.5">{new Date(log.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className="font-data font-bold text-[var(--life-teal)]">+{log.points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
