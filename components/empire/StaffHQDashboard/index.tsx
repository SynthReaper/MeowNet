'use client';
// components/empire/StaffHQDashboard/index.tsx — Gamified Staff HQ for admins/moderators

interface StaffStats {
  catsApproved: number;
  catsDeleted: number;
  queriesRaised: number;
  queriesResolved: number;
  eventsModerated: number;
  totalActions: number;
}

interface StaffHQProps {
  displayName: string;
  avatarUrl: string | null;
  role: 'admin' | 'moderator';
  stats: StaffStats;
}

const GUARDIAN_RANKS = [
  { min: 0,   title: 'Patrol Rookie',      icon: 'pets', color: '#8b8b8b', desc: 'Just started the patrol.' },
  { min: 10,  title: 'Colony Warden',       icon: 'shield', color: '#4ade80', desc: 'Keeping small colonies safe.' },
  { min: 30,  title: 'District Enforcer',   icon: 'swords', color: '#38bdf8', desc: 'Protecting whole districts.' },
  { min: 60,  title: 'Elite Sentinel',      icon: 'grade', color: '#f59e0b', desc: 'Among the top guardians.' },
  { min: 100, title: 'Grand Protector',     icon: 'crown', color: '#e879f9', desc: 'The highest guardian honour.' },
];

function getGuardianRank(totalActions: number) {
  for (let i = GUARDIAN_RANKS.length - 1; i >= 0; i--) {
    if (totalActions >= GUARDIAN_RANKS[i].min) return GUARDIAN_RANKS[i];
  }
  return GUARDIAN_RANKS[0];
}

function getNextRank(totalActions: number) {
  for (const rank of GUARDIAN_RANKS) {
    if (totalActions < rank.min) return rank;
  }
  return null;
}

