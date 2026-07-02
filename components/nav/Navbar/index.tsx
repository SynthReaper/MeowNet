// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { getSafeImageSrc } from '@/lib/security/url';

interface NavLink {
  href: string;
  label: string;
  id: string;
  icon: string;
  description?: string;
}

interface NavGroup {
  label: string;
  icon: string;
  links: NavLink[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Field Ops',
    icon: 'explore',
    links: [
      { href: '/map', label: 'Interactive Map', id: 'nav-map', icon: 'explore', description: 'Real-time stray sighting map' },
      { href: '/cats', label: 'Find Cats', id: 'nav-cats', icon: 'pets', description: 'Browse and search stray profiles' },
      { href: '/colonies', label: 'Cat Colonies', id: 'nav-colonies', icon: 'home_work', description: 'Manage colony feed routes' },
      { href: '/events', label: 'TNR Events', id: 'nav-events', icon: 'event', description: 'Join trap-neuter-return actions' },
      { href: '/reports', label: 'Field Reports', id: 'nav-reports', icon: 'analytics', description: 'View field log summaries & stats' },
      { href: '/safety', label: 'Safety Guides', id: 'nav-safety', icon: 'health_and_safety', description: 'Feline welfare and rescue guides' },
      { href: '/weather', label: 'Weather Watch', id: 'nav-weather', icon: 'partly_cloudy_day', description: 'Feline safety alerts & WMO metrics' },
    ],
  },
  {
    label: 'Community & Empire',
    icon: 'groups',
    links: [
      { href: '/empire', label: 'Empire Hub', id: 'nav-empire-hub', icon: 'military_tech', description: 'Leaderboards, ranks & badges' },
      { href: '/empire/trivia', label: 'Daily Trivia', id: 'nav-trivia', icon: 'quiz', description: 'Play daily to earn extra points' },
      { href: '/empire/bingo', label: 'Stray Bingo', id: 'nav-bingo', icon: 'grid_on', description: 'Complete weekly quest lines' },
      { href: '/empire/guilds', label: 'Volunteer Guilds', id: 'nav-guilds', icon: 'groups', description: 'Join regional volunteer teams' },
      { href: '/empire/tycoon', label: 'Colony Tycoon', id: 'nav-tycoon', icon: 'castle', description: 'Idle feline sanctuary game' },
      { href: '/community', label: 'Community Forum', id: 'nav-community', icon: 'forum', description: 'Discuss & DM with other guardians' },
      { href: '/stories', label: 'Success Stories', id: 'nav-stories', icon: 'auto_stories', description: 'Read adopted cat rescue diaries' },
      { href: '/notices', label: 'Notice Board', id: 'nav-notices', icon: 'campaign', description: 'Targeted announcements' },
    ],
  },
  {
    label: 'Personal Care',
    icon: 'favorite',
    links: [
      { href: '/profile/care-center', label: 'Care Center', id: 'nav-care-center', icon: 'health_and_safety', description: 'Zero-knowledge encrypted vitals' },
      { href: '/personal-helper', label: 'AI Helper', id: 'nav-personal-helper', icon: 'chat', description: 'Contextual feline assistant' },
      { href: '/profile', label: 'My Profile', id: 'nav-profile-link', icon: 'person', description: 'Manage accounts & GDPR details' },
      { href: '/profile/certificate', label: 'My Certificates', id: 'nav-certificates', icon: 'workspace_premium', description: 'Cryptographic verification proofs' },
    ],
  },
];

interface SearchItem {
  title: string;
  href: string;
  category: string;
  icon: string;
  keywords: string[];
}

