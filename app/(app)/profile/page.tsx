import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import ProfileCard from '@/components/profile/ProfileCard';
import DataDeletion from '@/components/profile/DataDeletion';
import DataPortability from '@/components/profile/DataPortability';
import StaffProfileView, { StaffProfile } from '@/components/profile/StaffProfileView';
import ModeratorApplicationCard from '@/components/profile/ModeratorApplicationCard';
import ProfileQueries from '@/components/profile/ProfileQueries';
import ProfileActivityLogs from '@/components/profile/ProfileActivityLogs';

export const metadata: Metadata = {
  title: '👤 My Profile',
  description: 'View your empire stats, points history, and manage your data.',
};

interface Profile {
  id: string; display_name: string | null; avatar_url: string | null;
  empire_points: number; weekly_points: number; created_at: string;
  bio?: string | null;
  preferred_role?: string | null;
  location_neighborhood?: string | null;
  contact_phone?: string | null;
  password_expires_at?: string | null;
  role?: string | null;
  sub_role?: string | null;
  edits_count?: number | null;
  max_edits?: number | null;
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

export default async function ProfilePage() {
  const { userId: clerkUserId } = await auth();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!clerkUserId) {
    redirect('/auth/login');
  }

  if (!user) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--empire-gold)] border-t-transparent animate-spin" />
        <h2 className="font-display text-xl font-bold text-[var(--empire-cream)]">Connecting secure session…</h2>
        <p className="font-body text-sm text-[var(--empire-cream)]/60 max-w-sm">
          Please wait while we synchronize your MeowNet credentials with our database.
        </p>
      </div>
    );
  }

  const [profileRes, badgesRes, recentRes, sightingsRes, pledgesRes, activeAppRes, queriesRes, auditLogsRes] = await Promise.all([
    supabase.from('profiles' as never).select('*').eq('id', user.id).single(),
    supabase.from('user_badges' as never).select('badge_id, earned_at').eq('user_id', user.id).order('earned_at', { ascending: false }),
    supabase.from('point_log' as never).select('activity, points, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('cats' as never).select('id, name, photo_url, status, created_at').eq('owner_id', user.id).order('created_at', { ascending: false }),
    supabase.from('cat_caregivers' as never).select('pledge, created_at, cats:cats(id, name, photo_url, status)' as never).eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('moderator_applications' as never).select('id').eq('user_id', user.id).eq('status', 'pending').maybeSingle(),
    supabase.from('moderator_queries' as never).select('id, target_type, target_id, message, status, response, created_at').eq('volunteer_id', user.id).order('created_at', { ascending: false }).then(res => res, () => ({ data: [], error: null })),
    supabase.from('staff_audit_logs' as never).select('action, details, created_at').eq('actor_id', user.id).order('created_at', { ascending: false }).limit(20).then(res => res, () => ({ data: [], error: null })),
  ]);

  const profile = (profileRes.data ?? { id: user.id, display_name: null, avatar_url: null, empire_points: 0, weekly_points: 0, created_at: user.created_at }) as Profile;
  const badges = ((badgesRes.data ?? []) as Array<{ badge_id: string; earned_at: string }>);
  const recentPoints = ((recentRes.data ?? []) as Array<{ activity: string; points: number; created_at: string }>);
  const sightings = (sightingsRes.data ?? []) as Sighting[];
  const pledges = (pledgesRes.data ?? []) as Pledge[];
  const hasPendingApp = !!activeAppRes?.data;
  const userQueries = (queriesRes?.data ?? []) as any[];
  const auditLogs = (auditLogsRes?.data ?? []) as any[];

  // ── STAFF PROFILE PATH ─────────────────────────────────────────────────────
  const userRole = profile.role ?? 'user';
  if (userRole === 'admin' || userRole === 'moderator') {
    // Count moderation actions from audit log (most accurate source)
    const [auditCatsApproved, auditCatsDeleted, queriesRaisedRes, queriesResolvedRes, auditEventsActioned] = await Promise.all([
      // Cats approved = staff_audit_logs where action = 'moderate_cat' and details contains 'approve'
      supabase.from('staff_audit_logs' as never).select('id', { count: 'exact', head: true }).eq('actor_id', user.id).eq('action', 'moderate_cat').ilike('details' as never, '%approve%'),
      // Cats deleted = staff_audit_logs where action = 'moderate_cat' and details contains 'delete'
      supabase.from('staff_audit_logs' as never).select('id', { count: 'exact', head: true }).eq('actor_id', user.id).eq('action', 'moderate_cat').ilike('details' as never, '%delete%'),
      // Queries this staff member raised
      supabase.from('moderator_queries' as never).select('id', { count: 'exact', head: true }).eq('moderator_id', user.id),
      // Queries this staff member resolved
      supabase.from('moderator_queries' as never).select('id', { count: 'exact', head: true }).eq('moderator_id', user.id).eq('status', 'resolved'),
      // Events actioned = staff_audit_logs where action = 'moderate_event'
      supabase.from('staff_audit_logs' as never).select('id', { count: 'exact', head: true }).eq('actor_id', user.id).eq('action', 'moderate_event'),
    ]);
    return (
      <StaffProfileView
        profile={profile as unknown as StaffProfile}
        email={user.email ?? ''}
        stats={{
          catsApproved: auditCatsApproved.count ?? 0,
          catsDeleted: auditCatsDeleted.count ?? 0,
          queriesRaised: queriesRaisedRes.count ?? 0,
          queriesResolved: queriesResolvedRes.count ?? 0,
          eventsModerated: auditEventsActioned.count ?? 0,
        }}
        badges={badges}
        recentPoints={recentPoints}
        sightings={sightings}
        pledges={pledges}
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
            <span>My Profile</span>
          </h1>
          <p className="font-body text-sm text-[var(--empire-cream)]/60 mt-1">
            Manage your account information, review your contributions history, and download data.
          </p>
        </div>
        <Link
          href="/profile/certificate"
          className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-md flex items-center gap-1.5 no-underline mt-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">workspace_premium</span>
          <span>Volunteer Certificate</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Area (8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          <ProfileCard profile={profile} email={user.email ?? ''} badgeCount={badges.length} />

          {/* Volunteer Rescue Dossier Card */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
            <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-3">
              <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
              <span>Volunteer Rescue Dossier</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Details */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--life-teal)]/10 text-[var(--life-teal)] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-base">psychology</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider">Rescue Role Focus</div>
                    <div className="text-xs font-bold text-[var(--empire-cream)]">{profile.preferred_role || 'General Volunteer'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-base">location_on</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider">Primary Neighborhood</div>
                    <div className="text-xs font-bold text-[var(--empire-cream)]">{profile.location_neighborhood || 'Not specified'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ab2c5d]/10 text-[#ab2c5d] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-base">call</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider">Rescue Contact Phone</div>
                    <div className="text-xs font-bold text-[var(--empire-cream)]">{profile.contact_phone || 'No phone listed'}</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Bio */}
              <div className="flex flex-col gap-1 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/15">
                <div className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-[11px]">format_quote</span>
                  <span>Volunteer Bio</span>
                </div>
                <p className="font-body text-xs text-[var(--empire-cream)]/75 italic leading-relaxed whitespace-pre-line">
                  {profile.bio || "No rescue bio written yet. Click the edit pencil icon on your avatar card above to customize your dossier information!"}
                </p>
              </div>
            </div>
          </div>

          {/* Bento Section: My Sighting Logs & My Active Pledges */}
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
                <span className="material-symbols-outlined text-[#ab2c5d]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
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
                            <img src={cat.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl bg-[var(--bg-elevated)]">🐱</div>
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

          {/* Points/Activity History */}
          <ProfileActivityLogs recentPoints={recentPoints} auditLogs={auditLogs} />
        </div>

        {/* Sidebar Area (4 columns) */}
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
                    className="px-2.5 py-1 bg-[#ffdcc5] text-[var(--empire-gold-dim)] rounded-lg font-body text-[10px] font-bold uppercase tracking-wider border border-[var(--bg-border)]/20"
                  >
                    ✨ {b.badge_id.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Moderator Application */}
          {userRole === 'user' && (
            <ModeratorApplicationCard points={profile.empire_points} hasPendingApp={hasPendingApp} />
          )}

          {/* Profile Queries and Support */}
          {userRole === 'user' && (
            <ProfileQueries initialQueries={userQueries} />
          )}

          {/* GDPR / Data Deletion */}
          <DataPortability />
          <DataDeletion />
        </div>
      </div>
    </div>
  );
}
