// app/(app)/empire/page.tsx — Empire Dashboard (Server Component)
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import EmpireMetrics from '@/components/empire/EmpireMetrics';
import Leaderboard from '@/components/empire/Leaderboard';
import BadgeDisplay from '@/components/empire/BadgeDisplay';
import { BADGE_REGISTRY } from '@/lib/gamification/badges';
import CommunityFunds from '@/components/empire/CommunityFunds';
import EmpireCodex from '@/components/empire/EmpireCodex';
import ActivityLog from '@/components/empire/ActivityLog';
import StaffHQDashboard from '@/components/empire/StaffHQDashboard';
import ShareCard from '@/components/ui/ShareCard';

export const metadata: Metadata = {
  title: 'Empire Dashboard',
  description: 'Track your empire points, weekly leaderboard rankings, and badge collection.',
};

export const revalidate = 30;

export default async function EmpirePage() {
  const supabase = await createServerClient();

  const [impactRes, leaderboardRes, userRes, fundsRes] = await Promise.all([
    supabase.from('impact_summary' as never).select('*').single(),
    supabase.from('leaderboard_weekly' as never).select('*').limit(20),
    supabase.auth.getUser(),
    supabase.from('community_funds' as never).select('*, profiles:profiles(display_name)').order('created_at', { ascending: false }).limit(20)
  ]);

  const impact = (impactRes.data as Record<string, number> | null) ?? { total_cats: 0, tnr_count: 0, adopted_count: 0, active_volunteers: 0 };
  // Filter staff out of the leaderboard — only regular volunteers compete
  const allEntries = (leaderboardRes.data ?? []) as Array<{
    id: string; display_name: string | null; avatar_url: string | null;
    weekly_points: number; actions_taken: number; badge_ids: string[] | null;
    role?: string;
  }>;
  const leaderboard = allEntries.filter((e) => !e.role || (e.role !== 'admin' && e.role !== 'moderator'));
  const funds = (fundsRes.data ?? []) as any[];
  const user = userRes.data.user;
  const userId = user?.id;

  // Fetch user profile including role
  let profileData: any = null;
  if (userId) {
    const { data } = await supabase.from('profiles' as never).select('*').eq('id', userId).maybeSingle();
    profileData = data;
  }

  const userRole = profileData?.role ?? 'user';
  const isStaff = userRole === 'admin' || userRole === 'moderator';

  // ── STAFF HQ PATH ──────────────────────────────────────────────────────────
  if (isStaff && userId) {
    // Fetch moderation stats
    const [approvedRes, deletedRes, queriesRaisedRes, queriesResolvedRes, eventsRes] = await Promise.all([
      supabase.from('cats' as never).select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('moderator_queries' as never).select('id', { count: 'exact', head: true }).eq('moderator_id', userId),
      supabase.from('moderator_queries' as never).select('id', { count: 'exact', head: true }).eq('moderator_id', userId).eq('status', 'pending'),
      supabase.from('moderator_queries' as never).select('id', { count: 'exact', head: true }).eq('moderator_id', userId).eq('status', 'resolved'),
      supabase.from('tnr_events' as never).select('id', { count: 'exact', head: true }).neq('status', 'open'),
    ]);

    const totalActions = (approvedRes.count ?? 0) + (queriesRaisedRes.count ?? 0) + (queriesResolvedRes.count ?? 0) + (eventsRes.count ?? 0);

    const staffStats = {
      catsApproved: approvedRes.count ?? 0,
      catsDeleted: deletedRes.count ?? 0,
      queriesRaised: queriesRaisedRes.count ?? 0,
      queriesResolved: queriesResolvedRes.count ?? 0,
      eventsModerated: eventsRes.count ?? 0,
      totalActions,
    };

    const avatarUrl = profileData?.avatar_url || user?.user_metadata?.avatar_url || null;
    const displayName = profileData?.display_name || user?.user_metadata?.display_name || 'Staff Member';

    return (
      <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {userRole === 'admin' ? 'crown' : 'shield'}
            </span>
            <span>Staff HQ</span>
          </h1>
          <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
            {userRole === 'admin'
              ? 'Your administrator command centre. Monitor all moderation activity, track community health, and manage the MeowNet empire.'
              : 'Your moderation headquarters. Every query raised and cat approved keeps the colony safe. Keep up the great work!'}
          </p>
        </div>
        <StaffHQDashboard
          displayName={displayName}
          avatarUrl={avatarUrl}
          role={userRole as 'admin' | 'moderator'}
          stats={staffStats}
        />
      </div>
    );
  }

  // ── USER LEADERBOARD PATH ──────────────────────────────────────────────────
  let userBadges: string[] = [];
  let userPoints = 0;
  let userActions = 0;
  let recentLogs: any[] = [];
  let catsCount = 0;
  let tnrCount = 0;

  if (userId) {
    const [actionsRes, badgesRes, logsRes, catsCountRes, tnrCountRes] = await Promise.all([
      supabase.from('point_log' as never).select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('user_badges' as never).select('badge_id').eq('user_id', userId),
      supabase.from('point_log' as never).select('activity, points, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
      supabase.from('cats' as never).select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('event_signups' as never).select('id', { count: 'exact', head: true }).eq('user_id', userId)
    ]);
    userPoints = profileData?.empire_points ?? 0;
    userActions = actionsRes.count ?? 0;
    userBadges = ((badgesRes.data ?? []) as Array<{ badge_id: string }>).map((b) => b.badge_id);
    recentLogs = (logsRes.data ?? []) as any[];
    catsCount = catsCountRes.count ?? 0;
    tnrCount = tnrCountRes.count ?? 0;
  }

  // Calculate Rank Title & Progress
  let rankTitle = 'Recruit Scout';
  let nextRankTitle = 'Colony Mapper';
  let progressMin = 0;
  let progressMax = 100;
  
  if (userPoints >= 1000) {
    rankTitle = 'Neighborhood Guardian';
    nextRankTitle = 'Master Protector';
    progressMin = 1000;
    progressMax = 2000;
  } else if (userPoints >= 500) {
    rankTitle = 'Colony Protector';
    nextRankTitle = 'Neighborhood Guardian';
    progressMin = 500;
    progressMax = 1000;
  } else if (userPoints >= 100) {
    rankTitle = 'Colony Mapper';
    nextRankTitle = 'Colony Protector';
    progressMin = 100;
    progressMax = 500;
  }

  const progressPercent = Math.min(
    Math.max(((userPoints - progressMin) / (progressMax - progressMin)) * 100, 5),
    100
  );

  const avatarUrl = profileData?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName = profileData?.display_name || user?.user_metadata?.display_name || 'Anonymous Rescuer';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2 text-center md:text-left">
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center justify-center md:justify-start gap-3">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>castle</span>
          <span>The MeowNet Empire</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-2xl">
          See where you stand in the mission. Every action grows the empire. Keep up the amazing work protecting our feline friends!
        </p>
      </div>

      {/* Impact Metrics */}
      <EmpireMetrics
        totalCats={impact.total_cats ?? 0}
        tnrCount={impact.tnr_count ?? 0}
        adoptedCount={impact.adopted_count ?? 0}
        volunteers={impact.active_volunteers ?? 0}
      />

      {/* Bento Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Personal Stats & Badges (Right/Sidebar in mobile, Left in layout - 4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          {/* User Profile / Rank Card */}
          <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col items-center text-center group hover:shadow-[0_8px_24px_rgba(242,140,56,0.12)] transition-shadow">
            <div className="w-20 h-20 rounded-full bg-[#ffdcc5] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform overflow-hidden border-2 border-[var(--empire-gold)] shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
              )}
            </div>
            
            <span className="font-body text-[10px] font-bold text-[var(--life-teal)] uppercase tracking-wider mb-1">Your Rank</span>
            <h2 className="font-display text-lg text-[var(--empire-cream)] font-bold">{rankTitle}</h2>
            <p className="font-body text-xs text-[var(--empire-cream)]/70 mt-1 font-semibold">{displayName}</p>
            
            <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full mt-4 overflow-hidden border border-[var(--bg-border)]/20">
              <div 
                className="h-full bg-[var(--empire-gold)] rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="font-body text-[11px] text-[var(--empire-cream)]/50 mt-2 font-semibold">
              {userPoints} / {progressMax} to {nextRankTitle}
            </span>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-ambient border border-[var(--bg-border)] flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-3xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              <span className="font-display text-xl font-bold text-[var(--empire-cream)]">{userPoints}</span>
              <span className="font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Karma Points</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-ambient border border-[var(--bg-border)] flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[#ab2c5d] text-3xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              <span className="font-display text-xl font-bold text-[var(--empire-cream)]">{userActions}</span>
              <span className="font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Actions Logged</span>
            </div>
          </div>

          {/* Badges / Achievements Panel */}
          <BadgeDisplay badges={BADGE_REGISTRY as unknown as typeof BADGE_REGISTRY} earnedBadgeIds={userBadges} />

          {/* Active Quests Card */}
          <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)]">
            <h3 className="font-display text-base text-[var(--empire-cream)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--life-teal)] font-normal" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
              <span>Active Quests</span>
            </h3>
            <div className="flex flex-col gap-3">
              {/* Quest 1 */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 hover:bg-[var(--bg-border)]/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#8bf1e6]/30 flex items-center justify-center flex-shrink-0 text-[var(--life-teal)]">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">TNR Tuesday Prep</h4>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/50">Assist with 2 traps this week.</p>
                </div>
              </div>
              {/* Quest 2 */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 hover:bg-[var(--bg-border)]/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#ffdcc5] flex items-center justify-center flex-shrink-0 text-[var(--empire-gold)]">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">Colony Feeder</h4>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/50">Log 3 feeding checklists.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log Panel */}
          {userId && <ActivityLog entries={recentLogs} />}
        </div>

        {/* Leaderboard Panel (Left/Main - 8 columns) */}
        <div className="lg:col-span-8 w-full flex flex-col gap-6">
          <Leaderboard entries={leaderboard} currentUserId={userId} />
          <CommunityFunds funds={funds} userPoints={userPoints} />
          <EmpireCodex />
        </div>
      </div>

      {/* Share Impact Card Section */}
      {userId && (
        <div className="mt-8 flex flex-col gap-4">
          <h3 className="font-display text-lg text-[var(--empire-cream)] font-bold text-center">
            Share Your Impact
          </h3>
          <p className="font-body text-xs text-[var(--empire-cream)]/60 text-center -mt-2">
            Generate and download your community badge to share your contributions on social media!
          </p>
          <ShareCard
            displayName={displayName}
            points={userPoints}
            catLogsCount={catsCount}
            tnrCount={tnrCount}
          />
        </div>
      )}
    </div>
  );
}

