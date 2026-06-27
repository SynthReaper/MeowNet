// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';

interface NavLink {
  href: string;
  label: string;
  id: string;
  icon: string;
}

interface NavGroup {
  label: string;
  icon: string;
  links: NavLink[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Mission Control',
    icon: 'explore',
    links: [
      { href: '/map', label: 'Interactive Map', id: 'nav-map', icon: 'explore' },
      { href: '/safety', label: 'Safety Guides', id: 'nav-safety', icon: 'health_and_safety' },
      { href: '/weather', label: 'Weather Watch', id: 'nav-weather', icon: 'partly_cloudy_day' },
    ],
  },
  {
    label: 'Cat Logs',
    icon: 'pets',
    links: [
      { href: '/cats', label: 'Find Cats', id: 'nav-cats', icon: 'pets' },
      { href: '/colonies', label: 'Cat Colonies', id: 'nav-colonies', icon: 'home_work' },
    ],
  },
  {
    label: 'TNR & Community',
    icon: 'group',
    links: [
      { href: '/events', label: 'TNR Events', id: 'nav-events', icon: 'event' },
      { href: '/stories', label: 'Success Stories', id: 'nav-stories', icon: 'auto_stories' },
      { href: '/community', label: 'Community Forum', id: 'nav-community', icon: 'forum' },
      { href: '/notices', label: 'Notice Board', id: 'nav-notices', icon: 'campaign' },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  // State initialized to safe default values to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<string>('light');
  const [userRole, setUserRole] = useState<string>('user');
  const [dbAvatarUrl, setDbAvatarUrl] = useState<string | null>(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({});

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string>('Volunteer');

  const isUserLoggedIn = isSignedIn || !!supabaseUser;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Safe hydration load
  useEffect(() => {
    setMounted(true);
    setTheme(localStorage.getItem('theme') || 'light');
    setUserRole(localStorage.getItem('cached_role') || 'user');
    setDbAvatarUrl(localStorage.getItem('cached_avatar'));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setIsSupabaseLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem('cached_avatar');
    localStorage.removeItem('cached_role');
    const supabase = createClient();
    await supabase.auth.signOut();
    if (isSignedIn) {
      signOut({ redirectUrl: '/' });
    } else {
      window.location.href = '/';
    }
  };

  // Notifications and Realtime Sub
  useEffect(() => {
    if (!isUserLoggedIn) return;

    const fetchNotifs = async () => {
      try {
        const { getUserNotifications } = await import('@/lib/actions/community');
        const data = await getUserNotifications();
        setNotifications(data);
      } catch (e) {
        console.error('Failed to fetch notifications:', e);
      }
    };

    fetchNotifs();

    const supabase = createClient();
    const sub = supabase
      .channel('navbar-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
      }, (payload: any) => {
        setNotifications((prev) => [payload.new, ...prev].slice(0, 50));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_notifications',
      }, (payload: any) => {
        setNotifications((prev) => prev.map(n => n.id === payload.new.id ? payload.new : n));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [isUserLoggedIn]);

  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClose = () => setIsNotifOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isNotifOpen]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { markAllNotificationsAsRead } = await import('@/lib/actions/community');
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotifClick = async (notif: any) => {
    try {
      const { markNotificationAsRead } = await import('@/lib/actions/community');
      await markNotificationAsRead(notif.id);
      setNotifications((prev) => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
    setIsNotifOpen(false);
  };

  useEffect(() => {
    if (!isUserLoggedIn) {
      setDbAvatarUrl(null);
      setUserRole('user');
      setUserDisplayName('Volunteer');
      return;
    }

    const cachedAvatar = localStorage.getItem('cached_avatar');
    if (cachedAvatar) setDbAvatarUrl(cachedAvatar);

    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user: su } } = await supabase.auth.getUser();
      if (!su) return;

      const { data } = await supabase
        .from('profiles' as never)
        .select('avatar_url, role, is_enabled, password_expires_at, display_name')
        .eq('id', su.id)
        .single() as {
          data: {
            avatar_url: string | null;
            role: string;
            is_enabled: boolean;
            password_expires_at?: string | null;
            display_name: string | null;
          } | null;
        };

      if (data) {
        const isExpired = data.password_expires_at && new Date(data.password_expires_at) < new Date();
        if (data.is_enabled === false || isExpired) {
          if (isExpired && data.is_enabled !== false) {
            const { toggleProfileEnabled } = await import('@/lib/actions/admin');
            await toggleProfileEnabled(su.id, false);
          }
          handleSignOut();
          return;
        }

        setUserDisplayName(data.display_name || 'Volunteer');

        const newUrl = data.avatar_url || null;
        setDbAvatarUrl(newUrl);
        if (newUrl) localStorage.setItem('cached_avatar', newUrl);
        else localStorage.removeItem('cached_avatar');

        const newRole = data.role || 'user';
        setUserRole(newRole);
        localStorage.setItem('cached_role', newRole);
      }
    };

    fetchProfile();
  }, [isUserLoggedIn, supabaseUser?.id, pathname]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      const cached = localStorage.getItem('cached_avatar');
      setDbAvatarUrl(cached);
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const toggleMobileGroup = (label: string) => {
    setMobileExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Hydration-safe displays
  const showAdmin = mounted && userRole === 'admin';
  const showMod = mounted && userRole === 'moderator';
  const showStaff = showAdmin || showMod;

  const logoText = !mounted ? 'MeowNet' : (userRole === 'admin' ? 'MeowNet Admin' : userRole === 'moderator' ? 'MeowNet Staff' : 'MeowNet');
  const logoIcon = !mounted ? 'pets' : (userRole === 'admin' ? 'crown' : userRole === 'moderator' ? 'shield' : 'pets');
  const staffBadge = !mounted ? null : (userRole === 'admin' ? 'Admin' : userRole === 'moderator' ? 'Mod' : null);

  const avatarSrc = dbAvatarUrl || user?.imageUrl;

  // Build list of staff links
  const staffLinks: NavLink[] = [];
  if (showAdmin) {
    staffLinks.push({ href: '/admin', label: 'Admin Control', id: 'nav-admin', icon: 'admin_panel_settings' });
  }
  if (showStaff) {
    staffLinks.push({ href: '/moderator', label: 'Moderator Queue', id: 'nav-moderator', icon: 'shield' });
  }

  // Active Dropdowns list
  const groupsToRender = [...NAV_GROUPS];
  if (staffLinks.length > 0) {
    groupsToRender.push({
      label: 'Staff Commands',
      icon: 'admin_panel_settings',
      links: staffLinks,
    });
  }

  return (
    <header
      suppressHydrationWarning
      className="bg-[var(--bg-surface)] border-b border-[var(--bg-border)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] sticky top-0 z-[9999] w-full h-16 flex items-center transition-colors duration-300"
    >
      <div className="flex justify-between items-center px-4 md:px-10 w-full max-w-screen-xl mx-auto gap-3" ref={dropdownRef}>

        {/* Logo */}
        <Link href="/" id="nav-logo" className="flex items-center gap-2 no-underline shrink-0">
          <div className="w-7 h-7 flex items-center justify-center p-0.5 bg-[var(--bg-elevated)]/40 rounded-md border border-[var(--bg-border)]/20 shadow-sm overflow-hidden">
            <img
              src="/pet-logo.png"
              alt="MeowNet Logo"
              className="w-full h-full object-cover rounded"
            />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-[var(--empire-gold)]">
            {logoText}
          </span>
          {staffBadge && (
            <span className="hidden sm:inline text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] border border-[var(--empire-gold)]/20 uppercase tracking-widest">
              {staffBadge}
            </span>
          )}
        </Link>

        {/* Desktop Nav (High-Density Grouped Dropdowns) */}
        <nav className="hidden lg:flex gap-4 xl:gap-6 items-center flex-1 justify-center relative">
          {groupsToRender.map((group) => {
            const isGroupActive = group.links.some(
              (link) => pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            );
            const isOpen = openDropdown === group.label;

            return (
              <div key={group.label} className="relative">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : group.label)}
                  className={`font-body text-sm font-semibold flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-all border-none bg-transparent cursor-pointer ${
                    isGroupActive
                      ? 'text-[var(--empire-gold)] font-bold'
                      : 'text-[var(--text-primary)]/70 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
                  aria-expanded={isOpen}
                >
                  <span className="material-symbols-outlined text-base shrink-0">{group.icon}</span>
                  <span>{group.label}</span>
                  <span className={`material-symbols-outlined text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Dropdown Menu Container */}
                {isOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-0.5 animate-fade-in backdrop-blur-md">
                    {group.links.map((link) => {
                      const isLinkActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                      const isGuestAllowed = ['/map', '/cats', '/events', '/colonies', '/stories'].includes(link.href);

                      if (!isUserLoggedIn && !isGuestAllowed) {
                        return (
                          <Link
                            key={link.href}
                            href="/auth/login"
                            title="Sign in required"
                            onClick={() => setOpenDropdown(null)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--text-primary)]/40 hover:bg-[var(--bg-elevated)] no-underline transition-all"
                          >
                            <span className="material-symbols-outlined text-sm shrink-0">lock</span>
                            <span className="flex-1 truncate">{link.label}</span>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--empire-gold)]/50">Join</span>
                          </Link>
                        );
                      }

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          id={link.id}
                          onClick={() => setOpenDropdown(null)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold no-underline transition-all ${
                            isLinkActive
                              ? 'bg-[var(--empire-gold)]/10 text-[var(--empire-gold)]'
                              : 'text-[var(--text-primary)]/75 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm shrink-0">{link.icon}</span>
                          <span className="truncate">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Direct link for Leaderboard */}
          <Link
            href="/empire"
            id="nav-empire"
            className={`font-body text-sm font-semibold flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-all no-underline ${
              pathname === '/empire'
                ? 'text-[var(--empire-gold)] font-bold'
                : 'text-[var(--text-primary)]/70 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-base shrink-0">leaderboard</span>
            <span>Leaderboard</span>
          </Link>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            id="nav-theme-toggle"
            className="h-8 w-8 rounded-lg border border-[var(--bg-border)] bg-transparent text-[var(--text-primary)]/70 hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-base">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {isUserLoggedIn ? (
            <>
              {mounted && userRole === 'user' && (
                <Link
                  href="/cats/new"
                  id="nav-log-cat"
                  className="bg-[var(--empire-gold)] text-white hover:opacity-90 px-3 py-1.5 rounded-lg text-xs font-bold no-underline transition-all hidden sm:flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Log Sighting
                </Link>
              )}

              {/* Notification Bell */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  type="button"
                  id="nav-notifications-toggle"
                  className="h-8 w-8 rounded-lg border border-[var(--bg-border)] bg-transparent text-[var(--text-primary)]/70 hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-all cursor-pointer relative"
                  aria-label="Notifications"
                >
                  <span className="material-symbols-outlined text-base">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[350px]">
                    <div className="px-4 py-3 border-b border-[var(--bg-border)] flex items-center justify-between bg-[var(--bg-elevated)]">
                      <span className="font-display text-xs font-bold text-[var(--text-primary)]">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="font-body text-[10px] text-[var(--empire-gold)] hover:text-[#e6b020] font-bold bg-transparent border-none cursor-pointer"
                          type="button"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-[var(--bg-border)]/40 max-h-[250px]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[var(--text-primary)]/40 font-body">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`p-3 text-left transition-colors cursor-pointer hover:bg-[var(--bg-elevated)] flex gap-2 items-start ${!n.is_read ? 'bg-[var(--empire-gold)]/5' : ''}`}
                          >
                            <span className="material-symbols-outlined text-sm text-[var(--empire-gold)] mt-0.5">
                              {n.type === 'private_message' ? 'mail' : 'info'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-body text-[11px] font-bold text-[var(--text-primary)] flex justify-between items-center gap-1">
                                <span>{n.title}</span>
                                <span className="font-body text-[9px] text-[var(--text-primary)]/30 font-normal">
                                  {new Date(n.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-body text-[10px] text-[var(--text-primary)]/60 mt-0.5 leading-normal">
                                {n.message}
                              </p>
                              {n.target_url && (
                                <Link
                                  href={n.target_url}
                                  className="inline-flex items-center gap-0.5 text-[9px] text-[var(--empire-gold)] font-bold mt-1 no-underline hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotifClick(n);
                                  }}
                                >
                                  View details <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/profile"
                id="nav-profile-avatar"
                title="View Profile"
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border-2 border-[var(--bg-border)] bg-[var(--bg-elevated)] hover:border-[var(--empire-gold)] hover:scale-105 transition-all"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-extrabold text-[var(--empire-gold)]">
                    {userDisplayName[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </Link>

              <button
                onClick={handleSignOut}
                type="button"
                id="nav-sign-out"
                className="hidden md:flex border border-[var(--bg-border)] text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span className="hidden lg:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                id="nav-login"
                className="border border-[var(--bg-border)] text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)] px-3 py-1.5 rounded-lg text-xs font-medium no-underline transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                id="nav-signup"
                className="bg-[var(--empire-gold)] text-white hover:opacity-90 px-3 py-1.5 rounded-lg text-xs font-bold no-underline transition-all"
              >
                Join
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            type="button"
            id="nav-mobile-toggle"
            className="lg:hidden h-8 w-8 rounded-lg border border-[var(--bg-border)] text-[var(--text-primary)]/70 hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-all cursor-pointer"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-xl">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Accordion-style high density nav) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[var(--bg-surface)] border-l border-[var(--bg-border)] p-5 flex flex-col gap-5 shadow-2xl z-50">

            <div className="flex justify-between items-center">
              <span className="font-display text-sm font-bold text-[var(--empire-gold)]">
                {logoText}
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
                className="p-1 rounded-lg text-[var(--text-primary)]/60 hover:bg-[var(--bg-elevated)] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
              {groupsToRender.map((group) => {
                const isExpanded = !!mobileExpandedGroups[group.label];
                
                return (
                  <div key={group.label} className="flex flex-col border border-[var(--bg-border)]/40 rounded-xl overflow-hidden bg-[var(--bg-elevated)]/30">
                    <button
                      onClick={() => toggleMobileGroup(group.label)}
                      className="w-full flex items-center justify-between px-3 py-2.5 font-body text-xs font-bold text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)] border-none text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[var(--empire-gold)]">{group.icon}</span>
                        <span>{group.label}</span>
                      </div>
                      <span className="material-symbols-outlined text-base">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="flex flex-col gap-0.5 px-2 pb-2 bg-[var(--bg-surface)]">
                        {group.links.map((link) => {
                          const active = isUserLoggedIn && (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)));
                          const isGuestAllowed = ['/map', '/cats', '/events', '/colonies', '/stories'].includes(link.href);

                          if (!isUserLoggedIn && !isGuestAllowed) {
                            return (
                              <div key={link.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-35 select-none text-xs">
                                <span className="material-symbols-outlined text-base">lock</span>
                                <span className="font-body">{link.label}</span>
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              id={`mobile-${link.id}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-xs font-semibold no-underline transition-all ${
                                active
                                  ? 'bg-[var(--empire-gold)]/10 text-[var(--empire-gold)]'
                                  : 'text-[var(--text-primary)]/70 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                {link.icon}
                              </span>
                              <span>{link.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile Direct Link for Leaderboard */}
              <Link
                href="/empire"
                id="mobile-nav-empire"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between border border-[var(--bg-border)]/40 rounded-xl px-3 py-2.5 font-body text-xs font-bold no-underline transition-all ${
                  pathname === '/empire'
                    ? 'bg-[var(--empire-gold)]/10 text-[var(--empire-gold)]'
                    : 'text-[var(--text-primary)]/70 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">leaderboard</span>
                  <span>Leaderboard</span>
                </div>
              </Link>
            </nav>

            {isUserLoggedIn && (
              <div className="border-t border-[var(--bg-border)]/50 pt-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--bg-border)] bg-[var(--bg-elevated)] flex-shrink-0 flex items-center justify-center">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-extrabold text-xs text-[var(--empire-gold)]">
                        {userDisplayName[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-body text-xs font-bold truncate text-[var(--text-primary)]">
                      {userDisplayName}
                    </div>
                    <div className="font-body text-[10px] capitalize text-[var(--text-primary)]/45">
                      {userRole}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }}
                  type="button"
                  id="mobile-sign-out"
                  className="w-full border border-[var(--bg-border)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-elevated)] py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
