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
  badge?: string;
  section?: string; // visual section divider label inside dropdown
}

interface NavGroup {
  label: string;
  shortLabel?: string; // used in navbar bar — must be short
  icon: string;
  links: NavLink[];
  accentColor?: string;
  description?: string; // shown in dropdown header
}

// ─── ROLE CONFIG ────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, {
  label: string;
  badgeText: string;
  badgeStyle: React.CSSProperties;
  logoSuffix: string;
}> = {
  admin: {
    label: 'Administrator',
    badgeText: 'ADMIN',
    badgeStyle: { background: 'linear-gradient(135deg,#b91c1c,#dc2626)', color: '#fff' },
    logoSuffix: 'Admin Console',
  },
  moderator: {
    label: 'Moderator',
    badgeText: 'MOD',
    badgeStyle: { background: 'linear-gradient(135deg,#b45309,#d97706)', color: '#fff' },
    logoSuffix: 'Staff',
  },
  'sub-moderator': {
    label: 'Sub-Moderator',
    badgeText: 'MOD',
    badgeStyle: { background: 'linear-gradient(135deg,#b45309,#d97706)', color: '#fff' },
    logoSuffix: 'Staff',
  },
  user: {
    label: 'Volunteer',
    badgeText: '',
    badgeStyle: {},
    logoSuffix: '',
  },
};

// ─── NAV GROUPS ─────────────────────────────────────────────────────────────
// 4 clean semantic groups. Labels kept to ONE short word each so the bar
// never wraps. Staff group is appended at runtime based on DB role.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Rescue',
    icon: 'explore',
    description: 'Field operations & cat welfare',
    links: [
      {
        href: '/map',
        label: 'Live Map',
        id: 'nav-map',
        icon: 'explore',
        description: 'Real-time stray cat sighting map',
        section: 'Find & Track',
      },
      {
        href: '/cats',
        label: 'Cat Profiles',
        id: 'nav-cats',
        icon: 'pets',
        description: 'Browse, search & log stray cats',
      },
      {
        href: '/colonies',
        label: 'Colonies',
        id: 'nav-colonies',
        icon: 'home_work',
        description: 'Feed routes & colony status',
      },
      {
        href: '/events',
        label: 'TNR Events',
        id: 'nav-events',
        icon: 'event',
        description: 'Join trap-neuter-return campaigns',
        section: 'Organize',
      },
      {
        href: '/reports',
        label: 'Field Reports',
        id: 'nav-reports',
        icon: 'bar_chart',
        description: 'Activity logs & volunteer stats',
      },
      {
        href: '/safety',
        label: 'Safety Guides',
        id: 'nav-safety',
        icon: 'health_and_safety',
        description: 'Welfare protocols & rescue guides',
        section: 'Resources',
      },
      {
        href: '/weather',
        label: 'Weather Watch',
        id: 'nav-weather',
        icon: 'partly_cloudy_day',
        description: 'Outdoor safety alerts & WMO data',
      },
    ],
  },
  {
    label: 'Impact',
    icon: 'volunteer_activism',
    description: 'Coordination, supply & analytics',
    links: [
      {
        href: '/volunteers',
        label: 'Volunteer Hub',
        id: 'nav-volunteers',
        icon: 'diversity_3',
        description: 'Schedules, skills & mentoring',
        section: 'People',
      },
      {
        href: '/chapters',
        label: 'Chapters',
        id: 'nav-chapters',
        icon: 'pin_drop',
        description: 'Regional groups & territories',
      },
      {
        href: '/emergency',
        label: 'Emergency',
        id: 'nav-emergency',
        icon: 'emergency',
        description: 'Crisis dispatch & incident map',
        badge: 'LIVE',
        section: 'Respond',
      },
      {
        href: '/supplies',
        label: 'Supplies',
        id: 'nav-supplies',
        icon: 'inventory_2',
        description: 'Inventory levels & stock requests',
      },
      {
        href: '/analytics',
        label: 'Analytics',
        id: 'nav-analytics',
        icon: 'monitoring',
        description: 'Welfare trends & population data',
        section: 'Insights',
      },
    ],
  },
  {
    label: 'Community',
    icon: 'groups',
    description: 'Chat, learn, play & earn points',
    links: [
      {
        href: '/community',
        label: 'Forum & Chat',
        id: 'nav-community',
        icon: 'forum',
        description: 'Channels, DMs & GIF search',
        section: 'Connect',
      },
      {
        href: '/stories',
        label: 'Success Stories',
        id: 'nav-stories',
        icon: 'auto_stories',
        description: 'Verified rescue diaries',
      },
      {
        href: '/education',
        label: 'Academy',
        id: 'nav-education',
        icon: 'school',
        description: 'Courses, quizzes & certificates',
        section: 'Learn',
      },
      {
        href: '/empire',
        label: 'Empire',
        id: 'nav-empire-hub',
        icon: 'military_tech',
        description: 'Leaderboards, ranks & badges',
        section: 'Earn',
      },
      {
        href: '/empire/guilds',
        label: 'Guilds',
        id: 'nav-guilds',
        icon: 'groups_2',
        description: 'Join a regional volunteer team',
      },
      {
        href: '/empire/trivia',
        label: 'Daily Trivia',
        id: 'nav-trivia',
        icon: 'quiz',
        description: 'Answer questions, build streaks',
      },
      {
        href: '/empire/bingo',
        label: 'Stray Bingo',
        id: 'nav-bingo',
        icon: 'grid_on',
        description: 'Weekly quest boards',
      },
      {
        href: '/empire/tycoon',
        label: 'Colony Tycoon',
        id: 'nav-tycoon',
        icon: 'castle',
        description: 'Idle offline sanctuary builder',
      },
    ],
  },
  {
    label: 'Partners',
    icon: 'handshake',
    description: 'NGOs, research & announcements',
    links: [
      {
        href: '/partners',
        label: 'Partner Network',
        id: 'nav-partners',
        icon: 'business',
        description: 'Verified NGO & vet organisations',
        section: 'Collaborate',
      },
      {
        href: '/research',
        label: 'Research Portal',
        id: 'nav-research',
        icon: 'science',
        description: 'Anonymised data export requests',
      },
      {
        href: '/notices',
        label: 'Noticeboard',
        id: 'nav-notices',
        icon: 'campaign',
        description: 'Staff announcements & alerts',
        section: 'Info',
      },
    ],
  },
];

