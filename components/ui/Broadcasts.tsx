'use client';
// components/ui/Broadcasts.tsx — Client component for global banners and modals

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Notice {
  id: string;
  title: string;
  content: string;
  is_broadcast: boolean;
  broadcast_type: 'info' | 'warning' | 'error' | 'success';
  is_popup: boolean;
  expires_at: string | null;
  target_page: string;
  pinned: boolean;
}

const getPageKey = (pathname: string): string => {
  if (!pathname) return 'all';
  if (pathname === '/') return 'landing';
  if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/admin-login') || pathname.startsWith('/auth/moderator-login')) return 'login';
  if (pathname.startsWith('/auth/signup')) return 'signup';
  if (pathname.startsWith('/map')) return 'map';
  if (pathname.startsWith('/cats')) return 'cats';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/empire')) return 'empire';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/safety')) return 'safety';
  if (pathname.startsWith('/weather')) return 'weather';
  if (pathname.startsWith('/notices')) return 'notices';
  return 'other';
};

export default function Broadcasts() {
  const pathname = usePathname();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [dismissedPopups, setDismissedPopups] = useState<string[]>([]);
  const [activePopup, setActivePopup] = useState<Notice | null>(null);

  const supabase = createClient();

  const fetchNotices = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('notices' as never)
        .select('id, title, content, is_broadcast, broadcast_type, is_popup, expires_at, target_page, pinned')
        .eq('active', true)
        .or('is_broadcast.eq.true,is_popup.eq.true')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('pinned', { ascending: false }) as unknown as { data: Notice[] | null; error: unknown };

      if (error) {
        console.error('Error fetching broadcasts/popups:', error);
      } else {
        setNotices(data || []);
      }
    } catch (err) {
      console.error('fetchNotices error:', err);
    }
  };

  useEffect(() => {
    // Load dismissed notices from storage
    try {
      const storedDismissed = localStorage.getItem('meownet_dismissed_notices');
      if (storedDismissed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissedIds(JSON.parse(storedDismissed));
      }
      const storedPopups = sessionStorage.getItem('meownet_dismissed_popups');
      if (storedPopups) {
        setDismissedPopups(JSON.parse(storedPopups));
      }
    } catch (e) {
      console.error('Failed to read dismissed storage:', e);
    }

    fetchNotices();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notices_broadcast_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notices' },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update active popup
  const pageKey = getPageKey(pathname);

  useEffect(() => {
    const popups = notices.filter(
      n => n.is_popup && !dismissedPopups.includes(n.id) && (n.target_page === 'all' || n.target_page === pageKey)
    );
    if (popups.length > 0) {
      // Show the latest popup
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivePopup(popups[0]);
    } else {
      setActivePopup(null);
    }
  }, [notices, dismissedPopups, pageKey]);

  const dismissBroadcast = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('meownet_dismissed_notices', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const dismissPopup = (id: string) => {
    const updated = [...dismissedPopups, id];
    setDismissedPopups(updated);
    try {
      sessionStorage.setItem('meownet_dismissed_popups', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const activeBroadcasts = notices.filter(
    n => n.is_broadcast && !dismissedIds.includes(n.id) && (n.target_page === 'all' || n.target_page === pageKey)
  );

  if (activeBroadcasts.length === 0 && !activePopup) return null;

  return (
    <>
      {/* Broadcast Banners Container */}
      {activeBroadcasts.length > 0 && (
        <div className="w-full flex flex-col gap-2 p-2 sm:px-4 z-40 bg-[var(--bg-void)]">
          {activeBroadcasts.map((b) => {
            // Style map based on broadcast_type
            let bgColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            let icon = 'info';
            let iconColor = 'text-amber-500';

            if (b.broadcast_type === 'error') {
              bgColor = 'bg-red-500/10 text-red-600 border-red-500/20';
              icon = 'error';
              iconColor = 'text-red-500';
            } else if (b.broadcast_type === 'warning') {
              bgColor = 'bg-orange-500/10 text-orange-600 border-orange-500/20';
              icon = 'warning';
              iconColor = 'text-orange-500';
            } else if (b.broadcast_type === 'success') {
              bgColor = 'bg-teal-500/10 text-teal-600 border-teal-500/20';
              icon = 'check_circle';
              iconColor = 'text-teal-500';
            } else {
              // info
              bgColor = 'bg-[rgba(148,74,0,0.08)] text-[var(--empire-gold)] border-[rgba(148,74,0,0.15)]';
              icon = 'campaign';
              iconColor = 'text-[var(--empire-gold)]';
            }

            return (
              <div
                key={b.id}
                className={`relative flex items-start gap-3 p-3.5 sm:px-5 rounded-2xl border backdrop-blur-md transition-all ${bgColor}`}
                role="alert"
              >
                <span className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${iconColor}`}>
                  {icon}
                </span>
                <div className="flex-1 pr-6">
                  <h4 className="font-display font-bold text-sm tracking-wide leading-tight">
                    {b.title}
                  </h4>
                  <p className="font-body text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
                    {b.content}
                  </p>
                </div>
                <button
                  onClick={() => dismissBroadcast(b.id)}
                  className="absolute right-3 top-3.5 p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  aria-label="Dismiss broadcast"
                >
                  <span className="material-symbols-outlined text-lg leading-none">close</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Popup Modal Dialog */}
      {activePopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-lg rounded-3xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative"
            style={{
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-[var(--empire-gold)]">
                  campaign
                </span>
                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--text-primary)]">
                  {activePopup.title}
                </h3>
              </div>
              <button
                onClick={() => dismissPopup(activePopup.id)}
                className="p-1.5 rounded-full hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close dialog"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            
            <div className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6 whitespace-pre-wrap">
              {activePopup.content}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => dismissPopup(activePopup.id)}
                className="px-6 py-2.5 rounded-xl font-display font-bold text-sm tracking-wide text-white transition-all hover:scale-[1.02] shadow-[0_4px_12px_rgba(148,74,0,0.2)]"
                style={{
                  background: 'var(--empire-gold)',
                }}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