const SEARCH_ITEMS: SearchItem[] = [
  { title: 'Interactive Map', href: '/map', category: 'Field Ops', icon: 'explore', keywords: ['map', 'live', 'strays', 'gps', 'cats', 'location'] },
  { title: 'Find Cats', href: '/cats', category: 'Field Ops', icon: 'pets', keywords: ['find', 'search', 'cats', 'profiles', 'sightings'] },
  { title: 'Log Cat Sighting', href: '/cats/new', category: 'Field Ops', icon: 'add_location_alt', keywords: ['log', 'sighting', 'report', 'add cat', 'new cat'] },
  { title: 'Cat Colonies', href: '/colonies', category: 'Field Ops', icon: 'home_work', keywords: ['colonies', 'colony', 'shelters', 'stray cats'] },
  { title: 'TNR Events', href: '/events', category: 'Field Ops', icon: 'event', keywords: ['tnr', 'events', 'trap', 'neuter', 'return', 'campaigns'] },
  { title: 'Field Reports', href: '/reports', category: 'Field Ops', icon: 'analytics', keywords: ['reports', 'field', 'volunteer', 'logs'] },
  { title: 'Safety Guides', href: '/safety', category: 'Field Ops', icon: 'health_and_safety', keywords: ['safety', 'guides', 'help', 'instructions'] },
  { title: 'Weather Watch', href: '/weather', category: 'Field Ops', icon: 'partly_cloudy_day', keywords: ['weather', 'watch', 'forecast', 'temperature', 'safety'] },
  
  { title: 'Empire Hub', href: '/empire', category: 'Community & Empire', icon: 'military_tech', keywords: ['empire', 'points', 'leaderboard', 'badges', 'rewards'] },
  { title: 'Daily Trivia', href: '/empire/trivia', category: 'Community & Empire', icon: 'quiz', keywords: ['trivia', 'quiz', 'daily', 'streak', 'points'] },
  { title: 'Stray Bingo', href: '/empire/bingo', category: 'Community & Empire', icon: 'grid_on', keywords: ['bingo', 'quests', 'weekly', 'challenges'] },
  { title: 'Volunteer Guilds', href: '/empire/guilds', category: 'Community & Empire', icon: 'groups', keywords: ['guilds', 'guild', 'teams', 'groups', 'regions'] },
  { title: 'Colony Tycoon', href: '/empire/tycoon', category: 'Community & Empire', icon: 'castle', keywords: ['tycoon', 'game', 'idle', 'empire', 'sanctuary'] },
  { title: 'Community Forum', href: '/community', category: 'Community & Empire', icon: 'forum', keywords: ['forum', 'community', 'chat', 'discussion', 'messages'] },
  { title: 'Success Stories', href: '/stories', category: 'Community & Empire', icon: 'auto_stories', keywords: ['stories', 'success', 'adoption', 'rescues'] },
  { title: 'Notice Board', href: '/notices', category: 'Community & Empire', icon: 'campaign', keywords: ['notices', 'announcements', 'broadcasts'] },
  
  { title: 'Care Center', href: '/profile/care-center', category: 'My Workspace', icon: 'health_and_safety', keywords: ['care', 'center', 'private', 'encrypted', 'vitals', 'meds'] },
  { title: 'AI Helper', href: '/personal-helper', category: 'My Workspace', icon: 'chat', keywords: ['helper', 'ai', 'gemini', 'chat', 'ask'] },
  { title: 'My Profile', href: '/profile', category: 'My Workspace', icon: 'person', keywords: ['profile', 'me', 'settings', 'account'] },
  { title: 'My Certificates', href: '/profile/certificate', category: 'My Workspace', icon: 'workspace_premium', keywords: ['certificates', 'verification', 'signature', 'volunteer'] },

  { title: 'Admin Control', href: '/admin', category: 'Staff Commands', icon: 'admin_panel_settings', keywords: ['admin', 'dashboard', 'settings', 'backend', 'roles'] },
  { title: 'Moderator Queue', href: '/moderator', category: 'Staff Commands', icon: 'shield', keywords: ['moderator', 'queue', 'tickets', 'queries', 'support'] },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  // State variables for quick command palette search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const [, setIsSupabaseLoaded] = useState(false);
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

  // Global Ctrl+K / Cmd+K search trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSearchQuery('');
      setSearchSelectedIndex(0);
    }
  }, [isSearchOpen]);

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

  let logoText = 'MeowNet';
  if (mounted) {
    if (userRole === 'admin') {
      logoText = 'MeowNet Admin';
    } else if (userRole === 'moderator') {
      logoText = 'MeowNet Staff';
    }
  }

  let staffBadge = null;
  if (mounted) {
    if (userRole === 'admin') {
      staffBadge = 'Admin';
    } else if (userRole === 'moderator') {
      staffBadge = 'Mod';
    }
  }

  const avatarSrc = dbAvatarUrl || user?.imageUrl;

  // Build list of staff links
  const staffLinks: NavLink[] = [];
  if (showAdmin) {
    staffLinks.push({ href: '/admin', label: 'Admin Control', id: 'nav-admin', icon: 'admin_panel_settings', description: 'System settings & audit logs' });
  }
  if (showStaff) {
    staffLinks.push({ href: '/moderator', label: 'Moderator Queue', id: 'nav-moderator', icon: 'shield', description: 'Verify sighting logs & tickets' });
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

  // Filter search items based on input, keywords, and role rules
  const filteredSearchItems = SEARCH_ITEMS.filter((item) => {
    if (item.href === '/admin' && userRole !== 'admin') return false;
    if (item.href === '/moderator' && userRole !== 'admin' && userRole !== 'moderator') return false;

    if (!searchQuery.trim()) {
      return ['Interactive Map', 'Find Cats', 'Care Center', 'Colony Tycoon', 'Daily Trivia'].includes(item.title);
    }

    const query = searchQuery.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => (prev + 1) % filteredSearchItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => (prev - 1 + filteredSearchItems.length) % filteredSearchItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSearchItems[searchSelectedIndex]) {
        const item = filteredSearchItems[searchSelectedIndex];
        const isGuestAllowed = ['/map', '/cats', '/events', '/colonies', '/stories'].includes(item.href);
        setIsSearchOpen(false);
        if (!isUserLoggedIn && !isGuestAllowed) {
          router.push('/auth/login');
        } else {
          router.push(item.href);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
    }
  };

  return (
    <header
      suppressHydrationWarning
      className="sticky top-0 z-[9999] w-full h-16 flex items-center transition-colors duration-300"
      style={{
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--navbar-border)',
        boxShadow: '0 1px 20px rgba(0,0,0,0.07)'
      }}
    >
      <div className="flex justify-between items-center px-4 md:px-10 w-full max-w-screen-xl mx-auto gap-3" ref={dropdownRef}>

        {/* Logo */}
        <Link href="/" id="nav-logo" className="flex items-center gap-2 no-underline shrink-0 group">
          <div className="w-8 h-8 flex items-center justify-center rounded-xl overflow-hidden shadow-md border border-[var(--bg-border)]/20 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-200" style={{background:'linear-gradient(135deg,#fbbf24,#f97316)'}}>
            <img
              src="/pet-logo.png"
              alt="MeowNet Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-black tracking-tight" style={{background:'linear-gradient(135deg,var(--empire-gold),#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              {logoText}
            </span>
            {staffBadge && (
              <span className="text-[8px] font-bold uppercase tracking-widest" style={{color:'var(--empire-gold)',opacity:0.7}}>
                {staffBadge}
              </span>
            )}
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex gap-1 xl:gap-1.5 items-center flex-1 justify-center relative">
          {groupsToRender.map((group) => {
            const isGroupActive = group.links.some(
              (link) => pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            );
            const isOpen = openDropdown === group.label;

            return (
              <div key={group.label} className="relative">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : group.label)}
                  className={`font-body text-[13px] font-semibold flex items-center gap-1 py-1.5 px-3 rounded-lg transition-all border-none cursor-pointer relative ${
                    isGroupActive
                      ? 'font-bold'
                      : 'text-[var(--text-primary)] opacity-65 hover:opacity-100'
                  }`}
                  style={isGroupActive ? {background:'linear-gradient(135deg,rgba(217,119,6,0.12),rgba(249,115,22,0.08))',color:'var(--empire-gold)'} : {background:'transparent'}}
                  aria-expanded={isOpen}
                >
                  {isGroupActive && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{background:'linear-gradient(90deg,var(--empire-gold),#f97316)'}}/>}
                  <span className="material-symbols-outlined text-[15px] shrink-0" style={{fontVariationSettings:"'FILL' " + (isGroupActive?'1':'0')}}>{group.icon}</span>
                  <span>{group.label}</span>
                  <span className={`material-symbols-outlined text-[12px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {/* Premium Mega Dropdown */}
                {isOpen && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 rounded-2xl z-50 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2"
                    style={{
                      width: group.links.length > 4 ? '520px' : '280px',
                      background: 'var(--dropdown-bg)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid var(--dropdown-border)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    {/* Dropdown header */}
                    <div className="px-4 py-3 flex items-center gap-2 border-b" style={{borderColor:'var(--dropdown-border)',background:'linear-gradient(135deg,rgba(217,119,6,0.06),rgba(249,115,22,0.03))'}}>
                      <span className="material-symbols-outlined text-sm" style={{color:'var(--empire-gold)',fontVariationSettings:"'FILL' 1"}}>{group.icon}</span>
                      <span className="font-display text-[10px] font-black uppercase tracking-widest" style={{color:'var(--empire-gold)'}}>{group.label}</span>
                    </div>
                    
                    <div className={`p-3.5 ${group.links.length > 4 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2'}`}>
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
                              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold no-underline transition-all hover:bg-[rgba(var(--bg-border-rgb,0,0,0),0.03)] cursor-pointer"
                              style={{color:'var(--text-primary)',opacity:0.4}}
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.06)'}}>
                                <span className="material-symbols-outlined text-sm">lock</span>
                              </div>
                              <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                                <span className="truncate font-bold text-[11px] leading-tight">{link.label}</span>
                                {link.description && <span className="text-[9px] text-[var(--text-secondary)] opacity-60 truncate font-normal leading-normal">{link.description}</span>}
                              </div>
                            </Link>
                          );
                        }

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            id={link.id}
                            onClick={() => setOpenDropdown(null)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl no-underline transition-all hover:bg-[rgba(var(--bg-border-rgb,0,0,0),0.04)] cursor-pointer"
                            style={isLinkActive ? {
                              background:'linear-gradient(135deg,rgba(217,119,6,0.12),rgba(249,115,22,0.07))',
                              color:'var(--empire-gold)'
                            } : {color:'var(--text-primary)',opacity:0.9}}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all" style={isLinkActive ? {background:'linear-gradient(135deg,rgba(217,119,6,0.2),rgba(249,115,22,0.12))'} : {background:'rgba(var(--bg-border-rgb,0,0,0),0.05)'}}>
                              <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' " + (isLinkActive?'1':'0')}}>{link.icon}</span>
                            </div>
                            <div className="flex-grow min-w-0 flex flex-col gap-0.5 text-left">
                              <span className="truncate font-bold text-[11px] leading-tight">{link.label}</span>
                              {link.description && <span className="text-[9px] text-[var(--text-secondary)] opacity-60 truncate font-normal leading-normal">{link.description}</span>}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}


        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Desktop Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            type="button"
            id="nav-search-trigger"
            className="hidden md:flex items-center gap-2 h-8 px-3 rounded-xl border border-[var(--bg-border)]/20 cursor-pointer transition-all hover:bg-[rgba(var(--bg-border-rgb,0,0,0),0.04)] text-xs text-[var(--text-primary)] opacity-70 hover:opacity-100 font-semibold"
            style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.03)' }}
          >
            <span className="material-symbols-outlined text-[15px]">search</span>
            <span>Search...</span>
            <span className="ml-1 font-mono text-[9px] opacity-55 border rounded px-1" style={{ borderColor: 'currentColor' }}>Cmd+K</span>
          </button>

          {/* Mobile Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            type="button"
            id="nav-search-trigger-mobile"
            className="md:hidden h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)', color: 'var(--text-primary)', opacity: 0.7 }}
            aria-label="Search"
          >
            <span className="material-symbols-outlined text-[17px]">search</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            id="nav-theme-toggle"
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.06)',color:'var(--text-primary)',opacity:0.65}}
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-[17px]">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {isUserLoggedIn ? (
            <>
              {mounted && userRole === 'user' && (
                <Link
                  href="/cats/new"
                  id="nav-log-cat"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold no-underline transition-all hover:scale-105 active:scale-95 text-white shadow-md"
                  style={{background:'linear-gradient(135deg,var(--empire-gold),#f97316)',boxShadow:'0 4px 14px rgba(217,119,6,0.35)'}}
                >
                  <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' 1"}}>add_location_alt</span>{" "}Log Sighting
                </Link>
              )}

              {/* Notification Bell */}
              <div 
                className="relative" 
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  type="button"
                  id="nav-notifications-toggle"
                  className="h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer relative"
                  style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.06)',color:'var(--text-primary)',opacity:0.7}}
                  aria-label="Notifications"
                >
                  <span className="material-symbols-outlined text-[17px]" style={{fontVariationSettings:unreadCount>0?"'FILL' 1":"'FILL' 0"}}>notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full text-white text-[8px] font-black flex items-center justify-center shadow-lg animate-pulse" style={{background:'linear-gradient(135deg,#ef4444,#dc2626)',fontSize:'7px',padding:'2px 3px'}}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div
                    className="absolute right-0 mt-2.5 w-80 rounded-2xl z-50 overflow-hidden flex flex-col max-h-[380px]"
                    style={{
                      background: 'var(--dropdown-bg)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid var(--dropdown-border)',
                      boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom:'1px solid var(--dropdown-border)',background:'linear-gradient(135deg,rgba(217,119,6,0.06),rgba(249,115,22,0.03))'}}>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm" style={{color:'var(--empire-gold)',fontVariationSettings:"'FILL' 1"}}>notifications</span>
                        <span className="font-display text-xs font-black" style={{color:'var(--text-primary)'}}>Notifications</span>
                        {unreadCount > 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'rgba(217,119,6,0.12)',color:'var(--empire-gold)'}}>{unreadCount} new</span>}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="font-body text-[10px] font-bold bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity"
                          style={{color:'var(--empire-gold)'}}
                          type="button"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-[var(--bg-border)]/30 max-h-[270px]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-3xl" style={{color:'var(--text-primary)',opacity:0.2}}>notifications_off</span>
                          <span className="text-xs font-body" style={{color:'var(--text-primary)',opacity:0.4}}>No notifications yet</span>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleNotifClick(n);
                              }
                            }}
                            onClick={() => handleNotifClick(n)}
                            className="p-3 text-left cursor-pointer flex gap-3 items-start transition-all"
                            style={!n.is_read ? {background:'rgba(217,119,6,0.04)'} : {}}
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:n.type==='private_message'?'rgba(217,119,6,0.1)':'rgba(var(--life-teal-rgb,14,165,233),0.1)'}}>
                              <span className="material-symbols-outlined text-sm" style={{color:n.type==='private_message'?'var(--empire-gold)':'var(--life-teal)',fontVariationSettings:"'FILL' 1"}}>
                                {n.type === 'private_message' ? 'mail' : 'info'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-body text-[11px] font-bold flex justify-between items-center gap-1" style={{color:'var(--text-primary)'}}>
                                <span className="truncate">{n.title}</span>
                                <span className="font-body text-[9px] font-normal flex-shrink-0" style={{color:'var(--text-primary)',opacity:0.3}}>
                                  {new Date(n.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-body text-[10px] mt-0.5 leading-normal line-clamp-2" style={{color:'var(--text-primary)',opacity:0.6}}>
                                {n.message}
                              </p>
                              {n.target_url && (
                                <Link
                                  href={n.target_url}
                                  className="inline-flex items-center gap-0.5 text-[9px] font-bold mt-1 no-underline hover:underline"
                                  style={{color:'var(--empire-gold)'}}
                                  onClick={(e) => { e.stopPropagation(); handleNotifClick(n); }}
                                >
                                  View details <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                </Link>
                              )}
                            </div>
                            {!n.is_read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{background:'var(--empire-gold)'}}/>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <Link
                href="/profile"
                id="nav-profile-avatar"
                title={`View Profile — ${userDisplayName}`}
                className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all hover:scale-110"
                style={{boxShadow:'0 0 0 2px rgba(217,119,6,0.3), 0 0 0 4px rgba(217,119,6,0.08)'}}
              >
                {getSafeImageSrc(avatarSrc) ? (
                  <img src={getSafeImageSrc(avatarSrc)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-extrabold text-xs text-white" style={{background:'linear-gradient(135deg,var(--empire-gold),#f97316)'}}>
                    {userDisplayName[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </Link>

              <button
                onClick={handleSignOut}
                type="button"
                id="nav-sign-out"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:opacity-80"
                style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.06)',color:'var(--text-primary)',opacity:0.6}}
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span className="hidden lg:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                id="nav-login"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold no-underline transition-all hover:opacity-80"
                style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.07)',color:'var(--text-primary)'}}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                id="nav-signup"
                className="px-4 py-1.5 rounded-xl text-xs font-extrabold no-underline transition-all hover:scale-105 active:scale-95 text-white shadow-md"
                style={{background:'linear-gradient(135deg,var(--empire-gold),#f97316)',boxShadow:'0 4px 14px rgba(217,119,6,0.35)'}}
              >
                Join Free
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            type="button"
            id="nav-mobile-toggle"
            className="lg:hidden h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.06)',color:'var(--text-primary)',opacity:0.7}}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-lg">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            role="button"
            aria-label="Close menu"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsMobileMenuOpen(false);
              }
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="relative w-72 max-w-[85vw] h-full flex flex-col shadow-2xl z-50"
            style={{
              background: 'var(--dropdown-bg)',
              backdropFilter: 'blur(20px)',
              borderLeft: '1px solid var(--dropdown-border)'
            }}
          >
            {/* Mobile drawer header */}
            <div className="px-5 pt-5 pb-4 flex items-center justify-between" style={{borderBottom:'1px solid var(--dropdown-border)'}}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl overflow-hidden shadow-sm" style={{background:'linear-gradient(135deg,#fbbf24,#f97316)'}}>
                  <img src="/pet-logo.png" alt="MeowNet" className="w-full h-full object-cover" />
                </div>
                <span className="font-display text-sm font-black" style={{background:'linear-gradient(135deg,var(--empire-gold),#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                  {logoText}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.06)',color:'var(--text-primary)',opacity:0.6}}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto p-4">
              {groupsToRender.map((group) => {
                const isExpanded = !!mobileExpandedGroups[group.label];
                const isGroupActive = group.links.some(l => pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href)));

                return (
                  <div key={group.label} className="flex flex-col rounded-xl overflow-hidden" style={{border:'1px solid rgba(var(--bg-border-rgb,0,0,0),0.07)',background:isGroupActive?'rgba(217,119,6,0.04)':'rgba(var(--bg-border-rgb,0,0,0),0.02)'}}>
                    <button
                      onClick={() => toggleMobileGroup(group.label)}
                      className="w-full flex items-center justify-between px-3.5 py-3 font-body text-xs font-bold border-none text-left cursor-pointer transition-all"
                      style={{color:isGroupActive?'var(--empire-gold)':'var(--text-primary)',opacity:isGroupActive?1:0.75}}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:isGroupActive?'rgba(217,119,6,0.12)':'rgba(var(--bg-border-rgb,0,0,0),0.06)'}}>
                          <span className="material-symbols-outlined text-[15px]" style={{fontVariationSettings:"'FILL' " + (isGroupActive?'1':'0'),color:isGroupActive?'var(--empire-gold)':'inherit'}}>{group.icon}</span>
                        </div>
                        <span>{group.label}</span>
                      </div>
                      <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isExpanded?'rotate-180':''}`} style={{opacity:0.5}}>expand_more</span>
                    </button>

                    {isExpanded && (
                      <div className="flex flex-col gap-0.5 px-2 pb-2">
                        {group.links.map((link) => {
                          const active = isUserLoggedIn && (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)));
                          const isGuestAllowed = ['/map', '/cats', '/events', '/colonies', '/stories'].includes(link.href);

                          if (!isUserLoggedIn && !isGuestAllowed) {
                            return (
                              <div key={link.href} className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs select-none" style={{color:'var(--text-primary)',opacity:0.3}}>
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.05)'}}><span className="material-symbols-outlined text-sm">lock</span></div>
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
                              className="flex items-center gap-3 px-3 py-2 rounded-xl font-body text-xs font-semibold no-underline transition-all"
                              style={active ? {background:'linear-gradient(135deg,rgba(217,119,6,0.1),rgba(249,115,22,0.06))',color:'var(--empire-gold)'} : {color:'var(--text-primary)',opacity:0.7}}
                            >
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={active?{background:'rgba(217,119,6,0.15)'}:{background:'rgba(var(--bg-border-rgb,0,0,0),0.05)'}}>
                                <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' " + (active?'1':'0')}}>{link.icon}</span>
                              </div>
                              <span>{link.label}</span>
                              {active && <span className="material-symbols-outlined text-[11px] ml-auto" style={{color:'var(--empire-gold)'}}>arrow_forward_ios</span>}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}


            </nav>

            {isUserLoggedIn && (
              <div className="px-4 pb-5 pt-4 flex flex-col gap-3" style={{borderTop:'1px solid rgba(var(--bg-border-rgb,0,0,0),0.08)'}}>
                {/* User identity card */}
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl no-underline transition-all" style={{background:'linear-gradient(135deg,rgba(217,119,6,0.06),rgba(249,115,22,0.03))',border:'1px solid rgba(217,119,6,0.1)'}}>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{boxShadow:'0 0 0 2px rgba(217,119,6,0.3)',background:'linear-gradient(135deg,var(--empire-gold),#f97316)'}}>
                    {getSafeImageSrc(avatarSrc) ? (
                      <img src={getSafeImageSrc(avatarSrc)} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-extrabold text-sm text-white">
                        {userDisplayName[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xs font-black truncate" style={{color:'var(--text-primary)'}}>{userDisplayName}</div>
                    <div className="text-[10px] capitalize font-semibold" style={{color:'var(--empire-gold)',opacity:0.8}}>{userRole} · View Profile</div>
                  </div>
                  <span className="material-symbols-outlined text-sm" style={{color:'var(--empire-gold)',opacity:0.5}}>arrow_forward_ios</span>
                </Link>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }}
                  type="button"
                  id="mobile-sign-out"
                  className="w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
                  style={{background:'rgba(var(--bg-border-rgb,0,0,0),0.06)',color:'var(--text-primary)',opacity:0.65}}
                >
                  <span className="material-symbols-outlined text-[15px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Command Search Modal Overlay */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl flex flex-col overflow-hidden max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--dropdown-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--dropdown-border)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--dropdown-border)', background: 'linear-gradient(135deg,rgba(217,119,6,0.04),rgba(249,115,22,0.02))' }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--empire-gold)' }}>search</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search commands & pages..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchSelectedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 bg-transparent border-none text-[13px] font-semibold font-body focus:outline-none placeholder-[var(--text-primary)]/40 text-[var(--text-primary)]"
                style={{ caretColor: 'var(--empire-gold)' }}
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="bg-transparent border-none cursor-pointer flex items-center justify-center p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Close search"
              >
                <span className="material-symbols-outlined text-sm" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>close</span>
              </button>
            </div>

            {/* Results area */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[350px]">
              {filteredSearchItems.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--text-primary)', opacity: 0.2 }}>search_off</span>
                  <span className="text-xs font-semibold font-body" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>No matches found for "{searchQuery}"</span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--empire-gold)] opacity-70">
                    {searchQuery.trim() ? 'Search Results' : 'Suggested Pages'}
                  </div>
                  {filteredSearchItems.map((item, idx) => {
                    const isSelected = idx === searchSelectedIndex;
                    const isGuestAllowed = ['/map', '/cats', '/events', '/colonies', '/stories'].includes(item.href);
                    const isLocked = !isUserLoggedIn && !isGuestAllowed;

                    return (
                      <div
                        key={item.href}
                        onClick={() => {
                          setIsSearchOpen(false);
                          if (isLocked) {
                            router.push('/auth/login');
                          } else {
                            router.push(item.href);
                          }
                        }}
                        onMouseEnter={() => setSearchSelectedIndex(idx)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                        style={isSelected ? {
                          background: 'linear-gradient(135deg,rgba(217,119,6,0.12),rgba(249,115,22,0.07))',
                          color: 'var(--empire-gold)'
                        } : { color: 'var(--text-primary)', opacity: 0.85 }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={isSelected ? { background: 'linear-gradient(135deg,rgba(217,119,6,0.2),rgba(249,115,22,0.12))' } : { background: 'rgba(var(--bg-border-rgb,0,0,0),0.05)' }}>
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>
                            {isLocked ? 'lock' : item.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-semibold">{item.title}</div>
                          <div className="text-[9px] opacity-50 font-normal mt-0.5">{item.category}</div>
                        </div>
                        {isLocked && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded" style={{ background: 'rgba(217,119,6,0.1)', color: 'var(--empire-gold)' }}>Sign In</span>
                        )}
                        {isSelected && !isLocked && (
                          <span className="material-symbols-outlined text-xs ml-auto" style={{ color: 'var(--empire-gold)' }}>keyboard_return</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="px-4 py-2 bg-black/5 dark:bg-white/5 border-t flex items-center justify-between text-[9px] font-medium" style={{ borderColor: 'var(--dropdown-border)', color: 'var(--text-primary)', opacity: 0.5 }}>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 bg-black/10 dark:bg-white/10 px-1 rounded">↑↓</span>
                <span>to navigate</span>
                <span className="flex items-center gap-0.5 bg-black/10 dark:bg-white/10 px-1 rounded ml-1.5">Enter</span>
                <span>to select</span>
              </div>
              <div>Press Esc to close</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
