'use client';
// components/empire/ActivityLog/index.tsx

interface PointLogEntry {
  activity: string;
  points: number;
  created_at: string;
}

interface ActivityLogProps {
  entries: PointLogEntry[];
}

const ACTIVITY_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  CAT_LOGGED: {
    label: 'Logged a Cat Sighting',
    icon: 'add_a_photo',
    bg: '#ffdcc5', // orange/peach tint
    color: '#713700',
  },
  CAT_MARKED_TNR: {
    label: 'Marked Cat as TNR',
    icon: 'check_circle',
    bg: '#d1fae5', // emerald tint
    color: '#065f46',
  },
  CAT_MARKED_ADOPTED: {
    label: 'Cat Adopted',
    icon: 'home',
    bg: '#ffdcc5', // gold/orange tint
    color: '#713700',
  },
  EVENT_CREATED: {
    label: 'Created TNR Event',
    icon: 'event',
    bg: '#e0f2fe', // sky tint
    color: '#0369a1',
  },
  EVENT_SIGNUP: {
    label: 'Joined TNR Event',
    icon: 'assignment_turned_in',
    bg: '#f3e8ff', // purple tint
    color: '#6b21a8',
  },
  EVENT_ATTENDED: {
    label: 'Attended TNR Event',
    icon: 'workspace_premium',
    bg: '#d1fae5', // emerald/green tint
    color: '#065f46',
  },
  HEALTH_FLAGS_ADDED: {
    label: 'Updated Health Info',
    icon: 'medical_services',
    bg: '#fee2e2', // red/pink tint
    color: '#991b1b',
  },
  STREAK_BONUS: {
    label: 'Weekly Streak Bonus',
    icon: 'bolt',
    bg: '#fef3c7', // amber/gold tint
    color: '#92400e',
  },
  LEND_A_PAW: {
    label: 'Lent a Paw (Care Pledge)',
    icon: 'volunteer_activism',
    bg: '#fbcfe8', // pink/rose tint
    color: '#9d174d',
  },
};

function getTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col">
      <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined font-normal">history</span>
        <span>My Activity Log</span>
      </h2>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--bg-border)]/50 flex-grow">
          <span className="material-symbols-outlined text-3xl text-[var(--empire-cream)]/30 mb-2">pending_actions</span>
          <p className="font-body text-xs text-[var(--empire-cream)]/50">
            No activity tracked yet. Participate in events, sponsor cats, or log sightings to earn points!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
          {entries.map((log, index) => {
            const config = ACTIVITY_CONFIG[log.activity] || {
              label: log.activity.replace(/_/g, ' ').toLowerCase(),
              icon: 'stars',
              bg: '#f1ede7',
              color: '#887365',
            };

            return (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 hover:bg-[var(--bg-border)]/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: config.bg, color: config.color }}
                  >
                    <span className="material-symbols-outlined text-base font-normal">
                      {config.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate capitalize">
                      {config.label}
                    </h4>
                    <p className="font-body text-[10px] text-[var(--empire-cream)]/50 font-medium">
                      {getTimeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
                <span className="font-data text-xs font-bold text-[var(--life-teal)] bg-[var(--life-teal)]/10 px-2 py-0.5 rounded-lg flex-shrink-0">
                  +{log.points} pts
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