// ─── SEARCH ITEMS ────────────────────────────────────────────────────────────
interface SearchItem {
  title: string;
  href: string;
  category: string;
  icon: string;
  keywords: string[];
}

const SEARCH_ITEMS: SearchItem[] = [
  // Rescue
  { title: 'Live Map', href: '/map', category: 'Rescue', icon: 'explore', keywords: ['map', 'live', 'strays', 'gps', 'cats', 'location', 'sighting'] },
  { title: 'Cat Profiles', href: '/cats', category: 'Rescue', icon: 'pets', keywords: ['find', 'search', 'cats', 'profiles', 'browse'] },
  { title: 'Log Cat Sighting', href: '/cats/new', category: 'Rescue', icon: 'add_location_alt', keywords: ['log', 'sighting', 'report', 'add cat', 'new cat'] },
  { title: 'Colonies', href: '/colonies', category: 'Rescue', icon: 'home_work', keywords: ['colonies', 'colony', 'feed route', 'stray cats'] },
  { title: 'TNR Events', href: '/events', category: 'Rescue', icon: 'event', keywords: ['tnr', 'events', 'trap', 'neuter', 'return', 'campaigns'] },
  { title: 'Field Reports', href: '/reports', category: 'Rescue', icon: 'bar_chart', keywords: ['reports', 'field', 'logs', 'stats'] },
  { title: 'Safety Guides', href: '/safety', category: 'Rescue', icon: 'health_and_safety', keywords: ['safety', 'guides', 'welfare', 'rescue'] },
  { title: 'Weather Watch', href: '/weather', category: 'Rescue', icon: 'partly_cloudy_day', keywords: ['weather', 'forecast', 'temperature', 'outdoor', 'safety'] },
  // Impact
  { title: 'Volunteer Hub', href: '/volunteers', category: 'Impact', icon: 'diversity_3', keywords: ['volunteers', 'availability', 'skills', 'tasks', 'mentor'] },
  { title: 'Chapters', href: '/chapters', category: 'Impact', icon: 'pin_drop', keywords: ['chapters', 'regions', 'territories', 'local groups'] },
  { title: 'Emergency', href: '/emergency', category: 'Impact', icon: 'emergency', keywords: ['emergency', 'crisis', 'incidents', 'dispatch', 'alerts'] },
  { title: 'Supplies', href: '/supplies', category: 'Impact', icon: 'inventory_2', keywords: ['supplies', 'inventory', 'stock', 'requests'] },
  { title: 'Analytics', href: '/analytics', category: 'Impact', icon: 'monitoring', keywords: ['analytics', 'impact', 'welfare', 'trends', 'population', 'data'] },
  // Community
  { title: 'Forum & Chat', href: '/community', category: 'Community', icon: 'forum', keywords: ['forum', 'community', 'chat', 'messages', 'dm', 'discussion'] },
  { title: 'Success Stories', href: '/stories', category: 'Community', icon: 'auto_stories', keywords: ['stories', 'success', 'adoption', 'rescues', 'impact'] },
  { title: 'Academy', href: '/education', category: 'Community', icon: 'school', keywords: ['education', 'academy', 'courses', 'learn', 'training', 'quizzes'] },
  { title: 'Empire', href: '/empire', category: 'Community', icon: 'military_tech', keywords: ['empire', 'points', 'leaderboard', 'badges', 'rewards', 'rank'] },
  { title: 'Guilds', href: '/empire/guilds', category: 'Community', icon: 'groups_2', keywords: ['guilds', 'guild', 'teams', 'groups', 'regions'] },
  { title: 'Daily Trivia', href: '/empire/trivia', category: 'Community', icon: 'quiz', keywords: ['trivia', 'quiz', 'daily', 'streak', 'points'] },
  { title: 'Stray Bingo', href: '/empire/bingo', category: 'Community', icon: 'grid_on', keywords: ['bingo', 'quests', 'weekly', 'challenges'] },
  { title: 'Colony Tycoon', href: '/empire/tycoon', category: 'Community', icon: 'castle', keywords: ['tycoon', 'game', 'idle', 'empire', 'sanctuary'] },
  // Partners
  { title: 'Partner Network', href: '/partners', category: 'Partners', icon: 'business', keywords: ['partners', 'ngo', 'vet', 'sponsors', 'organisations'] },
  { title: 'Research Portal', href: '/research', category: 'Partners', icon: 'science', keywords: ['research', 'data', 'export', 'academic', 'population'] },
  { title: 'Noticeboard', href: '/notices', category: 'Partners', icon: 'campaign', keywords: ['notices', 'announcements', 'broadcasts'] },
  // My Space
  { title: 'My Profile', href: '/profile', category: 'My Space', icon: 'account_circle', keywords: ['profile', 'me', 'settings', 'account', 'gdpr'] },
  { title: 'Care Center', href: '/profile/care-center', category: 'My Space', icon: 'favorite', keywords: ['care', 'center', 'private', 'encrypted', 'vitals', 'meds'] },
  { title: 'AI Copilot', href: '/personal-helper', category: 'My Space', icon: 'smart_toy', keywords: ['helper', 'ai', 'gemini', 'chat', 'assistant', 'copilot'] },
  { title: 'Certificates', href: '/profile/certificate', category: 'My Space', icon: 'workspace_premium', keywords: ['certificates', 'verification', 'volunteer proof'] },
  { title: 'Raise a Query', href: '/support', category: 'My Space', icon: 'support_agent', keywords: ['support', 'query', 'help', 'ticket', 'escalate'] },
  // Staff only — filtered by role
  { title: 'Admin Dashboard', href: '/admin', category: 'Admin', icon: 'admin_panel_settings', keywords: ['admin', 'dashboard', 'settings', 'backend', 'roles', 'system'] },
  { title: 'Moderator Dashboard', href: '/moderator', category: 'Staff', icon: 'shield', keywords: ['moderator', 'queue', 'tickets', 'queries', 'support', 'incidents'] },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const GUEST_ALLOWED = ['/map', '/cats', '/events', '/colonies', '/stories'];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<string>('light');
  const [userRole, setUserRole] = useState<string>('user');
  const [dbAvatarUrl, setDbAvatarUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({});

  const [notifications, setNotifications] = useState<unknown[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [supabaseUser, setSupabaseUser] = useState<{ id?: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isUserLoggedIn = isSignedIn || !!supabaseUser;

  // ── Hydration ──────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setTheme(localStorage.getItem('theme') || 'light');
    setUserRole(localStorage.getItem('cached_role') || 'user');
    setDbAvatarUrl(localStorage.getItem('cached_avatar'));
  }, []);

  // ── Global Cmd+K ──────────────────────────────────────────────────────
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
      setTimeout(() => { searchInputRef.current?.focus(); }, 50);
      setSearchQuery('');
      setSearchSelectedIndex(0);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, mounted]);

  // ── Supabase Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    localStorage.removeItem('cached_avatar');
    localStorage.removeItem('cached_role');
    localStorage.removeItem('meownet_vault_token');
    localStorage.removeItem('meownet_vault_salt');
    localStorage.removeItem('meownet_vault_key');
    const supabase = createClient();
    await supabase.auth.signOut();
    if (isSignedIn) {
      signOut({ redirectUrl: '/' });
    } else {
      window.location.href = '/';
    }
  };

  // ── Notifications ─────────────────────────────────────────────────────
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications' }, (payload: { new: unknown }) => {
        setNotifications((prev) => [payload.new, ...(prev as unknown[])].slice(0, 50));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_notifications' }, (payload: { new: { id: string } }) => {
        setNotifications((prev) => (prev as Array<{ id: string }>).map(n => n.id === payload.new.id ? payload.new : n));
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [isUserLoggedIn]);

  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClose = () => setIsNotifOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isNotifOpen]);

  const unreadCount = (notifications as Array<{ is_read: boolean }>).filter(n => !n.is_read).length;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { markAllNotificationsAsRead } = await import('@/lib/actions/community');
      await markAllNotificationsAsRead();
      setNotifications((prev) => (prev as Array<{ is_read: boolean }>).map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  const handleNotifClick = async (notif: { id: string; is_read: boolean }) => {
    try {
      const { markNotificationAsRead } = await import('@/lib/actions/community');
      await markNotificationAsRead(notif.id);
      setNotifications((prev) => (prev as Array<{ id: string }>).map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
    setIsNotifOpen(false);
  };

  // ── Profile Fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isUserLoggedIn) {
      setDbAvatarUrl(null);
      setUserRole('user');
      setUserDisplayName('');
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

        setUserDisplayName(data.display_name || '');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoggedIn, supabaseUser?.id, pathname]);

  // ── Click-outside dropdown ────────────────────────────────────────────
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
      setDbAvatarUrl(localStorage.getItem('cached_avatar'));
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
    setMobileExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // ── Role Derived ──────────────────────────────────────────────────────
  const isAdmin = mounted && userRole === 'admin';
  const isMod = mounted && (userRole === 'moderator' || userRole === 'sub-moderator');
  const isStaff = isAdmin || isMod;
  const roleCfg = ROLE_CONFIG[userRole] ?? ROLE_CONFIG.user;

  // ── Staff Nav Group ───────────────────────────────────────────────────
  const staffLinks: NavLink[] = [];
  if (isAdmin) {
    staffLinks.push(
      { href: '/admin', label: 'Dashboard', id: 'nav-admin', icon: 'admin_panel_settings', description: 'System settings, RBAC & audit logs', section: 'Admin' },
      { href: '/admin/analytics', label: 'Platform Analytics', id: 'nav-admin-analytics', icon: 'bar_chart_4_bars', description: 'Deep metrics, growth & reports' },
      { href: '/admin/volunteers', label: 'Manage Volunteers', id: 'nav-admin-volunteers', icon: 'manage_accounts', description: 'VMS oversight & capacity planning' },
      { href: '/admin/chapters', label: 'Manage Chapters', id: 'nav-admin-chapters', icon: 'location_city', description: 'Territory creation & admin' },
    );
  }
  if (isStaff) {
    staffLinks.push(
      { href: '/moderator', label: 'Mod Dashboard', id: 'nav-moderator', icon: 'shield', description: 'Query queue, escalations & triage', section: isAdmin ? 'Moderation' : undefined },
    );
  }

  const staffGroup: NavGroup | null = staffLinks.length > 0 ? {
    label: isAdmin ? 'Admin' : 'Staff',
    icon: isAdmin ? 'admin_panel_settings' : 'shield',
    description: isAdmin ? 'Admin-only controls' : 'Staff tools',
    accentColor: isAdmin ? '#dc2626' : '#d97706',
    links: staffLinks,
  } : null;

  // ── My Space group (always appended last) ─────────────────────────────
  const mySpaceGroup: NavGroup = {
    label: 'Me',
    icon: 'person',
    description: 'Your profile & private tools',
    links: [
      { href: '/profile', label: 'My Profile', id: 'nav-profile-link', icon: 'account_circle', description: 'Settings, avatar & GDPR controls' },
      { href: '/profile/care-center', label: 'Care Center', id: 'nav-care-center', icon: 'favorite', description: 'Encrypted private cat care vault' },
      { href: '/personal-helper', label: 'AI Copilot', id: 'nav-personal-helper', icon: 'smart_toy', description: 'Multi-model AI action assistant' },
      { href: '/profile/certificate', label: 'Certificates', id: 'nav-certificates', icon: 'workspace_premium', description: 'Cryptographic volunteer proofs' },
      { href: '/support', label: 'Get Help', id: 'nav-support', icon: 'support_agent', description: 'Raise a query to the mod team' },
    ],
  };

  // Groups for desktop nav (no "Me" — that's the avatar menu)
  const desktopGroups = [...NAV_GROUPS, ...(staffGroup ? [staffGroup] : [])];

  // ── Filtered Search ───────────────────────────────────────────────────
  const filteredSearchItems = SEARCH_ITEMS.filter((item) => {
    if (item.href === '/admin' && userRole !== 'admin') return false;
    if (item.href.startsWith('/admin/') && userRole !== 'admin') return false;
    if (item.href === '/moderator' && !isStaff) return false;

    if (!searchQuery.trim()) {
      return ['Live Map', 'Cat Profiles', 'Care Center', 'Colony Tycoon', 'Daily Trivia'].includes(item.title);
    }

    const q = searchQuery.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => Math.min(prev + 1, filteredSearchItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredSearchItems[searchSelectedIndex];
      if (item) {
        setIsSearchOpen(false);
        router.push(!isUserLoggedIn && !GUEST_ALLOWED.includes(item.href) ? '/auth/login' : item.href);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
    }
  };

  const avatarSrc = dbAvatarUrl || user?.imageUrl;
  const displayName = userDisplayName || user?.firstName || '';
  const avatarInitial = displayName[0]?.toUpperCase() || 'U';

  // ── Avatar ring color ─────────────────────────────────────────────────
  const avatarRing = isAdmin
    ? '0 0 0 2px #dc2626, 0 0 0 4px rgba(220,38,38,0.18)'
    : isMod
      ? '0 0 0 2px #d97706, 0 0 0 4px rgba(217,119,6,0.18)'
      : '0 0 0 2px rgba(217,119,6,0.4), 0 0 0 4px rgba(217,119,6,0.10)';

  const avatarBg = isAdmin
    ? 'linear-gradient(135deg,#ef4444,#b91c1c)'
    : 'linear-gradient(135deg,#f59e0b,#f97316)';

  return (
    <header
      suppressHydrationWarning
      className="sticky top-0 z-[9999] w-full h-14 flex items-center"
      style={{
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--navbar-border)',
        boxShadow: '0 1px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="flex items-center justify-between w-full max-w-screen-xl mx-auto px-4 xl:px-8 gap-2"
        ref={dropdownRef}
      >

        {/* ── Logo ──────────────────────────────────────────────────── */}
        <Link
          href="/"
          id="nav-logo"
          className="flex items-center gap-2 shrink-0 no-underline group"
        >
          <div
            className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow transition-transform duration-200 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <img src="/pet-logo.png" alt="MeowNet" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="font-display text-[15px] font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              MeowNet
            </span>
            {mounted && roleCfg.logoSuffix && (
              <span
                className="text-[8px] font-bold uppercase tracking-widest leading-none mt-0.5"
                style={{ color: isAdmin ? '#dc2626' : '#d97706' }}
              >
                {roleCfg.logoSuffix}
              </span>
            )}
          </div>
        </Link>

        {/* ── Desktop Nav ───────────────────────────────────────────── */}
        <nav
          className="hidden lg:flex items-center gap-0.5 flex-1 justify-center"
          aria-label="Main navigation"
        >
          {desktopGroups.map((group) => {
            const accent = group.accentColor || 'var(--empire-gold)';
            const isOpen = openDropdown === group.label;
            const isGroupActive = group.links.some(l => isActiveLink(pathname, l.href));
            const isStaffGroup = !!group.accentColor;

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(isOpen ? null : group.label)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all duration-150 cursor-pointer border-none relative whitespace-nowrap"
                  style={
                    isGroupActive
                      ? { background: `${accent}18`, color: accent }
                      : isStaffGroup
                        ? { background: `${accent}12`, color: accent }
                        : { background: 'transparent', color: 'var(--text-primary)', opacity: 0.65 }
                  }
                >
                  {/* Active underline dot */}
                  {isGroupActive && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                      style={{ background: `linear-gradient(90deg,${accent},#f97316)` }}
                    />
                  )}
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{
                      fontVariationSettings: `'FILL' ${isGroupActive || isStaffGroup ? 1 : 0}`,
                      color: isGroupActive || isStaffGroup ? accent : undefined,
                    }}
                  >
                    {group.icon}
                  </span>
                  <span>{group.label}</span>
                  <span
                    className={`material-symbols-outlined text-[11px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ opacity: 0.6 }}
                  >
                    expand_more
                  </span>
                </button>

                {/* ── Dropdown ──────────────────────────────────── */}
                {isOpen && (
                  <DropdownMenu
                    group={group}
                    accent={accent}
                    isStaffGroup={isStaffGroup}
                    isAdmin={isAdmin}
                    pathname={pathname}
                    isUserLoggedIn={isUserLoggedIn}
                    onClose={() => setOpenDropdown(null)}
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Right Controls ────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Search button */}
          <button
            type="button"
            id="nav-search-trigger"
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-lg border cursor-pointer transition-all text-[11.5px] font-semibold hover:opacity-100"
            style={{
              background: 'rgba(var(--bg-border-rgb,0,0,0),0.04)',
              borderColor: 'var(--navbar-border)',
              color: 'var(--text-primary)',
              opacity: 0.55,
            }}
            aria-label="Open command search"
          >
            <span className="material-symbols-outlined text-[14px]">search</span>
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden xl:inline ml-0.5 font-mono text-[9px] opacity-60 border rounded px-1 py-0.5" style={{ borderColor: 'currentColor' }}>
              Ctrl K
            </kbd>
          </button>

          {/* Mobile search */}
          <button
            type="button"
            id="nav-search-mobile"
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-all"
            style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)', color: 'var(--text-primary)', opacity: 0.6 }}
            aria-label="Search"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            id="nav-theme-toggle"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-all"
            style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)', color: 'var(--text-primary)', opacity: 0.55 }}
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-[16px]">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {isUserLoggedIn ? (
            <>
              {/* Log Sighting CTA — volunteers and mods, not admins */}
              {mounted && !isAdmin && (
                <Link
                  href="/cats/new"
                  id="nav-log-cat"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-extrabold no-underline text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 3px 12px rgba(245,158,11,0.35)' }}
                >
                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_location_alt</span>
                  <span>Log Cat</span>
                </Link>
              )}

              {/* Notifications */}
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                isNotifOpen={isNotifOpen}
                setIsNotifOpen={setIsNotifOpen}
                handleMarkAllRead={handleMarkAllRead}
                handleNotifClick={handleNotifClick}
              />

              {/* Role badge */}
              {mounted && roleCfg.badgeText && (
                <span
                  className="hidden sm:inline-flex items-center text-[7.5px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase"
                  style={roleCfg.badgeStyle}
                >
                  {roleCfg.badgeText}
                </span>
              )}

              {/* Avatar → Profile */}
              <Link
                href="/profile"
                id="nav-profile-avatar"
                title={mounted ? `${roleCfg.label} — ${displayName}` : 'Profile'}
                className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all hover:scale-105"
                style={{ boxShadow: avatarRing }}
              >
                {getSafeImageSrc(avatarSrc) ? (
                  <img src={getSafeImageSrc(avatarSrc)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-extrabold text-xs text-white"
                    style={{ background: avatarBg }}
                  >
                    {avatarInitial}
                  </div>
                )}
              </Link>

              {/* Sign out */}
              <button
                type="button"
                id="nav-sign-out"
                onClick={handleSignOut}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-all border-none hover:opacity-80"
                style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)', color: 'var(--text-primary)', opacity: 0.5 }}
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                id="nav-login"
                className="px-3 py-1.5 rounded-xl text-[11.5px] font-semibold no-underline transition-all hover:opacity-80"
                style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.07)', color: 'var(--text-primary)' }}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                id="nav-signup"
                className="px-3.5 py-1.5 rounded-xl text-[11.5px] font-extrabold no-underline text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 3px 12px rgba(245,158,11,0.3)' }}
              >
                Join Free
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            id="nav-mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-all"
            style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.07)', color: 'var(--text-primary)', opacity: 0.6 }}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <MobileDrawer
          pathname={pathname}
          desktopGroups={desktopGroups}
          mySpaceGroup={mySpaceGroup}
          isUserLoggedIn={isUserLoggedIn}
          isAdmin={isAdmin}
          isMod={isMod}
          roleCfg={roleCfg}
          displayName={displayName}
          avatarSrc={avatarSrc}
          avatarInitial={avatarInitial}
          avatarBg={avatarBg}
          logoText="MeowNet"
          logoSuffix={mounted ? roleCfg.logoSuffix : ''}
          theme={theme}
          mobileExpandedGroups={mobileExpandedGroups}
          toggleMobileGroup={toggleMobileGroup}
          onClose={() => setIsMobileMenuOpen(false)}
          onSignOut={handleSignOut}
        />
      )}

      {/* ── Command Search ────────────────────────────────────────────── */}
      {isSearchOpen && (
        <SearchModal
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchSelectedIndex={searchSelectedIndex}
          setSearchSelectedIndex={setSearchSelectedIndex}
          filteredSearchItems={filteredSearchItems}
          isUserLoggedIn={isUserLoggedIn}
          searchInputRef={searchInputRef}
          onKeyDown={handleSearchKeyDown}
          onClose={() => setIsSearchOpen(false)}
          onSelect={(href) => {
            setIsSearchOpen(false);
            router.push(!isUserLoggedIn && !GUEST_ALLOWED.includes(href) ? '/auth/login' : href);
          }}
        />
      )}
    </header>
  );
}

// ─── DROPDOWN MENU ───────────────────────────────────────────────────────────
interface DropdownMenuProps {
  group: NavGroup;
  accent: string;
  isStaffGroup: boolean;
  isAdmin: boolean;
  pathname: string;
  isUserLoggedIn: boolean;
  onClose: () => void;
}

function DropdownMenu({ group, accent, isStaffGroup, isAdmin, pathname, isUserLoggedIn, onClose }: DropdownMenuProps) {
  // Group links by section
  const sections: { label: string | undefined; links: NavLink[] }[] = [];
  let currentSection: { label: string | undefined; links: NavLink[] } = { label: undefined, links: [] };

  group.links.forEach((link) => {
    if (link.section && link.section !== currentSection.label) {
      if (currentSection.links.length > 0) sections.push(currentSection);
      currentSection = { label: link.section, links: [link] };
    } else {
      currentSection.links.push(link);
    }
  });
  if (currentSection.links.length > 0) sections.push(currentSection);

  const wide = group.links.length > 4;

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-2xl z-50 overflow-hidden"
      style={{
        width: wide ? '480px' : '260px',
        background: 'var(--dropdown-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${isStaffGroup ? accent + '30' : 'var(--dropdown-border)'}`,
        boxShadow: `0 16px 48px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.06)`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{
          borderBottom: `1px solid ${isStaffGroup ? accent + '20' : 'var(--dropdown-border)'}`,
          background: `linear-gradient(135deg,${accent}10,${accent}04)`,
        }}
      >
        <span
          className="material-symbols-outlined text-[13px]"
          style={{ color: accent, fontVariationSettings: "'FILL' 1" }}
        >
          {group.icon}
        </span>
        <span
          className="font-display text-[9.5px] font-black uppercase tracking-widest"
          style={{ color: accent }}
        >
          {group.label}
        </span>
        {group.description && (
          <span
            className="text-[9px] font-normal hidden sm:block"
            style={{ color: 'var(--text-primary)', opacity: 0.35 }}
          >
            — {group.description}
          </span>
        )}
        {isStaffGroup && (
          <span
            className="ml-auto text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide"
            style={{ background: accent, color: '#fff' }}
          >
            {isAdmin ? 'Admin Only' : 'Staff Only'}
          </span>
        )}
      </div>

      {/* Links */}
      <div className={`p-3 ${wide ? 'grid grid-cols-2 gap-x-3 gap-y-1' : 'flex flex-col gap-1'}`}>
        {sections.map((sec, si) => (
          <div key={si} className={wide ? 'contents' : 'flex flex-col gap-1'}>
            {sec.label && !wide && (
              <div
                className="px-2 pt-2 pb-0.5 text-[8.5px] font-black uppercase tracking-widest"
                style={{ color: accent, opacity: 0.6 }}
              >
                {sec.label}
              </div>
            )}
            {sec.links.map((link) => {
              const active = isActiveLink(pathname, link.href);
              const locked = !isUserLoggedIn && !GUEST_ALLOWED.includes(link.href);

              return (
                <Link
                  key={link.href}
                  href={locked ? '/auth/login' : link.href}
                  id={link.id}
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl no-underline transition-all group/link"
                  style={
                    active
                      ? { background: `linear-gradient(135deg,${accent}18,${accent}0c)`, color: accent }
                      : { color: 'var(--text-primary)', opacity: locked ? 0.35 : 0.82 }
                  }
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={
                      active
                        ? { background: `${accent}28` }
                        : { background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)' }
                    }
                  >
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
                    >
                      {locked ? 'lock' : link.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold leading-tight truncate">
                        {link.label}
                      </span>
                      {link.badge && (
                        <span
                          className="text-[7px] font-extrabold px-1 py-0.5 rounded animate-pulse uppercase"
                          style={{ background: '#dc2626', color: '#fff' }}
                        >
                          {link.badge}
                        </span>
                      )}
                    </div>
                    {link.description && (
                      <span
                        className="text-[9px] leading-snug font-normal block mt-0.5 truncate"
                        style={{ color: 'var(--text-primary)', opacity: 0.45 }}
                      >
                        {link.description}
                      </span>
                    )}
                  </div>
                  {active && (
                    <span className="material-symbols-outlined text-[10px] shrink-0 ml-auto" style={{ color: accent }}>
                      arrow_forward_ios
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NOTIFICATION BELL ───────────────────────────────────────────────────────
interface NotificationBellProps {
  notifications: unknown[];
  unreadCount: number;
  isNotifOpen: boolean;
  setIsNotifOpen: (v: boolean) => void;
  handleMarkAllRead: (e: React.MouseEvent) => void;
  handleNotifClick: (n: { id: string; is_read: boolean }) => void;
}

type Notif = { id: string; is_read: boolean; type: string; title: string; message: string; created_at: string; target_url?: string };

function NotificationBell({ notifications, unreadCount, isNotifOpen, setIsNotifOpen, handleMarkAllRead, handleNotifClick }: NotificationBellProps) {
  return (
    <div className="relative">
      <button
        type="button"
        id="nav-notifications-toggle"
        onClick={(e) => { e.stopPropagation(); setIsNotifOpen(!isNotifOpen); }}
        className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-all relative"
        style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)', color: 'var(--text-primary)', opacity: 0.6 }}
        aria-label="Notifications"
      >
        <span
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: `'FILL' ${unreadCount > 0 ? 1 : 0}` }}
        >
          notifications
        </span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] min-h-[16px] rounded-full text-white font-black flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', fontSize: '7px', padding: '2px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isNotifOpen && (
        <div
          role="menu"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-72 rounded-2xl z-50 overflow-hidden flex flex-col"
          style={{
            background: 'var(--dropdown-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--dropdown-border)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.16)',
          }}
        >
          <div
            className="px-3.5 py-2.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--dropdown-border)' }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[13px]" style={{ color: 'var(--empire-gold)', fontVariationSettings: "'FILL' 1" }}>notifications</span>
              <span className="font-display text-[11px] font-black" style={{ color: 'var(--text-primary)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(217,119,6,0.12)', color: 'var(--empire-gold)' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold bg-transparent border-none cursor-pointer hover:opacity-70"
                style={{ color: 'var(--empire-gold)' }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-64 divide-y divide-[var(--bg-border)]/20">
            {(notifications as Notif[]).length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--text-primary)', opacity: 0.2 }}>notifications_off</span>
                <span className="text-[11px] font-body" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>No notifications yet</span>
              </div>
            ) : (
              (notifications as Notif[]).map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className="w-full text-left p-3 cursor-pointer flex gap-2.5 items-start transition-all border-none bg-transparent"
                  style={!n.is_read ? { background: 'rgba(217,119,6,0.04)' } : {}}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: n.type === 'private_message' ? 'rgba(217,119,6,0.1)' : 'rgba(14,165,233,0.1)' }}
                  >
                    <span
                      className="material-symbols-outlined text-[12px]"
                      style={{ color: n.type === 'private_message' ? 'var(--empire-gold)' : 'var(--life-teal)', fontVariationSettings: "'FILL' 1" }}
                    >
                      {n.type === 'private_message' ? 'mail' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10.5px] font-bold flex justify-between gap-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className="truncate">{n.title}</span>
                      <span className="text-[9px] font-normal shrink-0" style={{ opacity: 0.35 }}>
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      className="text-[9.5px] mt-0.5 leading-snug line-clamp-2"
                      style={{ color: 'var(--text-primary)', opacity: 0.55 }}
                    >
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--empire-gold)' }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MOBILE DRAWER ───────────────────────────────────────────────────────────
interface MobileDrawerProps {
  pathname: string;
  desktopGroups: NavGroup[];
  mySpaceGroup: NavGroup;
  isUserLoggedIn: boolean;
  isAdmin: boolean;
  isMod: boolean;
  roleCfg: typeof ROLE_CONFIG[string];
  displayName: string;
  avatarSrc: string | undefined;
  avatarInitial: string;
  avatarBg: string;
  logoText: string;
  logoSuffix: string;
  theme: string;
  mobileExpandedGroups: Record<string, boolean>;
  toggleMobileGroup: (label: string) => void;
  onClose: () => void;
  onSignOut: () => void;
}

function MobileDrawer({
  pathname, desktopGroups, mySpaceGroup, isUserLoggedIn,
  isAdmin, isMod, roleCfg, displayName, avatarSrc, avatarInitial,
  avatarBg, logoText, logoSuffix, mobileExpandedGroups,
  toggleMobileGroup, onClose, onSignOut,
}: MobileDrawerProps) {
  const allGroups = [...desktopGroups, mySpaceGroup];

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm border-none cursor-default"
        aria-label="Close menu"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="relative w-72 max-w-[88vw] h-full flex flex-col overflow-hidden"
        style={{
          background: 'var(--dropdown-bg)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--dropdown-border)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--dropdown-border)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)' }}>
              <img src="/pet-logo.png" alt="MeowNet" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-display text-sm font-black"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {logoText}
              </span>
              {logoSuffix && (
                <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: isAdmin ? '#dc2626' : '#d97706' }}>
                  {logoSuffix}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)', color: 'var(--text-primary)', opacity: 0.5 }}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {allGroups.map((group) => {
            const accent = group.accentColor || 'var(--empire-gold)';
            const isExpanded = !!mobileExpandedGroups[group.label];
            const isGroupActive = group.links.some(l => isActiveLink(pathname, l.href));
            const isStaffGroup = !!group.accentColor;

            return (
              <div
                key={group.label}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${isStaffGroup ? accent + '25' : 'rgba(var(--bg-border-rgb,0,0,0),0.07)'}`,
                  background: isGroupActive
                    ? `${accent}08`
                    : isStaffGroup
                      ? `${accent}05`
                      : 'rgba(var(--bg-border-rgb,0,0,0),0.02)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleMobileGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border-none text-left cursor-pointer"
                  style={{ color: isGroupActive || isStaffGroup ? accent : 'var(--text-primary)', opacity: isGroupActive || isStaffGroup ? 1 : 0.7 }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: isGroupActive || isStaffGroup ? `${accent}1e` : 'rgba(var(--bg-border-rgb,0,0,0),0.07)' }}
                    >
                      <span
                        className="material-symbols-outlined text-[13px]"
                        style={{ fontVariationSettings: `'FILL' ${isGroupActive || isStaffGroup ? 1 : 0}`, color: isGroupActive || isStaffGroup ? accent : 'inherit' }}
                      >
                        {group.icon}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold">{group.label}</span>
                    {isStaffGroup && (
                      <span className="text-[7px] font-extrabold px-1 py-0.5 rounded uppercase" style={{ background: accent, color: '#fff' }}>
                        {isAdmin ? 'ADMIN' : 'MOD'}
                      </span>
                    )}
                  </div>
                  <span
                    className={`material-symbols-outlined text-[12px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ opacity: 0.4 }}
                  >
                    expand_more
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 flex flex-col gap-0.5">
                    {group.links.map((link) => {
                      const active = isActiveLink(pathname, link.href);
                      const locked = !isUserLoggedIn && !GUEST_ALLOWED.includes(link.href);

                      return (
                        <Link
                          key={link.href}
                          href={locked ? '/auth/login' : link.href}
                          id={`mobile-${link.id}`}
                          onClick={onClose}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg no-underline transition-all text-[11.5px] font-semibold"
                          style={
                            active
                              ? { background: `${accent}18`, color: accent }
                              : { color: 'var(--text-primary)', opacity: locked ? 0.35 : 0.72 }
                          }
                        >
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                            style={active ? { background: `${accent}28` } : { background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)' }}
                          >
                            <span
                              className="material-symbols-outlined text-[12px]"
                              style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
                            >
                              {locked ? 'lock' : link.icon}
                            </span>
                          </div>
                          <span className="flex-1 truncate">{link.label}</span>
                          {link.badge && (
                            <span className="text-[7px] font-extrabold px-1 py-0.5 rounded uppercase animate-pulse" style={{ background: '#dc2626', color: '#fff' }}>
                              {link.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        {isUserLoggedIn && (
          <div
            className="px-3 pb-4 pt-3 flex flex-col gap-2 shrink-0"
            style={{ borderTop: '1px solid rgba(var(--bg-border-rgb,0,0,0),0.07)' }}
          >
            {/* Identity card */}
            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 p-2.5 rounded-xl no-underline transition-all"
              style={{
                background: isAdmin
                  ? 'linear-gradient(135deg,rgba(220,38,38,0.06),rgba(220,38,38,0.02))'
                  : 'linear-gradient(135deg,rgba(245,158,11,0.07),rgba(249,115,22,0.03))',
                border: `1px solid ${isAdmin ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.1)'}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-extrabold text-sm text-white"
                style={{
                  boxShadow: isAdmin ? '0 0 0 2px rgba(220,38,38,0.4)' : '0 0 0 2px rgba(245,158,11,0.35)',
                  background: avatarBg,
                }}
              >
                {getSafeImageSrc(avatarSrc) ? (
                  <img src={getSafeImageSrc(avatarSrc)} alt="Profile" className="w-full h-full object-cover" />
                ) : avatarInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {displayName || 'Volunteer'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {roleCfg.badgeText && (
                    <span className="text-[7px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wide" style={roleCfg.badgeStyle}>
                      {roleCfg.badgeText}
                    </span>
                  )}
                  <span
                    className="text-[9.5px] font-semibold"
                    style={{ color: isAdmin ? '#dc2626' : 'var(--empire-gold)', opacity: 0.8 }}
                  >
                    {roleCfg.label}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[11px]" style={{ color: isAdmin ? '#dc2626' : 'var(--empire-gold)', opacity: 0.4 }}>
                arrow_forward_ios
              </span>
            </Link>
            {/* Sign out */}
            <button
              type="button"
              id="mobile-sign-out"
              onClick={() => { onClose(); onSignOut(); }}
              className="w-full py-2 rounded-xl text-[11.5px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none"
              style={{ background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)', color: 'var(--text-primary)', opacity: 0.55 }}
            >
              <span className="material-symbols-outlined text-[14px]">logout</span>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SEARCH MODAL ─────────────────────────────────────────────────────────────
interface SearchModalProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchSelectedIndex: number;
  setSearchSelectedIndex: (v: number) => void;
  filteredSearchItems: SearchItem[];
  isUserLoggedIn: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClose: () => void;
  onSelect: (href: string) => void;
}

function SearchModal({
  searchQuery, setSearchQuery, searchSelectedIndex, setSearchSelectedIndex,
  filteredSearchItems, isUserLoggedIn, searchInputRef, onKeyDown, onClose, onSelect,
}: SearchModalProps) {
  // Group results by category
  const grouped: Record<string, SearchItem[]> = {};
  filteredSearchItems.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm border-none cursor-default"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-md rounded-2xl z-10 overflow-hidden flex flex-col max-h-[72vh]"
        style={{
          background: 'var(--dropdown-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--dropdown-border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
        }}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-3 border-b"
          style={{ borderColor: 'var(--dropdown-border)' }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--empire-gold)' }}>search</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search pages, features..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchSelectedIndex(0); }}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent border-none text-[13px] font-semibold focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-primary)]/35"
            style={{ caretColor: 'var(--empire-gold)' }}
          />
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer p-1 rounded-lg"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[13px]" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>close</span>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredSearchItems.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--text-primary)', opacity: 0.15 }}>search_off</span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>
                No results for &quot;{searchQuery}&quot;
              </span>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div
                  className="px-2 py-1 text-[8.5px] font-black uppercase tracking-widest"
                  style={{ color: 'var(--empire-gold)', opacity: 0.65 }}
                >
                  {category}
                </div>
                {items.map((item) => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === searchSelectedIndex;
                  const locked = !isUserLoggedIn && !GUEST_ALLOWED.includes(item.href);

                  return (
                    <button
                      type="button"
                      key={item.href}
                      onClick={() => onSelect(item.href)}
                      onMouseEnter={() => setSearchSelectedIndex(currentIndex)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl w-full text-left border-none bg-transparent cursor-pointer transition-all"
                      style={
                        isSelected
                          ? { background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(249,115,22,0.07))', color: 'var(--empire-gold)' }
                          : { color: 'var(--text-primary)', opacity: 0.8 }
                      }
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={isSelected ? { background: 'rgba(245,158,11,0.2)' } : { background: 'rgba(var(--bg-border-rgb,0,0,0),0.06)' }}
                      >
                        <span
                          className="material-symbols-outlined text-[12px]"
                          style={{ fontVariationSettings: `'FILL' ${isSelected ? 1 : 0}` }}
                        >
                          {locked ? 'lock' : item.icon}
                        </span>
                      </div>
                      <span className="text-[11.5px] font-semibold flex-1 truncate">{item.title}</span>
                      {locked && (
                        <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--empire-gold)' }}>
                          Sign In
                        </span>
                      )}
                      {isSelected && !locked && (
                        <span className="material-symbols-outlined text-[11px]" style={{ color: 'var(--empire-gold)' }}>keyboard_return</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 flex items-center justify-between border-t text-[9px] font-medium"
          style={{ borderColor: 'var(--dropdown-border)', color: 'var(--text-primary)', opacity: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <span className="px-1 rounded bg-black/10">↑↓</span>
            <span>navigate</span>
            <span className="px-1 rounded bg-black/10 ml-1">Enter</span>
            <span>select</span>
          </div>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