export default function StaffHQDashboard({ displayName, avatarUrl, role, stats }: StaffHQProps) {
  const currentRank = getGuardianRank(stats.totalActions);
  const nextRank = getNextRank(stats.totalActions);
  const progressMin = currentRank.min;
  const progressMax = nextRank ? nextRank.min : currentRank.min + 50;
  const progressPercent = nextRank
    ? Math.min(Math.max(((stats.totalActions - progressMin) / (progressMax - progressMin)) * 100, 5), 100)
    : 100;

  const isAdmin = role === 'admin';
  const accentColor = 'var(--empire-gold)';
  const accentBg = 'color-mix(in srgb, var(--empire-gold) 8%, transparent)';
  const roleLabel = isAdmin ? 'System Administrator' : 'Community Moderator';
  const roleIcon = isAdmin ? 'crown' : 'shield';

  return (
    <div className="flex flex-col gap-8">
      {/* Staff HQ Header */}
      <div className="relative rounded-3xl overflow-hidden border border-[var(--bg-border)] shadow-ambient"
        style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)' }}>
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 70% 50%, ${accentColor} 0%, transparent 70%)` }} />
        <div className="relative p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 flex-shrink-0 shadow-lg"
            style={{ borderColor: accentColor }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: accentBg }}>
                <span className="material-symbols-outlined text-4xl" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>
                  {roleIcon}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2 flex-grow text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="material-symbols-outlined text-lg" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>
                {roleIcon}
              </span>
              <span className="font-body text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                {roleLabel}
              </span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[var(--empire-cream)]">{displayName}</h1>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="material-symbols-outlined text-2xl" style={{ color: currentRank.color, fontVariationSettings: "'FILL' 1" }}>
                {currentRank.icon}
              </span>
              <span className="font-display text-lg font-bold" style={{ color: currentRank.color }}>
                {currentRank.title}
              </span>
            </div>
            <p className="font-body text-xs text-[var(--empire-cream)]/50 italic">{currentRank.desc}</p>

            {/* Progress to next rank */}
            {nextRank && (
              <div className="mt-2 max-w-sm w-full mx-auto md:mx-0">
                <div className="flex justify-between text-[10px] font-bold mb-1" style={{ color: accentColor }}>
                  <span>{stats.totalActions} actions</span>
                  <span>{nextRank.title} at {nextRank.min}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-border)]/20">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%`, background: accentColor }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Total Actions Badge */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1 p-4 rounded-2xl border text-center"
            style={{ borderColor: 'color-mix(in srgb, var(--empire-gold) 25%, transparent)', background: accentBg }}>
            <span className="font-data text-3xl font-black" style={{ color: accentColor }}>
              {stats.totalActions}
            </span>
            <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/50">
              Total<br />Actions
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Cats Approved', value: stats.catsApproved, icon: 'check_circle', color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
          { label: 'Cats Deleted', value: stats.catsDeleted, icon: 'delete_forever', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
          { label: 'Queries Raised', value: stats.queriesRaised, icon: 'question_answer', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Queries Resolved', value: stats.queriesResolved, icon: 'task_alt', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
          { label: 'Events Actioned', value: stats.eventsModerated, icon: 'event_available', color: '#e879f9', bg: 'rgba(232,121,249,0.08)' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-[var(--bg-border)] shadow-ambient flex flex-col items-center text-center gap-2 hover:scale-[1.02] transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>
                {stat.icon}
              </span>
            </div>
            <span className="font-data text-2xl font-black text-[var(--empire-cream)]">{stat.value}</span>
            <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 leading-tight">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Staff Missions */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--bg-border)] shadow-ambient">
        <h2 className="font-display text-lg font-bold text-[var(--empire-cream)] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>military_tech</span>
          <span>Staff Missions</span>
          <span className="ml-auto font-body text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider">Ongoing Challenges</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'The Approver',
              desc: 'Approve 10 cat sightings',
              progress: Math.min(stats.catsApproved, 10),
              total: 10,
              icon: 'pets',
              color: '#4ade80',
            },
            {
              title: 'Query Master',
              desc: 'Raise 5 moderation queries',
              progress: Math.min(stats.queriesRaised, 5),
              total: 5,
              icon: 'question_answer',
              color: '#f59e0b',
            },
            {
              title: 'Event Guardian',
              desc: 'Moderate 3 TNR events',
              progress: Math.min(stats.eventsModerated, 3),
              total: 3,
              icon: 'content_cut',
              color: '#e879f9',
            },
            {
              title: 'Problem Solver',
              desc: 'Resolve 5 pending queries',
              progress: Math.min(stats.queriesResolved, 5),
              total: 5,
              icon: 'task_alt',
              color: '#38bdf8',
            },
          ].map((mission) => {
            const done = mission.progress >= mission.total;
            const pct = Math.min((mission.progress / mission.total) * 100, 100);
            return (
              <div key={mission.title} className={`p-4 rounded-xl border flex flex-col gap-2.5 ${done ? 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/40' : 'bg-[var(--bg-void)] border-[var(--bg-border)]/20'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: mission.color + '15' }}>
                    <span className="material-symbols-outlined text-base" style={{ color: mission.color, fontVariationSettings: "'FILL' 1" }}>
                      {mission.icon}
                    </span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="font-body text-xs font-bold text-[var(--empire-cream)] flex items-center gap-1.5">
                      <span className="truncate">{mission.title}</span>
                      {done && <span className="material-symbols-outlined text-xs text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                    </div>
                    <div className="font-body text-[10px] text-[var(--empire-cream)]/50">{mission.desc}</div>
                  </div>
                  <span className="font-data text-xs font-bold text-[var(--empire-cream)]/60 shrink-0">
                    {mission.progress}/{mission.total}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-border)]/20">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: done ? '#4ade80' : mission.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--bg-border)] shadow-ambient">
        <h2 className="font-display text-base font-bold text-[var(--empire-cream)] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span>Quick Access</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Moderation Queue', href: '/moderator', icon: 'shield', color: accentColor },
            { label: 'Mission Control', href: '/map', icon: 'explore', color: '#38bdf8' },
            ...(isAdmin ? [{ label: 'Admin Panel', href: '/admin', icon: 'admin_panel_settings', color: '#e879f9' }] : []),
            { label: 'Community', href: '/community', icon: 'forum', color: '#4ade80' },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--bg-border)]/30 hover:border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/10 transition-all no-underline text-center group"
            >
              <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style={{ color: action.color, fontVariationSettings: "'FILL' 1" }}>
                {action.icon}
              </span>
              <span className="font-body text-[10px] font-bold text-[var(--empire-cream)]/70 uppercase tracking-wider leading-tight">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
