'use client';
// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/(app)/admin/AdminDashboardClient.tsx — Interactive Admin Dashboard

import { useState, useEffect, useMemo, useTransition } from 'react';
// Removed unused import: Link
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getAuditLogs,
  updateUserRole,
  adjustUserPoints,
  adminCreateUser,
  adminDeleteUser,
  updateProfileByStaff,
  resolveModeratorApplication,
  toggleProfileEnabled,
  logAuditAction,
  updateSystemSetting,
  adminDeleteCat,
  adminUpdateCat,
  adminDeleteColony,
  adminDeleteEvent,
  adminDeleteGuild,
  toggleCatVerified,
  moderateEvent,
  raiseModeratorQuery,
  resolveModeratorQuery,
  
  updateEventByStaff,
  type SystemSetting,
} from '@/lib/actions/admin';
import FuturisticAuditDashboard from '@/components/admin/FuturisticAuditDashboard';
import dynamic from 'next/dynamic';

const ModeratorHotspotsMap = dynamic(() => import('@/components/map/ModeratorHotspotsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-[var(--bg-elevated)] rounded-2xl border border-[var(--bg-border)]/50">
      <span className="font-body text-sm font-semibold text-[var(--empire-gold)] animate-pulse">Loading map canvas…</span>
    </div>
  ),
});

import AdminGamificationClient from '@/components/empire/AdminGamificationClient';


export interface Profile {
  id: string;
  display_name: string | null;
  role: string;
  empire_points: number;
  created_at: string;
  bio: string | null;
  preferred_role: string | null;
  location_neighborhood: string | null;
  contact_phone: string | null;
  is_enabled: boolean;
  password_expires_at?: string | null;
  max_usages?: number | null;
  usages_count?: number;
}

export interface AuditLog {
  id: string;
  user_hash: string;
  requested_at: string;
}

export interface StaffAuditLog {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
  actor_name: string;
}

export interface ModeratorApplication {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    empire_points: number;
    bio: string | null;
  };
}

interface Stats {
  userCount: number;
  catCount: number;
  eventCount: number;
  erasureCount: number;
  totalPoints: number;
}

interface Props {
  initialStats: Stats;
  initialProfiles: Profile[];
  initialAudits: AuditLog[];
  initialApplications: ModeratorApplication[];
  initialAuditLogs: StaffAuditLog[];
  initialSystemSettings: SystemSetting[];
  initialCats?: any[];
  initialEvents?: any[];
  initialQueries?: any[];
  initialTrivia?: any[];
  initialBingo?: any[];
  initialGuilds?: any[];
  currentUser?: any;
}

const formatUTCDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr.slice(0, 10);
  }
};

const formatUTCDateTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min} UTC`;
  } catch {
    return dateStr;
  }
};


interface UserActivitySummary {
  cats: Array<{ id: string; name: string | null; status: string; created_at: string }>;
  organizedEvents: Array<{ id: string; title: string; status: string; event_time: string }>;
  signups: Array<{ id: string; event_id: string; title: string; event_time: string; status: string }>;
  auditLogs: Array<{ id: string; action: string; details: string | null; created_at: string; actor_role: string }>;
  applications: Array<{ id: string; reason: string; status: string; created_at: string; updated_at: string }>;
  modQueries: Array<{ id: string; target_type: string; target_id: string; message: string; status: string; response: string | null; created_at: string }>;
}

interface LiveActivityItem {
  id: string;
  timestamp: string;
  type: 'chat' | 'cat' | 'event';
  description: string;
  actorName: string;
  actorId: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color?: string;
    fill?: string;
    name: string;
    value: number;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] p-3 rounded-xl shadow-ambient text-xs font-body text-[var(--empire-cream)]">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((pld, index) => (
          <p key={pld.name + '-' + index} style={{ color: pld.color || pld.fill }}>
            <span className="font-semibold">{pld.name}:</span> {pld.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const renderLegendText = (value: string) => (
  <span className="text-xs font-body font-semibold text-[var(--empire-cream)]/75">{value}</span>
);

const renderLegendTextSmall = (value: string) => (
  <span className="text-[10px] font-body font-semibold text-[var(--empire-cream)]/75">{value}</span>
);

export default function AdminDashboardClient({
  initialStats,
  initialProfiles,
  initialAudits,
  initialApplications,
  initialAuditLogs,
  initialSystemSettings,
  initialCats,
  initialEvents,
  initialQueries,
  initialTrivia,
  initialBingo,
  initialGuilds,
  currentUser,
}: Readonly<Props>) {
  useRouter();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [audits] = useState<AuditLog[]>(initialAudits);
  const [applications, setApplications] = useState<ModeratorApplication[]>(initialApplications || []);
  const [auditLogs, setAuditLogs] = useState<StaffAuditLog[]>(initialAuditLogs || []);

  const [cats, setCats] = useState<any[]>(initialCats || []);
  const [events, setEvents] = useState<any[]>(initialEvents || []);
  const [queries, setQueries] = useState<any[]>(initialQueries || []);
  const [trivia] = useState<any[]>(initialTrivia || []);
  const [bingo] = useState<any[]>(initialBingo || []);
  const [guilds] = useState<any[]>(initialGuilds || []);

  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>(initialSystemSettings || []);
  const [updatingSetting, setUpdatingSetting] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    | 'analytics'
    | 'users'
    | 'applications'
    | 'moderator_dashboard'
    | 'stray_cats'
    | 'tnr_campaigns'
    | 'queries_log'
    | 'gamification'
    | 'audits'
    | 'gdpr'
    | 'database'
    | 'live'
    | 'settings'
    | 'management'
  >('analytics');
  const [userSearch, setUserSearch] = useState('');
  const [profileActivity, setProfileActivity] = useState<UserActivitySummary | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [liveActivities, setLiveActivities] = useState<LiveActivityItem[]>([]);

  // Moderator / Sighting filter states
  const [catSearch, setCatSearch] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState<string>('all');
  const [catVerifyFilter, setCatVerifyFilter] = useState<string>('all');

  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('all');

  const [querySearch, setQuerySearch] = useState('');
  const [queryStatusFilter, setQueryStatusFilter] = useState<string>('active');

  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');

  const [resolvingQueryId, setResolvingQueryId] = useState<string | null>(null);
  const [queryResolutionText, setQueryResolutionText] = useState('');
  const [shiftingQueryId] = useState<string | null>(null);
  const [shiftReasonText] = useState('');

  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Supreme Data Management states
  const [activeManageEntity, setActiveManageEntity] = useState<'cats' | 'colonies' | 'events' | 'guilds'>('cats');
  const [catsList, setCatsList] = useState<any[]>([]);
  const [coloniesList, setColoniesList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [guildsList, setGuildsList] = useState<any[]>([]);
  const [loadingManageData, setLoadingManageData] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageSuccess, setManageSuccess] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [catForm, setCatForm] = useState<any>({ name: '', breed_estimate: '', status: '', health_notes: '' });


  // Audit Logs Filter States
  const [auditActionFilter] = useState('');
  const [auditStaffFilter] = useState('');
  const [auditDateFilter] = useState('');

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const registrationGrowthData = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles.forEach(p => {
      const date = formatUTCDate(p.created_at);
      counts[date] = (counts[date] || 0) + 1;
    });
    const sortedDates = Object.keys(counts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const result = [];
    let cumulative = 0;
    for (const date of sortedDates) {
      cumulative += counts[date];
      result.push({
        date,
        count: counts[date],
        cumulative,
      });
    }
    return result;
  }, [profiles]);

  const roleDistributionData = useMemo(() => {
    const counts = { admin: 0, moderator: 0, user: 0 };
    profiles.forEach(p => {
      const r = p.role || 'user';
      if (r === 'admin' || r === 'moderator' || r === 'user') {
        counts[r] = (counts[r] || 0) + 1;
      } else {
        counts.user = (counts.user || 0) + 1;
      }
    });
    return [
      { name: 'Administrators', value: counts.admin, color: 'var(--empire-gold)' },
      { name: 'Moderators', value: counts.moderator, color: 'var(--life-amber)' },
      { name: 'Volunteers (Users)', value: counts.user, color: 'var(--life-teal)' },
    ].filter(item => item.value > 0);
  }, [profiles]);

  const topVolunteersData = useMemo(() => {
    const sorted = [...profiles]
      .sort((a, b) => b.empire_points - a.empire_points)
      .slice(0, 10);
    return sorted.map(p => ({
      name: p.display_name || 'Unnamed Volunteer',
      points: p.empire_points,
    }));
  }, [profiles]);

  const databaseSizeData = useMemo(() => {
    return [
      { name: 'public.profiles', rows: stats.userCount, color: 'var(--life-teal)' },
      { name: 'public.cats', rows: stats.catCount, color: 'var(--status-tnr)' },
      { name: 'public.tnr_events', rows: stats.eventCount, color: 'var(--status-adoptable)' },
      { name: 'public.erasure_audit', rows: stats.erasureCount, color: 'var(--status-adopted)' },
    ];
  }, [stats]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const actionMatch = !auditActionFilter || log.action.toLowerCase().includes(auditActionFilter.toLowerCase());
      const staffMatch = !auditStaffFilter || log.actor_name.toLowerCase().includes(auditStaffFilter.toLowerCase());
      const dateMatch = !auditDateFilter || formatUTCDate(log.created_at) === auditDateFilter;
      return actionMatch && staffMatch && dateMatch;
    });
  }, [auditLogs, auditActionFilter, auditStaffFilter, auditDateFilter]);

  const handleExportAuditsToCSV = () => {
    if (filteredAuditLogs.length === 0) return;
    const headers = ['Log ID', 'Staff Member', 'Staff Role', 'Action', 'Target ID', 'Details', 'Timestamp'];
    const rows = filteredAuditLogs.map(log => [
      log.id,
      log.actor_name,
      log.actor_role,
      log.action,
      log.target_id || '',
      (log.details || '').replace(/"/g, '""'),
      formatUTCDateTime(log.created_at)
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `meownet_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Filtered audit logs successfully exported to CSV.');
  };



  const handleUpdateSetting = async (key: string, value: any) => {
    setUpdatingSetting(key);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const res = await updateSystemSetting(key, value);
      if (res.success) {
        setSettingsSuccess(`Setting "${key}" updated successfully!`);
        setSystemSettings(prev => prev.map(s => s.key === key ? { ...s, value, updated_at: new Date().toISOString() } : s));
      } else {
        setSettingsError(res.error || 'Failed to update setting');
      }
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update setting');
    } finally {
      setUpdatingSetting(null);
    }
  };

  const fetchManageData = async () => {
    setLoadingManageData(true);
    setManageError(null);
    setManageSuccess(null);
    const supabase = createClient();
    try {
      if (activeManageEntity === 'cats') {
        const { data } = await supabase.from('cats' as never).select('*').order('created_at', { ascending: false });
        setCatsList(data ?? []);
      } else if (activeManageEntity === 'colonies') {
        const { data } = await supabase.from('colonies' as never).select('*').order('created_at', { ascending: false });
        setColoniesList(data ?? []);
      } else if (activeManageEntity === 'events') {
        const { data } = await supabase.from('tnr_events' as never).select('*').order('created_at', { ascending: false });
        setEventsList(data ?? []);
      } else if (activeManageEntity === 'guilds') {
        const { data } = await supabase.from('guilds' as never).select('*').order('created_at', { ascending: false });
        setGuildsList(data ?? []);
      }
    } catch (err: any) {
      setManageError(err.message || 'Failed to load management data');
    } finally {
      setLoadingManageData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'management') {
      setTimeout(() => fetchManageData(), 0);
    }
  }, [activeTab, activeManageEntity]);

  useEffect(() => {
    if (activeTab === 'audits') {
      getAuditLogs()
        .then((logs) => {
          setAuditLogs(logs as StaffAuditLog[]);
        })
        .catch(() => {
          showNotification('error', 'Failed to refresh audit logs.');
        });
    }
  }, [activeTab]);

  const handleDeleteCat = async (catId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this cat sighting? This will remove all associated logs permanently.')) return;
    try {
      const res = await adminDeleteCat(catId);
      if (res.success) {
        setManageSuccess('Cat sighting deleted successfully!');
        setCatsList(prev => prev.filter(c => c.id !== catId));
      } else {
        setManageError(res.error || 'Failed to delete cat sighting');
      }
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  const handleEditCatClick = (cat: any) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name || '',
      breed_estimate: cat.breed_estimate || '',
      status: cat.status || '',
      health_notes: cat.health_notes || ''
    });
  };

  const handleUpdateCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    try {
      const res = await adminUpdateCat(editingCat.id, catForm);
      if (res.success) {
        setManageSuccess('Cat details updated successfully!');
        setCatsList(prev => prev.map(c => c.id === editingCat.id ? { ...c, ...catForm } : c));
        setEditingCat(null);
      } else {
        setManageError(res.error || 'Failed to update cat details');
      }
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  const handleDeleteColony = async (colonyId: string) => {
    if (!window.confirm('Are you sure you want to delete this colony?')) return;
    try {
      const res = await adminDeleteColony(colonyId);
      if (res.success) {
        setManageSuccess('Colony deleted successfully!');
        setColoniesList(prev => prev.filter(c => c.id !== colonyId));
      } else {
        setManageError(res.error || 'Failed to delete colony');
      }
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this TNR event?')) return;
    try {
      const res = await adminDeleteEvent(eventId);
      if (res.success) {
        setManageSuccess('TNR event deleted successfully!');
        setEventsList(prev => prev.filter(e => e.id !== eventId));
      } else {
        setManageError(res.error || 'Failed to delete event');
      }
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  const handleDeleteGuild = async (guildId: string) => {
    if (!window.confirm('Are you sure you want to delete this volunteer guild?')) return;
    try {
      const res = await adminDeleteGuild(guildId);
      if (res.success) {
        setManageSuccess('Guild deleted successfully!');
        setGuildsList(prev => prev.filter(g => g.id !== guildId));
      } else {
        setManageError(res.error || 'Failed to delete guild');
      }
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  useEffect(() => {
    const fetchInitialActivities = async () => {
      try {
        const supabase = createClient();
        const { data: msgs } = await supabase
          .from('community_messages' as never)
          .select('id, created_at, message, user_id, profiles:profiles(display_name)' as never)
          .order('created_at', { ascending: false })
          .limit(20) as unknown as { data: Array<{ id: string; created_at: string; message: string; user_id: string; profiles: { display_name: string | null } | null }> | null };

        const { data: catsData } = await supabase
          .from('cats' as never)
          .select('id, created_at, name, status, owner_id, profiles:profiles(display_name)' as never)
          .order('created_at', { ascending: false })
          .limit(20) as unknown as { data: Array<{ id: string; created_at: string; name: string | null; status: string; owner_id: string; profiles: { display_name: string | null } | null }> | null };

        const { data: eventsData } = await supabase
          .from('tnr_events' as never)
          .select('id, created_at, title, organizer_id, profiles:profiles(display_name)' as never)
          .order('created_at', { ascending: false })
          .limit(10) as unknown as { data: Array<{ id: string; created_at: string; title: string; organizer_id: string; profiles: { display_name: string | null } | null }> | null };

        const combined: LiveActivityItem[] = [];
        if (msgs) {
          msgs.forEach((m) => {
            combined.push({
              id: m.id,
              timestamp: m.created_at,
              type: 'chat',
              description: `Posted in chat: "${m.message.slice(0, 60)}${m.message.length > 60 ? '...' : ''}"`,
              actorName: m.profiles?.display_name || 'Anonymous',
              actorId: m.user_id
            });
          });
        }
        if (catsData) {
          catsData.forEach((c) => {
            combined.push({
              id: c.id,
              timestamp: c.created_at,
              type: 'cat',
              description: `Logged new cat sighting: "${c.name || 'Unnamed Cat'}" (${c.status})`,
              actorName: c.profiles?.display_name || 'Anonymous',
              actorId: c.owner_id
            });
          });
        }
        if (eventsData) {
          eventsData.forEach((e) => {
            combined.push({
              id: e.id,
              timestamp: e.created_at,
              type: 'event',
              description: `Scheduled new TNR campaign: "${e.title}"`,
              actorName: e.profiles?.display_name || 'Anonymous',
              actorId: e.organizer_id
            });
          });
        }

        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLiveActivities(combined.slice(0, 50));
      } catch (err) {
        console.error('Error fetching initial activities:', err);
      }
    };

    fetchInitialActivities();

    const supabase = createClient();
    const channelName = `live-feed-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'community_messages'
    }, async (payload) => {
      const msg = payload.new as { id: string; user_id: string; message: string; created_at: string };
      const { data: profile } = await supabase.from('profiles' as never).select('display_name').eq('id', msg.user_id).maybeSingle() as unknown as { data: { display_name: string | null } | null };
      const name = profile?.display_name || 'Anonymous';

      setLiveActivities(prev => [{
        id: msg.id,
        timestamp: msg.created_at,
        type: 'chat' as const,
        description: `Posted in chat: "${msg.message.slice(0, 60)}${msg.message.length > 60 ? '...' : ''}"`,
        actorName: name,
        actorId: msg.user_id
      }, ...prev].slice(0, 100));
    });

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'cats'
    }, async (payload) => {
      const cat = payload.new as { id: string; owner_id: string; name: string | null; status: string; created_at: string };
      const { data: profile } = await supabase.from('profiles' as never).select('display_name').eq('id', cat.owner_id).maybeSingle() as unknown as { data: { display_name: string | null } | null };
      const name = profile?.display_name || 'Anonymous';

      setLiveActivities(prev => [{
        id: cat.id,
        timestamp: cat.created_at,
        type: 'cat' as const,
        description: `Logged new cat sighting: "${cat.name || 'Unnamed Cat'}" (${cat.status})`,
        actorName: name,
        actorId: cat.owner_id
      }, ...prev].slice(0, 100));
    });

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'tnr_events'
    }, async (payload) => {
      const ev = payload.new as { id: string; organizer_id: string; title: string; created_at: string };
      const { data: profile } = await supabase.from('profiles' as never).select('display_name').eq('id', ev.organizer_id).maybeSingle() as unknown as { data: { display_name: string | null } | null };
      const name = profile?.display_name || 'Anonymous';

      setLiveActivities(prev => [{
        id: ev.id,
        timestamp: ev.created_at,
        type: 'event' as const,
        description: `Scheduled new TNR campaign: "${ev.title}"`,
        actorName: name,
        actorId: ev.organizer_id
      }, ...prev].slice(0, 100));
    });

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'system_settings'
    }, (payload) => {
      const updated = payload.new as SystemSetting;
      setSystemSettings(prev => prev.map(s => s.key === updated.key ? updated : s));
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenProfileById = async (userId: string) => {
    if (!userId) return;
    const existing = profiles.find((p) => p.id === userId);
    if (existing) {
      handleOpenProfileModal(existing);
    } else {
      setLoadingActivity(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles' as never)
          .select('id, display_name, role, empire_points, created_at, bio, preferred_role, location_neighborhood, contact_phone, is_enabled')
          .eq('id', userId)
          .maybeSingle() as unknown as { data: Profile | null };
        if (data) {
          handleOpenProfileModal(data as Profile);
        } else {
          showNotification('error', 'Profile not found.');
        }
      } catch {
        showNotification('error', 'Error loading profile.');
      } finally {
        setLoadingActivity(false);
      }
    }
  };
  const [adjustPointsUserId, setAdjustPointsUserId] = useState<string | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<number>(100);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Application activity expansion
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [appActivity, setAppActivity] = useState<Record<string, UserActivitySummary>>({});
  const [loadingAppActivity, setLoadingAppActivity] = useState<string | null>(null);

  // Modal and edit states
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'moderator' | 'admin'>('user');
  const [newExpiryHours, setNewExpiryHours] = useState<number>(0);
  const [newPassword, setNewPassword] = useState('');
  const [newExpiryType, setNewExpiryType] = useState<'none' | 'custom' | 'hours'>('none');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newMaxUsages, setNewMaxUsages] = useState<number | ''>('');
  const [newBypassVerification, setNewBypassVerification] = useState(true);

  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRoleFocus, setEditRoleFocus] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editMaxUsages, setEditMaxUsages] = useState<number | ''>('');
  const [editUsagesCount, setEditUsagesCount] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const [volunteerApprovals, setVolunteerApprovals] = useState([
    { id: '1', name: 'Marcus Chen', initials: 'MC', status: 'Cleared background check', statusColor: 'text-[var(--life-teal)]', progress: '90%', action: 'approve' },
    { id: '2', name: 'Sarah Jenkins', initials: 'SJ', status: 'Pending background check', statusColor: 'text-amber-400', progress: '100%', action: 'approve' },
    { id: '3', name: 'Alex Rivera', initials: 'AR', status: 'Cleared background check', statusColor: 'text-[var(--life-teal)]', progress: '45%', action: 'progress' }
  ]);

  const handleApproveVolunteer = (id: string, name: string) => {
    setActionLoadingId(`volunteer-approve-${id}`);
    setTimeout(() => {
      setVolunteerApprovals(prev => prev.filter(v => v.id !== id));
      showNotification('success', `Volunteer "${name}" approved successfully!`);
      setActionLoadingId(null);
    }, 800);
  };

  const [selectedCat, setSelectedCat] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [queryModal, setQueryModal] = useState<{
    open: boolean;
    targetType: 'cat' | 'event' | 'profile';
    targetId: string;
    volunteerId: string;
  } | null>(null);
  const [queryMessage, setQueryMessage] = useState('');

  // Toggle Verification
  const handleToggleCatVerified = (catId: string, currentVerified: boolean) => {
    setActionLoadingId(`cat-verify-${catId}`);
    const nextVerified = !currentVerified;
    startTransition(async () => {
      try {
        const res = await toggleCatVerified(catId, nextVerified);
        if (res.success) {
          setCats(cats.map((c) => (c.id === catId ? { ...c, is_verified: nextVerified } : c)));
          if (selectedCat?.id === catId) setSelectedCat({ ...selectedCat, is_verified: nextVerified });
          showNotification('success', `Cat report is now ${nextVerified ? 'verified' : 'unverified'}.`);
        } else {
          showNotification('error', res.error || 'Failed to update verification status.');
        }
      } catch {
        showNotification('error', 'Network error. Please try again.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Moderate TNR Event (Approve / Cancel)
  const handleModerateEvent = (eventId: string, action: 'approve' | 'cancel') => {
    if (action === 'cancel' && !confirm('Are you sure you want to cancel this event?')) return;
    setActionLoadingId(`event-mod-${eventId}`);
    startTransition(async () => {
      try {
        const res = await moderateEvent(eventId, action);
        if (res.success) {
          const nextStatus = action === 'cancel' ? 'cancelled' : 'open';
          setEvents(events.map((e) => (e.id === eventId ? { ...e, status: nextStatus } : e)));
          if (selectedEvent?.id === eventId) setSelectedEvent({ ...selectedEvent, status: nextStatus });
          showNotification('success', `TNR event is now ${nextStatus === 'cancelled' ? 'cancelled' : 'open'}.`);
        } else {
          showNotification('error', res.error || 'Operation failed.');
        }
      } catch {
        showNotification('error', 'Network error. Please try again.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Update Event details (title & description)
  const handleUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setActionLoadingId('event-update');
    startTransition(async () => {
      try {
        const res = await updateEventByStaff(selectedEvent.id, {
          title: editEventTitle,
          description: editEventDescription || undefined,
        });
        if (res.success) {
          setEvents(
            events.map((ev) =>
              ev.id === selectedEvent.id
                ? { ...ev, title: editEventTitle, description: editEventDescription || null }
                : ev
            )
          );
          setSelectedEvent({ ...selectedEvent, title: editEventTitle, description: editEventDescription || null });
          setEditEventOpen(false);
          showNotification('success', 'TNR event details updated.');
        } else {
          showNotification('error', res.error || 'Failed to update event details.');
        }
      } catch {
        showNotification('error', 'Network error.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Resolve query
  const handleResolveQuery = (queryId: string) => {
    setActionLoadingId(`query-resolve-${queryId}`);
    startTransition(async () => {
      try {
        const res = await resolveModeratorQuery(queryId, queryResolutionText || undefined);
        if (res.success) {
          const updated = queries.map((q) =>
            q.id === queryId ? ({ ...q, status: 'resolved', response: queryResolutionText || null } as any) : q
          );
          setQueries(updated);
          setResolvingQueryId(null);
          setQueryResolutionText('');
          showNotification('success', 'Query marked as resolved.');
        } else {
          showNotification('error', res.error || 'Failed to resolve query.');
        }
      } catch {
        showNotification('error', 'Network error.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Raise query
  const handleRaiseQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryModal) return;
    setActionLoadingId('raise-query');
    startTransition(async () => {
      try {
        const res = await raiseModeratorQuery(
          queryModal.targetType,
          queryModal.targetId,
          queryModal.volunteerId,
          queryMessage
        );
        if (res.success) {
          setQueryModal(null);
          setQueryMessage('');
          showNotification('success', 'Query raised successfully.');

          // Optimistically refresh queries list
          const supabase = createClient();
          const { data } = await supabase
            .from('moderator_queries' as never)
            .select('id, target_type, target_id, moderator_id, volunteer_id, message, status, response, created_at')
            .order('created_at', { ascending: false });
          if (data) setQueries(data);
        } else {
          showNotification('error', res.error || 'Failed to raise query.');
        }
      } catch {
        showNotification('error', 'Network error.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'moderator' | 'admin') => {
    setUpdatingUserId(userId);
    try {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        setProfiles(
          profiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
        );
        if (selectedProfile && selectedProfile.id === userId) {
          setSelectedProfile({ ...selectedProfile, role: newRole });
        }
        showNotification('success', 'User role successfully updated.');
      } else {
        showNotification('error', res.error || 'Failed to update user role.');
      }
    } catch {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handlePointsAdjustment = async (userId: string, points: number) => {
    setUpdatingUserId(userId);
    try {
      const res = await adjustUserPoints(userId, points);
      if (res.success) {
        setProfiles(
          profiles.map((p) =>
            p.id === userId
              ? { ...p, empire_points: Math.max(0, p.empire_points + points) }
              : p
          )
        );
        if (selectedProfile && selectedProfile.id === userId) {
          setSelectedProfile({
            ...selectedProfile,
            empire_points: Math.max(0, selectedProfile.empire_points + points),
          });
        }
        setStats({
          ...stats,
          totalPoints: Math.max(0, stats.totalPoints + points),
        });
        showNotification(
          'success',
          `Successfully adjusted user points by ${points > 0 ? '+' : ''}${points} pts.`
        );
        setAdjustPointsUserId(null);
      } else {
        showNotification('error', res.error || 'Failed to adjust user points.');
      }
    } catch {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenProfileModal = async (p: Profile) => {
    setSelectedProfile(p);
    setEditName(p.display_name ?? '');
    setEditBio(p.bio ?? '');
    setEditRoleFocus(p.preferred_role ?? '');
    setEditNeighborhood(p.location_neighborhood ?? '');
    setEditPhone(p.contact_phone ?? '');
    setEditPassword('');
    if (p.password_expires_at) {
      const d = new Date(p.password_expires_at);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      setEditExpiryDate(localISOTime);
    } else {
      setEditExpiryDate('');
    }
    setEditMaxUsages(p.max_usages !== null && p.max_usages !== undefined ? p.max_usages : '');
    setEditUsagesCount(p.usages_count !== null && p.usages_count !== undefined ? p.usages_count : 0);

    logAuditAction('view_profile', p.id, `Admin viewed profile details of user ${p.display_name ?? p.id}`);

    setLoadingActivity(true);
    setProfileActivity(null);
    try {
      const { getUserActivitySummary } = await import('@/lib/actions/admin');
      const res = await getUserActivitySummary(p.id);
      if (res.success && res.data) {
        setProfileActivity(res.data as unknown as UserActivitySummary);
      } else {
        showNotification('error', res.error || 'Failed to load activity summary.');
      }
    } catch {
      showNotification('error', 'Failed to load activity summary.');
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setActionLoading('save-profile');
    try {
      const expiryVal = editExpiryDate ? new Date(editExpiryDate).toISOString() : null;
      const usagesVal = editMaxUsages === '' ? null : Number(editMaxUsages);

      const res = await updateProfileByStaff(
        selectedProfile.id,
        {
          display_name: editName,
          bio: editBio,
          preferred_role: editRoleFocus,
          location_neighborhood: editNeighborhood,
          contact_phone: editPhone,
          password_expires_at: expiryVal,
          max_usages: usagesVal,
          usages_count: editUsagesCount,
        },
        editPassword || undefined
      );

      if (res.success) {
        setProfiles(profiles.map(p => p.id === selectedProfile.id ? {
          ...p,
          display_name: editName,
          bio: editBio,
          preferred_role: editRoleFocus,
          location_neighborhood: editNeighborhood,
          contact_phone: editPhone,
          password_expires_at: expiryVal,
          max_usages: usagesVal,
          usages_count: editUsagesCount,
        } : p));
        setSelectedProfile({
          ...selectedProfile,
          display_name: editName,
          bio: editBio,
          preferred_role: editRoleFocus,
          location_neighborhood: editNeighborhood,
          contact_phone: editPhone,
          password_expires_at: expiryVal,
          max_usages: usagesVal,
          usages_count: editUsagesCount,
        });
        showNotification('success', 'User profile updated successfully.');
      } else {
        showNotification('error', res.error || 'Failed to update profile.');
      }
    } catch {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleProfileEnablement = async () => {
    if (!selectedProfile) return;
    const nextState = !selectedProfile.is_enabled;
    setActionLoading('toggle-enable');
    try {
      const res = await toggleProfileEnabled(selectedProfile.id, nextState);
      if (res.success) {
        setProfiles(profiles.map(p => p.id === selectedProfile.id ? { ...p, is_enabled: nextState } : p));
        setSelectedProfile({ ...selectedProfile, is_enabled: nextState });
        showNotification('success', `User profile ${nextState ? 'enabled' : 'disabled'} successfully.`);
      } else {
        showNotification('error', res.error || 'Failed to toggle profile status.');
      }
    } catch {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;
    setActionLoading('add-user');
    try {
      let expiryVal: string | null = null;
      if (newExpiryType === 'custom' && newExpiryDate) {
        expiryVal = new Date(newExpiryDate).toISOString();
      } else if (newExpiryType === 'hours' && newExpiryHours > 0) {
        // eslint-disable-next-line react-hooks/purity
        expiryVal = new Date(Date.now() + newExpiryHours * 60 * 60 * 1000).toISOString();
      }

      const usagesVal = newMaxUsages === '' ? null : Number(newMaxUsages);

      const res = await adminCreateUser(
        newEmail.trim(),
        newName.trim(),
        newRole,
        newPassword || undefined,
        expiryVal,
        usagesVal,
        newBypassVerification
      );

      if (res.success) {
        showNotification('success', `Successfully created user account.`);
        setIsAddUserOpen(false);
        setNewEmail('');
        setNewName('');
        setNewRole('user');
        setNewPassword('');
        setNewExpiryType('none');
        setNewExpiryDate('');
        setNewMaxUsages('');
        setNewBypassVerification(true);

        // Optimistically add to profiles list
        const newP: Profile = {
          // eslint-disable-next-line react-hooks/purity
          id: `temp-${Math.random()}`,
          display_name: newName.trim(),
          role: newRole,
          empire_points: 0,
          created_at: new Date().toISOString(),
          bio: '',
          preferred_role: '',
          location_neighborhood: '',
          contact_phone: '',
          is_enabled: true,
          password_expires_at: expiryVal,
          max_usages: usagesVal,
          usages_count: 0,
        };
        setProfiles([newP, ...profiles]);
        setStats({ ...stats, userCount: stats.userCount + 1 });
      } else {
        showNotification('error', res.error || 'Failed to create user.');
      }
    } catch {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this user account? This action is permanent and cascades database-wide.')) return;
    setActionLoading(`delete-${userId}`);
    try {
      const res = await adminDeleteUser(userId);
      if (res.success) {
        setProfiles(profiles.filter(p => p.id !== userId));
        setSelectedProfile(null);
        setStats({ ...stats, userCount: Math.max(0, stats.userCount - 1) });
        showNotification('success', 'User account deleted successfully.');
      } else {
        showNotification('error', res.error || 'Failed to delete user.');
      }
    } catch {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveApplication = async (appId: string, action: 'approve' | 'reject') => {
    setActionLoading(`app-${appId}`);
    try {
      const res = await resolveModeratorApplication(appId, action);
      if (res.success) {
        setApplications(applications.map(app => app.id === appId ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' } : app));
        if (action === 'approve') {
          const app = applications.find(a => a.id === appId);
          if (app) {
            setProfiles(profiles.map(p => p.id === app.user.id ? { ...p, role: 'moderator' } : p));
          }
        }
        showNotification('success', `Moderator application successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      } else {
        showNotification('error', res.error || 'Failed to resolve application.');
      }
    } catch {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const term = userSearch.toLowerCase();
    return (
      (p.display_name?.toLowerCase().includes(term) ?? false) ||
      p.role.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  const filteredCats = useMemo(() => {
    return cats.filter((c) => {
      const term = catSearch.toLowerCase();
      const nameMatch = c.name?.toLowerCase().includes(term) || c.id.toLowerCase().includes(term);
      const statusMatch = catStatusFilter === 'all' || c.status === catStatusFilter;
      const verifyMatch =
        catVerifyFilter === 'all' ||
        (catVerifyFilter === 'verified' && c.is_verified) ||
        (catVerifyFilter === 'unverified' && !c.is_verified);
      return nameMatch && statusMatch && verifyMatch;
    });
  }, [cats, catSearch, catStatusFilter, catVerifyFilter]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const term = eventSearch.toLowerCase();
      const titleMatch = e.title?.toLowerCase().includes(term) || e.id.toLowerCase().includes(term);
      const statusMatch = eventStatusFilter === 'all' || e.status === eventStatusFilter;
      return titleMatch && statusMatch;
    });
  }, [events, eventSearch, eventStatusFilter]);

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const term = querySearch.toLowerCase();
      const msgMatch = q.message?.toLowerCase().includes(term) || q.volunteer_id.toLowerCase().includes(term);
      let statusMatch = true;
      if (queryStatusFilter === 'active') {
        statusMatch = q.status === 'pending' || q.status === 'solved';
      } else if (queryStatusFilter === 'archive') {
        statusMatch = q.status === 'closed' || q.status === 'resolved';
      } else if (queryStatusFilter !== 'all') {
        statusMatch = q.status === queryStatusFilter;
      }
      return msgMatch && statusMatch;
    });
  }, [queries, querySearch, queryStatusFilter]);

  const verificationRatioData = useMemo(() => {
    const verified = cats.filter(c => c.is_verified).length;
    const unverified = cats.filter(c => !c.is_verified).length;
    return [
      { name: 'Verified', value: verified, color: 'var(--life-teal)' },
      { name: 'Awaiting Audit', value: unverified, color: 'var(--status-stray)' },
    ].filter(i => i.value > 0);
  }, [cats]);

  const healthFlagsData = useMemo(() => {
    const counts: Record<string, number> = {};
    cats.forEach(c => {
      if (c.health_flags && Array.isArray(c.health_flags)) {
        c.health_flags.forEach((flag: string) => {
          counts[flag] = (counts[flag] || 0) + 1;
        });
      }
    });
    return Object.keys(counts).map(flag => ({
      name: flag.replace('_', ' ').toUpperCase(),
      count: counts[flag],
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [cats]);

  const eventCapacityData = useMemo(() => {
    return events.slice(0, 6).map(e => ({
      name: e.title.slice(0, 15) + (e.title.length > 15 ? '...' : ''),
      utilization: Math.round(((e.cats_tnrd_count || 0) / (e.capacity || 1)) * 100),
    }));
  }, [events]);

  const handleExportQueriesToCSV = () => {
    if (filteredQueries.length === 0) return;
    const headers = ['Query ID', 'Target Type', 'Target ID', 'Volunteer ID', 'Moderator ID', 'Message', 'Status', 'Response', 'Created At'];
    const rows = filteredQueries.map(q => [
      q.id,
      q.target_type,
      q.target_id || '',
      q.volunteer_id,
      q.moderator_id || '',
      (q.message || '').replace(/"/g, '""'),
      q.status,
      (q.response || '').replace(/"/g, '""'),
      formatUTCDateTime(q.created_at)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `moderator_queries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Queries successfully exported to CSV.');
  };

  const handleExpandApplication = async (appId: string, userId: string) => {
    if (expandedAppId === appId) {
      setExpandedAppId(null);
      return;
    }
    setExpandedAppId(appId);
    if (appActivity[appId]) return; // already loaded
    setLoadingAppActivity(appId);
    try {
      const { getUserActivitySummary } = await import('@/lib/actions/admin');
      const res = await getUserActivitySummary(userId);
      if (res.success && res.data) {
        const summary = res.data as unknown as UserActivitySummary;
        setAppActivity(prev => ({ ...prev, [appId]: summary }));
      }
    } catch {
      // silently ignore — activity is supplemental
    } finally {
      setLoadingAppActivity(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col lg:flex-row gap-8 items-start animate-dashboard-fade">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 transform translate-y-0 flex items-center gap-2 ${notification.type === 'success'
              ? 'bg-[#e6fcf5] border-[#c3fae8] text-[#099268]'
              : 'bg-[#fff5f5] border-[#ffe3e3] text-[#c92a2a]'
            }`}
        >
          <span className="material-symbols-outlined text-base">
            {notification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Left Sidebar Nav */}
      <div className="w-full lg:w-64 flex-shrink-0 premium-glass p-5 rounded-2xl flex flex-col gap-6 lg:sticky lg:top-20">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--bg-border)]/20">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)' }}>
            <img src="/pet-logo.png" alt="Mission Control" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-display text-sm font-black text-[var(--empire-gold)] leading-none">Mission Control</h2>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 mt-1 block">Admin Terminal</span>
          </div>
        </div>
        <nav className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-240px)] pr-1 dashboard-scroll-area">
          {/* OVERVIEW */}
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--empire-cream)]/30 px-3 mb-1.5 block">Overview</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'analytics' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">monitoring</span>
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'users' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">group</span>
                <span>User Directory</span>
              </button>

              <button
                onClick={() => setActiveTab('applications')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'applications' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">assignment_ind</span>
                <span>Moderator Apps ({applications.filter(a => a.status === 'pending').length})</span>
              </button>
            </div>
          </div>

          {/* FIELD OPERATIONS */}
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--empire-cream)]/30 px-3 mb-1.5 block">Field Operations</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setActiveTab('moderator_dashboard')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'moderator_dashboard' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>Moderator Ops Map</span>
              </button>

              <button
                onClick={() => setActiveTab('stray_cats')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'stray_cats' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">pets</span>
                <span>Stray Cats ({cats.filter(c => !c.is_verified).length} new)</span>
              </button>

              <button
                onClick={() => setActiveTab('tnr_campaigns')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'tnr_campaigns' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">campaign</span>
                <span>TNR Campaigns ({events.filter(e => e.status === 'pending').length} review)</span>
              </button>

              <button
                onClick={() => setActiveTab('queries_log')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'queries_log' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">question_answer</span>
                <span>Queries Log ({queries.filter(q => q.status === 'open' || q.status === 'escalated').length})</span>
              </button>
            </div>
          </div>

          {/* GAMIFICATION */}
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--empire-cream)]/30 px-3 mb-1.5 block">Gamification</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setActiveTab('gamification')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'gamification' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">sports_esports</span>
                <span>Command Center</span>
              </button>
            </div>
          </div>

          {/* COMPLIANCE & SYSTEM */}
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--empire-cream)]/30 px-3 mb-1.5 block">Compliance &amp; System</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setActiveTab('audits')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'audits' ? 'active text-[var(--empire-gold)]' : 'text(--text-secondary)'
                  }`}
              >
                <span className="material-symbols-outlined text-base">history_edu</span>
                <span>Audit Trail</span>
              </button>

              <button
                onClick={() => setActiveTab('gdpr')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'gdpr' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">policy</span>
                <span>GDPR Compliance ({audits.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('database')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'database' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">database</span>
                <span>Database Registry</span>
              </button>

              <button
                onClick={() => setActiveTab('live')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'live' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Status Feed</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'settings' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">settings_applications</span>
                <span>Global Settings</span>
              </button>

              <button
                onClick={() => setActiveTab('management')}
                className={`sidebar-nav-link border-none text-left w-full ${activeTab === 'management' ? 'active text-[var(--empire-gold)]' : 'text-[var(--empire-cream)]/60'
                  }`}
              >
                <span className="material-symbols-outlined text-base">shield</span>
                <span>Supreme Management</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="pt-4 border-t border-[var(--bg-border)]/20 mt-auto flex flex-col gap-1 text-center">
          <div className="text-[10px] font-bold text-[var(--empire-gold)] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>All Channels nominal</span>
          </div>
          <span className="text-[8px] text-[var(--empire-cream)]/30 font-mono">MeowNet Admin Console v0.8.0</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 min-w-0 flex flex-col gap-8 w-full">
        {/* Dynamic Canvas Header */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-[var(--bg-border)]/20 pb-4">
          <div>
            <h2 className="font-display text-2xl font-black text-[var(--empire-gold)] mb-1 capitalize">
              {activeTab === 'analytics' ? 'Visual Analytics' : activeTab.replace('_', ' ')}
            </h2>
            <p className="font-body text-xs text-[var(--empire-cream)]/60">
              {activeTab === 'analytics' && 'System performance, user roles, and community engagement.'}
              {activeTab === 'users' && 'Manage volunteer permissions, award empire points, and review credentials.'}
              {activeTab === 'applications' && 'Process volunteer submissions for moderator promotion.'}
              {activeTab === 'audits' && 'Secure logs tracking administrative actions across the database.'}
              {activeTab === 'gdpr' && 'Anonymized cryptographic audits for user account erasures.'}
              {activeTab === 'database' && 'Monitor storage sizes and statistics across database tables.'}
              {activeTab === 'live' && 'Real-time telemetry and activity tracking feed.'}
              {activeTab === 'settings' && 'Configure global multipliers, weather safety parameters, and toggles.'}
              {activeTab === 'management' && 'Supreme administrative override and direct entity editor.'}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button className="border border-[var(--bg-border)]/40 hover:bg-[var(--bg-elevated)] text-[var(--empire-cream)]/75 py-2 px-4 rounded-xl font-display text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>Last 30 Days</span>
            </button>
            <button className="bg-[var(--empire-gold)]/10 hover:bg-[var(--empire-gold)]/15 border border-[var(--empire-gold)]/20 text-[var(--empire-gold)] py-2 px-4 rounded-xl font-display text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Export Report</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] shadow-ambient p-6 flex flex-col gap-6">
          {activeTab === 'analytics' ? (
            <div className="flex flex-col gap-8">
              {/* Stats Summary Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[var(--bg-surface)]/65 backdrop-blur-md p-5 rounded-2xl border border-[var(--bg-border)]/40 shadow-ambient flex items-center gap-4 hover:shadow-active hover:border-[var(--empire-gold)]/60 transition-all duration-300 transform hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-xl bg-[var(--life-teal)]/10 text-[var(--life-teal)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-2xl">group</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--empire-cream)] font-data group-hover:text-[var(--empire-gold)] transition-colors duration-300">{stats.userCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 mt-0.5">Total Accounts</div>
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)]/65 backdrop-blur-md p-5 rounded-2xl border border-[var(--bg-border)]/40 shadow-ambient flex items-center gap-4 hover:shadow-active hover:border-[var(--empire-gold)]/60 transition-all duration-300 transform hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-xl bg-[var(--status-tnr)]/10 text-[var(--status-tnr)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-2xl">pets</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--empire-cream)] font-data group-hover:text-[var(--empire-gold)] transition-colors duration-300">{stats.catCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 mt-0.5">Cat Sightings Map</div>
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)]/65 backdrop-blur-md p-5 rounded-2xl border border-[var(--bg-border)]/40 shadow-ambient flex items-center gap-4 hover:shadow-active hover:border-[var(--empire-gold)]/60 transition-all duration-300 transform hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-xl bg-[var(--status-adoptable)]/10 text-[var(--status-adoptable)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-2xl">military_tech</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--empire-cream)] font-data group-hover:text-[var(--empire-gold)] transition-colors duration-300">{stats.totalPoints.toLocaleString()}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 mt-0.5">Points Distributed</div>
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)]/65 backdrop-blur-md p-5 rounded-2xl border border-[var(--bg-border)]/40 shadow-ambient flex items-center gap-4 hover:shadow-active hover:border-[var(--empire-gold)]/60 transition-all duration-300 transform hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-xl bg-[var(--status-adopted)]/10 text-[var(--status-adopted)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-2xl">gavel</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--empire-cream)] font-data group-hover:text-[var(--empire-gold)] transition-colors duration-300">{stats.erasureCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 mt-0.5">GDPR Erasures</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--bg-border)]/20 pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                    <span className="material-symbols-outlined">analytics</span>
                    <span>MeowNet Core Growth &amp; Role Distribution</span>
                  </h3>
                  <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">
                    Interactive real-time visualization of user registrations, volunteer roles, and gamification points.
                  </p>
                </div>
              </div>

              {!isMounted ? (
                <div className="py-24 text-center text-xs text-[var(--empire-cream)]/40 flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-[var(--empire-gold)]">progress_activity</span>
                  <span>Initializing data visualization components...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* Registration Area Chart */}
                  <div className="bg-[var(--bg-elevated)]/45 border border-[var(--bg-border)]/40 p-5 rounded-2xl shadow-sm">
                    <h4 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-4 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[var(--life-teal)]">trending_up</span>
                      Volunteer Signups (Cumulative Registration Trend)
                    </h4>
                    <div className="w-full h-80">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={registrationGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--life-teal)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--life-teal)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.2} />
                          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-data)" />
                          <YAxis stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-data)" />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="cumulative" name="Total Members" stroke="var(--life-teal)" strokeWidth={2} fillOpacity={1} fill="url(#regGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Role Distribution Pie Chart */}
                    <div className="bg-[var(--bg-elevated)]/45 border border-[var(--bg-border)]/40 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-4 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-[var(--life-amber)]">pie_chart</span>
                          Community Role Distribution
                        </h4>
                        <div className="w-full h-64 flex justify-center items-center">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <RechartsPieChart>
                              <Tooltip content={<CustomTooltip />} />
                              <Pie
                                data={roleDistributionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {roleDistributionData.map((entry) => (
                                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Legend verticalAlign="bottom" height={36} formatter={renderLegendText} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Top Volunteers Bar Chart */}
                    <div className="bg-[var(--bg-elevated)]/45 border border-[var(--bg-border)]/40 p-5 rounded-2xl shadow-sm">
                      <h4 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-4 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">military_tech</span>
                        Top Volunteers (Points Leaderboard Preview)
                      </h4>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <RechartsBarChart data={topVolunteersData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.2} />
                            <XAxis type="number" stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-data)" />
                            <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-body)" width={100} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="points" name="Empire Points" fill="var(--empire-gold)" radius={[0, 4, 4, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'users' ? (
            <>
              {/* Search and Add User */}
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-4 items-center flex-1">
                  <span className="material-symbols-outlined text-[var(--empire-cream)]/35">search</span>
                  <input
                    type="text"
                    placeholder="Search accounts by username, ID, or role..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full max-w-md bg-transparent border-0 font-body text-sm outline-none text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/30"
                  />
                </div>
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Add User
                </button>
              </div>

              {/* List */}
              {filteredProfiles.length === 0 ? (
                <div className="py-12 text-center text-[var(--empire-cream)]/40 font-body text-xs">
                  No accounts matching your search query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">User ID</th>
                        <th className="py-3 px-4">Empire Points</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProfiles.map((profile) => (
                        <tr
                          key={profile.id}
                          className="border-b border-[var(--bg-border)]/30 hover:bg-[var(--bg-elevated)]/20 transition-colors"
                        >
                          <td className="py-4 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">
                            {profile.display_name ?? 'Unnamed User'}
                          </td>
                          <td className="py-4 px-4 font-body text-[10px] text-[var(--empire-cream)]/40 font-semibold select-all">
                            {profile.id}
                          </td>
                          <td className="py-4 px-4 font-data text-xs font-bold text-[var(--empire-cream)]">
                            {profile.empire_points.toLocaleString()} pts
                          </td>
                          <td className="py-4 px-4 font-body text-[10px] text-[var(--empire-cream)]/50 font-semibold">
                            {formatUTCDate(profile.created_at)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex gap-2 justify-end items-center">
                              <button
                                onClick={() => handleOpenProfileModal(profile)}
                                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 rounded-lg font-body text-[10px] font-bold uppercase cursor-pointer transition-all"
                              >
                                View Info
                              </button>
                              {adjustPointsUserId === profile.id ? (
                                <div className="flex gap-1.5 items-center bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--bg-border)]/50">
                                  <input
                                    type="number"
                                    value={adjustmentValue}
                                    onChange={(e) => setAdjustmentValue(parseInt(e.target.value) || 0)}
                                    className="w-14 bg-transparent border-0 font-data text-xs font-bold outline-none text-[var(--empire-cream)] text-center"
                                  />
                                  <button
                                    onClick={() => handlePointsAdjustment(profile.id, adjustmentValue)}
                                    className="px-2.5 py-1 bg-[var(--life-teal)] text-white rounded-md font-body text-[9px] font-bold uppercase cursor-pointer hover:bg-[var(--life-teal-dim)]"
                                  >
                                    Apply
                                  </button>
                                  <button
                                    onClick={() => setAdjustPointsUserId(null)}
                                    className="px-2.5 py-1 bg-[var(--bg-border)] text-[var(--empire-cream)]/80 rounded-md font-body text-[9px] font-bold uppercase cursor-pointer hover:bg-[var(--bg-border)]/60"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAdjustPointsUserId(profile.id);
                                    setAdjustmentValue(100);
                                  }}
                                  className="px-2.5 py-1 bg-[var(--bg-elevated)] text-[var(--empire-cream)]/80 border border-[var(--bg-border)]/50 rounded-lg font-body text-[10px] font-semibold cursor-pointer hover:bg-[var(--bg-border)]/15 transition-all"
                                >
                                  Adjust Points
                                </button>
                              )}

                              <select
                                disabled={updatingUserId === profile.id}
                                value={profile.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    profile.id,
                                    e.target.value as 'user' | 'moderator' | 'admin'
                                  )
                                }
                                className="bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--empire-cream)]/90 rounded-lg py-1 px-2.5 font-body text-xs font-semibold cursor-pointer outline-none transition-all disabled:opacity-50"
                              >
                                <option value="user">User (Standard)</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Administrator</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : activeTab === 'applications' ? (
            <div>
              <h3 className="font-display text-base font-bold text-[var(--empire-gold)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">gavel</span>
                <span>Moderator Applications</span>
              </h3>
              {applications.length === 0 ? (
                <div className="py-12 text-center text-[var(--empire-cream)]/40 font-body text-xs">No applications submitted.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {applications.map((app) => {
                    const isExpanded = expandedAppId === app.id;
                    const activity = appActivity[app.id];
                    const isLoadingThis = loadingAppActivity === app.id;
                    return (
                      <div
                        key={app.id}
                        className={`rounded-2xl border transition-all ${app.status === 'pending'
                            ? 'border-amber-200/40 bg-amber-50/5'
                            : app.status === 'approved'
                              ? 'border-teal-200/40 bg-teal-50/5'
                              : 'border-red-200/40 bg-red-50/5'
                          }`}
                      >
                        {/* Application Header Row */}
                        <div className="flex items-center gap-4 p-4 flex-wrap">
                          {/* Avatar placeholder */}
                          <div className="w-10 h-10 rounded-full bg-[var(--empire-gold)]/10 border border-[var(--empire-gold)]/20 flex items-center justify-center shrink-0">
                            <span className="font-display text-sm font-bold text-[var(--empire-gold)]">
                              {(app.user.display_name ?? 'V')[0].toUpperCase()}
                            </span>
                          </div>

                          {/* Name + Points */}
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-sm font-bold text-[var(--empire-cream)]">
                              {app.user.display_name}
                            </div>
                            <div className="font-data text-[10px] font-bold text-[var(--life-teal)]">
                              {app.user.empire_points} Empire Points
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span className={`px-2.5 py-1 rounded-full font-body text-[9px] font-bold uppercase tracking-wider shrink-0 ${app.status === 'pending'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : app.status === 'approved'
                                ? 'bg-teal-50 text-teal-600 border border-teal-200'
                                : 'bg-red-50 text-red-600 border border-red-200'
                            }`}>
                            {app.status}
                          </span>

                          {/* Expand toggle */}
                          <button
                            type="button"
                            onClick={() => handleExpandApplication(app.id, app.user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--bg-border)] text-[var(--empire-cream)]/60 hover:text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                            disabled={isLoadingThis}
                          >
                            {isLoadingThis ? (
                              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-sm">{isExpanded ? 'expand_less' : 'manage_search'}</span>
                            )}
                            {isExpanded ? 'Collapse' : 'Review Record'}
                          </button>

                          {/* Action buttons */}
                          {app.status === 'pending' ? (
                            <div className="flex gap-2 shrink-0">
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleResolveApplication(app.id, 'approve')}
                                className="px-3 py-1.5 bg-[#e6fcf5] text-[#099268] border border-[#c3fae8] rounded-lg font-body text-[10px] font-bold uppercase cursor-pointer hover:bg-[#c3fae8] transition-all disabled:opacity-50"
                              >
                                {actionLoading === `app-${app.id}` ? 'Approving...' : '✓ Approve'}
                              </button>
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleResolveApplication(app.id, 'reject')}
                                className="px-3 py-1.5 bg-[#fff5f5] text-[#c92a2a] border border-[#ffe3e3] rounded-lg font-body text-[10px] font-bold uppercase cursor-pointer hover:bg-[#ffe3e3] transition-all disabled:opacity-50"
                              >
                                {actionLoading === `app-${app.id}` ? 'Rejecting...' : '✕ Reject'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-[var(--empire-cream)]/30 uppercase shrink-0">
                              Processed
                            </span>
                          )}
                        </div>

                        {/* Statement + Bio always visible */}
                        <div className="px-4 pb-3 border-t border-[var(--bg-border)]/20 pt-3 mx-4 flex flex-col gap-2">
                          <div>
                            <div className="font-bold text-[10px] text-[var(--empire-cream)]/40 uppercase tracking-wider mb-1">Application Statement</div>
                            <div className="font-body text-xs text-[var(--empire-cream)]/80 italic bg-[var(--bg-elevated)] px-3 py-2 rounded-lg border border-[var(--bg-border)]/15">
                              &quot;{app.reason}&quot;
                            </div>
                          </div>
                          {app.user.bio && (
                            <div>
                              <div className="font-bold text-[10px] text-[var(--empire-cream)]/40 uppercase tracking-wider mb-1">Volunteer Bio</div>
                              <div className="font-body text-xs text-[var(--empire-cream)]/70 bg-[var(--bg-elevated)] px-3 py-2 rounded-lg border border-[var(--bg-border)]/15">
                                {app.user.bio}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Expanded Activity Record */}
                        {isExpanded && (
                          <div className="mx-4 mb-4 border-t border-[var(--bg-border)]/20 pt-3">
                            <div className="font-bold text-[10px] text-[var(--empire-gold)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">history</span>
                              Previous Activity Record
                            </div>
                            {isLoadingThis ? (
                              <div className="py-4 text-center text-xs text-[var(--empire-cream)]/40">Loading activity…</div>
                            ) : activity ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/15 text-center">
                                  <div className="font-data text-xl font-black text-[var(--life-teal)]">{activity.cats?.length ?? 0}</div>
                                  <div className="text-[9px] uppercase font-bold text-[var(--empire-cream)]/40 mt-0.5">Cats Logged</div>
                                </div>
                                <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/15 text-center">
                                  <div className="font-data text-xl font-black text-[var(--empire-gold)]">{activity.organizedEvents?.length ?? 0}</div>
                                  <div className="text-[9px] uppercase font-bold text-[var(--empire-cream)]/40 mt-0.5">Events Organized</div>
                                </div>
                                <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/15 text-center">
                                  <div className="font-data text-xl font-black text-[#ab2c5d]">{activity.signups?.length ?? 0}</div>
                                  <div className="text-[9px] uppercase font-bold text-[var(--empire-cream)]/40 mt-0.5">Events Joined</div>
                                </div>
                                <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/15 text-center">
                                  <div className="font-data text-xl font-black text-zinc-400">{activity.auditLogs?.length ?? 0}</div>
                                  <div className="text-[9px] uppercase font-bold text-[var(--empire-cream)]/40 mt-0.5">Audit Entries</div>
                                </div>
                              </div>
                            ) : (
                              <div className="py-4 text-center text-xs text-[var(--empire-cream)]/40">
                                No activity data available.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'moderator_dashboard' ? (
            <div className="flex flex-col gap-8 animate-fade-in">
              {/* Top row: Community Vitals + Volunteer Approvals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Community Vitals Card */}
                <div className="bg-[var(--bg-elevated)]/45 border border-[var(--bg-border)]/40 p-5 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform duration-300">
                  <h3 className="font-display text-base font-bold text-[var(--empire-gold)] mb-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">monitoring</span>
                    <span>Community Vitals</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--bg-border)]/20 shadow-sm flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl text-[var(--life-teal)] bg-[var(--life-teal)]/10 p-2.5 rounded-lg">volunteer_activism</span>
                      <div>
                        <div className="text-xl font-black text-[var(--empire-cream)] font-data">1,284</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">Active Guardians</div>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--bg-border)]/20 shadow-sm flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl text-[var(--empire-gold)] bg-[var(--empire-gold)]/10 p-2.5 rounded-lg">pets</span>
                      <div>
                        <div className="text-xl font-black text-[var(--empire-cream)] font-data">{cats.length}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">Total Stray Sightings</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3.5 bg-[var(--life-teal)]/5 border border-[var(--life-teal)]/10 rounded-xl text-[10px] text-[var(--life-teal)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs">info</span>
                    <span>All core parameters are tracking within normal parameters. Real-time updates active.</span>
                  </div>
                </div>

                {/* Volunteer Approval Panel Card */}
                <div className="bg-[var(--bg-elevated)]/45 border border-[var(--bg-border)]/40 p-5 rounded-2xl shadow-sm flex flex-col gap-3 hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--bg-border)]/20">
                    <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">assignment_ind</span>
                      <span>Volunteer Checklists</span>
                    </h3>
                    <span className="text-[8px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 py-0.5 px-1.5 rounded-full uppercase tracking-wider">
                      {volunteerApprovals.length} Pending Check
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-[140px] overflow-y-auto pr-1 dashboard-scroll-area">
                    {volunteerApprovals.length === 0 ? (
                      <div className="py-8 text-center text-[var(--empire-cream)]/30 text-xs italic">
                        No pending checklists in queue
                      </div>
                    ) : (
                      volunteerApprovals.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-4 p-2 bg-[var(--bg-surface)]/40 border border-[var(--bg-border)]/10 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs">
                              {v.initials}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[var(--empire-cream)]">{v.name}</div>
                              <div className={`text-[8px] ${v.statusColor} font-bold`}>{v.status}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-[var(--bg-border)]/30 rounded-full h-1 overflow-hidden">
                              <div className="bg-emerald-400 h-full rounded-full" style={{ width: v.progress }} />
                            </div>
                            {v.action === 'approve' ? (
                              <button
                                disabled={actionLoadingId === `volunteer-approve-${v.id}`}
                                onClick={() => handleApproveVolunteer(v.id, v.name)}
                                className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-[8px] text-emerald-400 font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-50 font-body"
                              >
                                {actionLoadingId === `volunteer-approve-${v.id}` ? 'Approving...' : 'Approve'}
                              </button>
                            ) : (
                              <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2.5 py-1 rounded-lg">
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Map (left) + Moderation Queue (right) */}
              <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                {/* Map Bento Cell */}
                <div className="flex-1 bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] shadow-ambient p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap gap-4 items-center justify-between pb-3 border-b border-[var(--bg-border)]/20">
                    <div>
                      <h3 className="font-display text-sm font-bold text-[var(--empire-gold)] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">map</span>
                        <span>Live Field Ops Map</span>
                      </h3>
                      <p className="font-body text-[10px] text-[var(--empire-cream)]/50">
                        Click pins to inspect coordinates, view details, or process sightings.
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[420px] rounded-xl overflow-hidden border border-[var(--bg-border)]/40 relative">
                    <ModeratorHotspotsMap
                      cats={cats}
                      events={events}
                      onToggleCatVerified={handleToggleCatVerified}
                      onModerateEvent={handleModerateEvent}
                      onSelectCat={(c) => setSelectedCat(c)}
                      onSelectEvent={(e) => setSelectedEvent(e)}
                      actionLoadingId={actionLoadingId}
                    />
                  </div>
                </div>

                {/* Moderation Queue Bento Cell */}
                <div className="w-full lg:w-80 bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] shadow-ambient p-5 flex flex-col gap-4">
                  <div className="pb-3 border-b border-[var(--bg-border)]/20">
                    <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">checklist</span>
                      <span>Pending Verification Sighting Queue</span>
                    </h3>
                    <p className="font-body text-[10px] text-[var(--empire-cream)]/50">
                      {cats.filter(c => !c.is_verified).length} pending verifications
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 max-h-[460px] pr-1.5 dashboard-scroll-area">
                    {cats.filter(c => !c.is_verified).length === 0 ? (
                      <div className="py-24 text-center text-xs text-[var(--empire-cream)]/40 italic flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-2xl text-emerald-400">task_alt</span>
                        <span>Verification queue clear!</span>
                      </div>
                    ) : (
                      cats.filter(c => !c.is_verified).slice(0, 15).map((cat) => (
                        <div key={cat.id} className="p-3 bg-[var(--bg-elevated)]/30 border border-[var(--bg-border)]/30 rounded-xl flex flex-col gap-2 hover:border-[var(--empire-gold)]/50 hover:scale-[1.02] transition-all duration-300 text-left">
                          <div className="flex justify-between items-start gap-1">
                            <div className="font-display text-xs font-bold text-[var(--empire-gold)] truncate">{cat.name || 'Unnamed Cat'}</div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider py-0.5 px-1.5 rounded-full ${cat.health_notes?.toLowerCase().includes('sick') || cat.health_notes?.toLowerCase().includes('injur')
                                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                              }`}>
                              {cat.health_notes?.toLowerCase().includes('sick') || cat.health_notes?.toLowerCase().includes('injur') ? 'Urgent' : 'Sighting'}
                            </span>
                          </div>
                          <div className="text-[10px] font-body text-[var(--empire-cream)]/75 line-clamp-2">{cat.breed_estimate || 'Stray Cat'} · {cat.health_notes || 'No health flags'}</div>
                          <div className="text-[8px] font-data text-[var(--empire-cream)]/40">Registered {new Date(cat.created_at).toLocaleDateString()}</div>
                          <div className="flex gap-2 justify-end pt-1.5 border-t border-[var(--bg-border)]/15">
                            <button
                              onClick={() => setSelectedCat(cat)}
                              className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--bg-border)] text-[8px] text-[var(--empire-cream)] font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors"
                            >
                              Inspect
                            </button>
                            <button
                              disabled={actionLoadingId === `cat-verify-${cat.id}`}
                              onClick={() => handleToggleCatVerified(cat.id, false)}
                              className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-[8px] text-emerald-400 font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                            >
                              {actionLoadingId === `cat-verify-${cat.id}` ? 'Processing...' : 'Verify'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'stray_cats' ? (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Verification & Health Analytics */}
              {isMounted && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[var(--bg-elevated)]/30 p-5 rounded-2xl border border-[var(--bg-border)]/20 mb-2 animate-fade-in">
                  {/* Sighting Queue Pie Chart */}
                  <div className="flex flex-col gap-2">
                    <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]/70 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[var(--life-teal)]">checklist</span>
                      Verification Audit Queue
                    </h4>
                    <div className="w-full h-40 flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <RechartsPieChart>
                          <Tooltip content={<CustomTooltip />} />
                          <Pie
                            data={verificationRatioData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {verificationRatioData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend verticalAlign="bottom" height={24} formatter={renderLegendTextSmall} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Health Flags Density Bar Chart */}
                  <div className="flex flex-col gap-2">
                    <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]/70 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[var(--status-stray)]">emergency</span>
                      Active Health Flags Density
                    </h4>
                    <div className="w-full h-40">
                      {healthFlagsData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-[var(--empire-cream)]/35 italic">No active health flags reported.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <RechartsBarChart data={healthFlagsData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.1} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} fontFamily="var(--font-body)" />
                            <YAxis stroke="var(--text-muted)" fontSize={8} fontFamily="var(--font-data)" />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Cats Count" fill="var(--status-stray)" radius={[4, 4, 0, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3 items-center flex-1 max-w-md bg-[var(--bg-elevated)] px-3 py-2 rounded-xl border border-[var(--bg-border)]/50">
                  <span className="material-symbols-outlined text-[var(--empire-cream)]/30 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Search stray reports by name or ID..."
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/35"
                  />
                </div>

                <div className="flex gap-3 flex-wrap">
                  <select
                    value={catStatusFilter}
                    onChange={(e) => setCatStatusFilter(e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-xl px-3 py-1.5 font-body text-xs text-[var(--empire-cream)] outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="stray">Stray</option>
                    <option value="tnr">TNR Colony</option>
                    <option value="adoptable">Adoptable</option>
                    <option value="adopted">Adopted</option>
                  </select>

                  <select
                    value={catVerifyFilter}
                    onChange={(e) => setCatVerifyFilter(e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-xl px-3 py-1.5 font-body text-xs text-[var(--empire-cream)] outline-none"
                  >
                    <option value="all">All Verification</option>
                    <option value="verified">Verified Only</option>
                    <option value="unverified">Unverified Only</option>
                  </select>
                </div>
              </div>

              {filteredCats.length === 0 ? (
                <div className="py-16 text-center text-[var(--empire-cream)]/40 font-body text-xs">
                  No stray cat sighting reports match this criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[560px] overflow-y-auto pr-1 dashboard-scroll-area">
                  {filteredCats.map((cat) => (
                    <div
                      key={cat.id}
                      className="cyber-card p-4 rounded-2xl flex flex-col justify-between gap-4"
                    >
                      <div className="flex gap-4">
                        {cat.photo_url ? (
                          <img
                            src={cat.photo_url}
                            alt={cat.name}
                            className="w-16 h-16 rounded-xl object-cover border border-[var(--bg-border)] bg-[var(--bg-void)] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-void)] flex items-center justify-center flex-shrink-0 text-[var(--empire-cream)]/30">
                            <span className="material-symbols-outlined text-2xl">pets</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] truncate">
                              {cat.name || 'Unnamed Cat'}
                            </h3>
                            {cat.is_verified && (
                              <span
                                className="material-symbols-outlined text-sm text-[var(--life-teal)]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                                title="Verified Sighting"
                              >
                                verified
                              </span>
                            )}
                          </div>
                          <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5 uppercase tracking-wider font-semibold">
                            {cat.breed_estimate || 'Unknown Breed'}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 text-[9px] font-bold text-[var(--empire-cream)] rounded-md uppercase">
                              {cat.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/20 pt-3 flex-wrap">
                        <button
                          onClick={() => setSelectedCat(cat)}
                          className="px-2 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[10px] font-bold text-[var(--empire-cream)] uppercase rounded-lg transition-colors cursor-pointer"
                        >
                          Details
                        </button>

                        <button
                          onClick={() => handleToggleCatVerified(cat.id, cat.is_verified)}
                          disabled={actionLoadingId === `cat-verify-${cat.id}`}
                          className={`px-2 py-1 border text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${cat.is_verified
                              ? 'bg-amber-500/10 border-amber-500/35 text-amber-600 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20'
                            }`}
                        >
                          {actionLoadingId === `cat-verify-${cat.id}` ? 'Processing...' : (cat.is_verified ? 'Revoke' : 'Verify')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'tnr_campaigns' ? (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Event Utilization Analytics */}
              {isMounted && (
                <div className="bg-[var(--bg-elevated)]/30 p-5 rounded-2xl border border-[var(--bg-border)]/20 mb-2">
                  <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]/70 flex items-center gap-1 mb-3">
                    <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">trending_up</span>
                    TNR Sighting Density / Capacity Utilization Ratio (%)
                  </h4>
                  <div className="w-full h-40">
                    {eventCapacityData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-[var(--empire-cream)]/35 italic">No active TNR events planned.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <RechartsBarChart data={eventCapacityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.1} />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} fontFamily="var(--font-body)" />
                          <YAxis stroke="var(--text-muted)" fontSize={8} fontFamily="var(--font-data)" unit="%" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="utilization" name="Capacity Used" fill="var(--empire-gold)" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3 items-center flex-1 max-w-md bg-[var(--bg-elevated)] px-3 py-2 rounded-xl border border-[var(--bg-border)]/50">
                  <span className="material-symbols-outlined text-[var(--empire-cream)]/30 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Search campaigns by title or ID..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/35"
                  />
                </div>

                <select
                  value={eventStatusFilter}
                  onChange={(e) => setEventStatusFilter(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-xl px-3 py-1.5 font-body text-xs text-[var(--empire-cream)] outline-none"
                >
                  <option value="all">All Campaign Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="open">Active / Open</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="py-16 text-center text-[var(--empire-cream)]/40 font-body text-xs">
                  No TNR events found matching current criteria.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto pr-1 dashboard-scroll-area">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/45 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">Event Campaign</th>
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4">Capacity</th>
                        <th className="py-3 px-4">TNR Count</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event) => (
                        <tr
                          key={event.id}
                          className="border-b border-[var(--bg-border)]/20 hover:bg-[var(--bg-elevated)]/20 transition-colors"
                        >
                          <td className="py-4 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">
                            {event.title}
                            <div className="text-[9px] font-normal text-[var(--empire-cream)]/45 mt-0.5 truncate max-w-xs">
                              {event.id}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-body text-[10px] font-semibold text-[var(--empire-cream)]/65">
                            {formatUTCDateTime(event.event_time)}
                          </td>
                          <td className="py-4 px-4 font-data text-xs text-[var(--empire-cream)] font-bold">
                            {event.capacity} volunteers
                          </td>
                          <td className="py-4 px-4 font-data text-xs text-[var(--empire-cream)] font-bold">
                            {event.cats_tnrd_count} cats
                          </td>
                          <td className="py-4 px-4 font-body text-xs">
                            <span
                              className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded-md ${event.status === 'open'
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                                  : event.status === 'pending'
                                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-600'
                                    : 'bg-red-500/10 border-red-500/25 text-red-500'
                                }`}
                            >
                              {event.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex gap-2 justify-end items-center">
                              <button
                                onClick={() => setSelectedEvent(event)}
                                className="px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[9px] font-bold text-[var(--empire-cream)] uppercase rounded-md transition-colors cursor-pointer"
                              >
                                Details
                              </button>

                              {event.status !== 'open' && (
                                <button
                                  onClick={() => handleModerateEvent(event.id, 'approve')}
                                  disabled={actionLoadingId === `event-mod-${event.id}`}
                                  className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-all disabled:opacity-50"
                                >
                                  {actionLoadingId === `event-mod-${event.id}` ? 'Approving...' : 'Approve'}
                                </button>
                              )}

                              {event.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleModerateEvent(event.id, 'cancel')}
                                  disabled={actionLoadingId === `event-mod-${event.id}`}
                                  className="px-2.5 py-1 bg-red-500/10 border border-red-500/35 text-red-500 hover:bg-red-500/20 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-all disabled:opacity-50"
                                >
                                  {actionLoadingId === `event-mod-${event.id}` ? 'Cancelling...' : 'Cancel'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'queries_log' ? (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-wrap gap-4 items-center justify-between border-b border-[var(--bg-border)]/20 pb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                    <span className="material-symbols-outlined">question_answer</span>
                    <span>Escalated Volunteer Queries Log</span>
                  </h3>
                  <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">
                    Manage escalated staff issues, GDPR deletion requests, and field complaints.
                  </p>
                </div>
                <button
                  onClick={handleExportQueriesToCSV}
                  disabled={filteredQueries.length === 0}
                  className="bg-[var(--life-teal)] text-white hover:bg-[var(--life-teal-dim)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Export CSV
                </button>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3 items-center flex-1 max-w-md bg-[var(--bg-elevated)] px-3 py-2 rounded-xl border border-[var(--bg-border)]/50">
                  <span className="material-symbols-outlined text-[var(--empire-cream)]/30 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Search query log by text, ID, or volunteer ID..."
                    value={querySearch}
                    onChange={(e) => setQuerySearch(e.target.value)}
                    className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/35"
                  />
                </div>

                <select
                  value={queryStatusFilter}
                  onChange={(e) => setQueryStatusFilter(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-xl px-3 py-1.5 font-body text-xs text-[var(--empire-cream)] outline-none"
                >
                  <option value="active">Active (Pending/Proposed)</option>
                  <option value="archive">Archived (Closed/Resolved)</option>
                  <option value="all">All Resolutions</option>
                  <option value="pending">Pending Only</option>
                  <option value="solved">Proposed Only</option>
                  <option value="closed">Closed Only</option>
                  <option value="resolved">Resolved Only</option>
                </select>
              </div>

              {filteredQueries.length === 0 ? (
                <div className="py-16 text-center text-[var(--empire-cream)]/40 font-body text-xs">
                  No active queries found in the system.
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1 dashboard-scroll-area">
                  {filteredQueries.map((q) => {
                    const isShifted = q.message.includes('[SHIFTED_TO_ADMIN:');
                    const isModToAdmin = q.message.includes('[MODERATOR_QUERY_TO_ADMIN]');

                    let displayMessage = q.message;
                    let shiftReason = '';
                    if (isShifted) {
                      const parts = q.message.split('[SHIFTED_TO_ADMIN:');
                      displayMessage = parts[0].trim();
                      shiftReason = parts[1].replace(']', '').trim();
                    } else if (isModToAdmin) {
                      displayMessage = q.message.replace('[MODERATOR_QUERY_TO_ADMIN]', '').trim();
                    }

                    return (
                      <div
                        key={q.id}
                        className="bg-[var(--bg-elevated)]/40 border border-[var(--bg-border)]/45 p-5 rounded-2xl flex flex-col gap-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="w-full">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 font-data">
                                Query #{q.id.slice(0, 8)}
                              </span>
                              <span
                                className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded-md ${q.status === 'closed'
                                    ? 'bg-zinc-500/10 border-zinc-500/25 text-zinc-500'
                                    : q.status === 'solved'
                                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 animate-pulse'
                                      : q.status === 'resolved'
                                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                                        : 'bg-amber-500/10 border-amber-500/25 text-amber-600'
                                  }`}
                              >
                                {q.status}
                              </span>
                              <span className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 text-[9px] font-bold text-[var(--empire-cream)]/75 rounded-md uppercase font-body">
                                Target: {q.target_type} ({q.target_id || 'General'})
                              </span>
                              {isModToAdmin && (
                                <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[9px] font-bold uppercase rounded-md">
                                  🛡️ Moderator to Admin Query
                                </span>
                              )}
                              {isShifted && (
                                <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-bold uppercase rounded-md">
                                  👑 Shifted to Admin
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-[9px] px-2 py-0.5 bg-[var(--bg-surface)]/60 border border-[var(--bg-border)]/30 rounded-md font-mono text-[var(--empire-cream)]/50">
                                For Volunteer: {q.volunteer_id}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 bg-[var(--bg-surface)]/60 border border-[var(--bg-border)]/30 rounded-md font-mono text-[var(--empire-cream)]/50">
                                Raised By Mod: {q.moderator_id || 'Direct/Admin'}
                              </span>
                              {(q.status === 'resolved' || q.status === 'closed') && (
                                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded-md font-mono text-emerald-400">
                                  Solved By: {q.moderator_id || 'System Admin'}
                                </span>
                              )}
                            </div>

                            <p className="font-body text-xs font-semibold text-[var(--empire-cream)] mt-3 leading-relaxed">
                              {displayMessage}
                            </p>
                            {isShifted && shiftReason && (
                              <div className="mt-3 bg-rose-500/5 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-[11px] font-medium flex flex-col gap-1">
                                <span className="font-bold flex items-center gap-1 text-rose-400">
                                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                                  Escalation Reason:
                                </span>
                                <p className="mt-1 leading-relaxed">{shiftReason}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {q.status === 'resolved' || q.status === 'closed' || q.status === 'solved' ? (
                          <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-xl">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                              Resolution Action Details
                            </div>
                            <p className="font-body text-xs text-[var(--empire-cream)]/75 mt-1 leading-relaxed">
                              {q.response || 'Inquiry resolved and closed.'}
                            </p>
                          </div>
                        ) : (
                          q.status === 'pending' && (
                            <div className="flex gap-2.5 justify-end pt-3 border-t border-[var(--bg-border)]/15" onClick={(e) => e.stopPropagation()}>
                              {resolvingQueryId === q.id ? (
                                <div className="w-full flex flex-col gap-2">
                                  <textarea
                                    value={queryResolutionText}
                                    onChange={(e) => setQueryResolutionText(e.target.value)}
                                    placeholder="Enter query response/resolution note..."
                                    className="w-full bg-[var(--bg-surface)] border border-[var(--bg-border)]/50 rounded-xl p-2.5 font-body text-xs text-[var(--empire-cream)] outline-none"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      disabled={actionLoadingId === `query-resolve-${q.id}`}
                                      onClick={() => handleResolveQuery(q.id)}
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-body text-[10px] font-bold uppercase cursor-pointer disabled:opacity-50"
                                    >
                                      {actionLoadingId === `query-resolve-${q.id}` ? 'Resolving...' : 'Resolve'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setResolvingQueryId(null)}
                                      className="px-3 py-1.5 bg-[var(--bg-border)] hover:bg-[var(--bg-border)]/65 text-[var(--empire-cream)]/75 rounded-lg font-body text-[10px] font-bold uppercase cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  disabled={actionLoadingId !== null}
                                  onClick={() => {
                                    setResolvingQueryId(q.id);
                                    setQueryResolutionText('');
                                  }}
                                  className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all disabled:opacity-50"
                                >
                                  ✓ Mark Resolved
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'gamification' ? (
            <div className="flex flex-col gap-6 animate-fade-in">
              <AdminGamificationClient
                initialTrivia={trivia}
                initialBingo={bingo}
                initialGuilds={guilds}
              />
            </div>
          ) : activeTab === 'audits' ? (
            <FuturisticAuditDashboard
              initialAuditLogs={auditLogs as any}
              currentUserRole="admin"
            />
          ) : activeTab === 'gdpr' ? (
            <>
              {/* Audits info alert */}
              <div className="bg-[#fff9db] border border-[#ffe066] rounded-xl p-4 text-[#8f6a00] font-body text-xs leading-relaxed flex items-start gap-2.5">
                <span className="material-symbols-outlined text-lg mt-0.5">info</span>
                <div>
                  <span className="font-bold">GDPR Article 17 Erasure Compliance:</span> Hashed user IDs (SHA-256) are preserved for legal defense records in the audit ledger without exposing any PII (Personally Identifiable Information).
                </div>
              </div>

              {/* List */}
              {audits.length === 0 ? (
                <div className="py-12 text-center text-[var(--empire-cream)]/40 font-body text-xs">
                  No account erasure requests logged in the compliance record.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">Audit ID</th>
                        <th className="py-3 px-4">Anonymized User Hash (SHA-256)</th>
                        <th className="py-3 px-4 text-right">Erasure Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((audit) => (
                        <tr
                          key={audit.id}
                          className="border-b border-[var(--bg-border)]/30 hover:bg-[var(--bg-elevated)]/20 transition-colors"
                        >
                          <td className="py-4 px-4 font-body text-[10px] text-[var(--empire-cream)]/40 font-semibold">
                            {audit.id}
                          </td>
                          <td className="py-4 px-4 font-body text-[10px] text-[var(--empire-cream)]/65 font-bold font-mono">
                            {audit.user_hash}
                          </td>
                          <td className="py-4 px-4 text-right font-body text-[10px] text-[var(--empire-cream)]/50 font-semibold">
                            {formatUTCDateTime(audit.requested_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : activeTab === 'database' ? (
            <>
              {/* Database size estimate */}
              <div className="flex flex-col gap-6">
                <h2 className="font-display text-sm font-bold text-[var(--empire-cream)]">Schema Table Size Breakdown</h2>

                {isMounted && (
                  <div className="bg-[var(--bg-elevated)]/40 border border-[var(--bg-border)]/45 p-5 rounded-2xl shadow-sm">
                    <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]/75 mb-3">Relative Size by Row Count</h4>
                    <div className="w-full h-48">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <RechartsBarChart data={databaseSizeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.2} />
                          <XAxis type="number" stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-data)" />
                          <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-body)" width={120} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="rows" name="Row Count" radius={[0, 4, 4, 0]}>
                            {databaseSizeData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">Relation Name</th>
                        <th className="py-3 px-4">Row Count</th>
                        <th className="py-3 px-4">Storage Overhead</th>
                        <th className="py-3 px-4 text-right">Encryption status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[var(--bg-border)]/30">
                        <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">public.profiles</td>
                        <td className="py-3 px-4 font-data text-xs">{stats.userCount} rows</td>
                        <td className="py-3 px-4 font-body text-xs text-[var(--empire-cream)]/60">~ 16 KB</td>
                        <td className="py-3 px-4 text-right text-green-600 font-body text-[10px] font-bold uppercase">SSL Encrypted</td>
                      </tr>
                      <tr className="border-b border-[var(--bg-border)]/30">
                        <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">public.cats</td>
                        <td className="py-3 px-4 font-data text-xs">{stats.catCount} rows</td>
                        <td className="py-3 px-4 font-body text-xs text-[var(--empire-cream)]/60">~ 64 KB (GIST Indexed)</td>
                        <td className="py-3 px-4 text-right text-green-600 font-body text-[10px] font-bold uppercase">SSL Encrypted</td>
                      </tr>
                      <tr className="border-b border-[var(--bg-border)]/30">
                        <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">public.tnr_events</td>
                        <td className="py-3 px-4 font-data text-xs">{stats.eventCount} rows</td>
                        <td className="py-3 px-4 font-body text-xs text-[var(--empire-cream)]/60">~ 32 KB</td>
                        <td className="py-3 px-4 text-right text-green-600 font-body text-[10px] font-bold uppercase">SSL Encrypted</td>
                      </tr>
                      <tr className="border-b border-[var(--bg-border)]/30">
                        <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">public.erasure_audit</td>
                        <td className="py-3 px-4 font-data text-xs">{stats.erasureCount} rows</td>
                        <td className="py-3 px-4 font-body text-xs text-[var(--empire-cream)]/60">~ 8 KB</td>
                        <td className="py-3 px-4 text-right text-green-600 font-body text-[10px] font-bold uppercase">SSL Encrypted</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'live' ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--bg-border)]/25 pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span>Live Website Activity Feed</span>
                  </h3>
                  <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">Real-time timeline of user actions, chat posts, and cat sightings.</p>
                </div>
                <span className="font-body text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 select-none">
                  <span className="material-symbols-outlined text-[10px] animate-pulse">sensors</span>
                  Connection Active
                </span>
              </div>

              {liveActivities.length === 0 ? (
                <div className="py-16 text-center text-[var(--empire-cream)]/40 font-body text-xs flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-[var(--empire-gold)]">progress_activity</span>
                  <span>Awaiting live events...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                  {liveActivities.map((act) => (
                    <div key={act.id} className="flex gap-3 items-start p-3 bg-[var(--bg-elevated)]/35 border border-[var(--bg-border)]/20 rounded-xl hover:border-[var(--empire-gold)]/30 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--empire-gold)] border border-[var(--bg-border)]/50 shrink-0">
                        <span className="material-symbols-outlined text-lg">
                          {act.type === 'chat' ? 'chat' : act.type === 'cat' ? 'pets' : act.type === 'event' ? 'event' : 'military_tech'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 font-body text-xs text-[var(--empire-cream)]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {act.actorId ? (
                            <button
                              onClick={() => handleOpenProfileById(act.actorId)}
                              className="font-bold text-[var(--empire-cream)] hover:underline border-none bg-transparent cursor-pointer p-0 text-left outline-none"
                            >
                              {act.actorName}
                            </button>
                          ) : (
                            <span className="font-bold text-[var(--empire-cream)]">{act.actorName}</span>
                          )}
                          <span className="text-[10px] text-[var(--empire-cream)]/45">
                            {formatUTCDateTime(act.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-[var(--empire-cream)]/75 leading-relaxed">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'settings' ? (
            <div className="flex flex-col gap-6">
              <div className="border-b border-[var(--bg-border)]/25 pb-3">
                <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">settings</span>
                  <span>Global System Settings</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">Real-time control over application values, weather safety thresholds, and gamification multipliers.</p>
              </div>

              {settingsError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm font-bold">info</span>
                  <span>{settingsError}</span>
                </div>
              )}
              {settingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                  <span>{settingsSuccess}</span>
                </div>
              )}

              <div className="flex flex-col gap-5">
                {systemSettings.map((setting) => {
                  const isUpdatingSetting = updatingSetting === setting.key;
                  return (
                    <div key={setting.key} className="p-5 rounded-2xl border border-[var(--bg-border)]/30 bg-[var(--bg-elevated)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-data text-xs font-extrabold text-[var(--empire-gold)]">{setting.key}</h4>
                        <p className="font-body text-xs text-[var(--empire-cream)]/60 mt-1">{setting.description}</p>
                        <span className="text-[9px] font-body text-[var(--empire-cream)]/40 block mt-1.5 uppercase font-medium">Last updated: {new Date(setting.updated_at).toLocaleString()}</span>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        {typeof setting.value === 'boolean' ? (
                          <button
                            onClick={() => handleUpdateSetting(setting.key, !setting.value)}
                            disabled={isUpdatingSetting}
                            className={`px-4 py-2 rounded-xl font-display text-xs font-bold tracking-wide transition-all cursor-pointer border ${setting.value
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                                : 'bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/20'
                              }`}
                          >
                            {isUpdatingSetting ? 'Updating...' : setting.value ? 'Active / Enabled' : 'Inactive / Disabled'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              defaultValue={setting.value}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val !== setting.value) {
                                  handleUpdateSetting(setting.key, val);
                                }
                              }}
                              disabled={isUpdatingSetting}
                              className="w-24 p-2 border border-[var(--bg-border)] rounded-xl font-data text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)] text-center"
                            />
                            <span className="text-xs text-[var(--empire-cream)]/50 font-bold font-body">value</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'management' ? (
            <div className="flex flex-col gap-6">
              <div className="border-b border-[var(--bg-border)]/25 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">shield</span>
                    <span>Supreme Data Management</span>
                  </h3>
                  <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">Direct read/write control and hard deletes for all primary database records.</p>
                </div>
                <div className="flex bg-[var(--bg-elevated)]/40 p-1 rounded-xl border border-[var(--bg-border)]/40 shrink-0">
                  {(['cats', 'colonies', 'events', 'guilds'] as const).map((entity) => (
                    <button
                      key={entity}
                      onClick={() => setActiveManageEntity(entity)}
                      className={`px-3 py-1.5 rounded-lg font-display text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-0 ${activeManageEntity === entity
                          ? 'bg-[var(--empire-gold)] text-white shadow-sm font-black'
                          : 'text-[var(--empire-cream)]/60 hover:text-[var(--empire-cream)] hover:bg-[var(--bg-surface)]/20'
                        }`}
                    >
                      {entity}
                    </button>
                  ))}
                </div>
              </div>

              {manageError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm font-bold">info</span>
                  <span>{manageError}</span>
                </div>
              )}
              {manageSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                  <span>{manageSuccess}</span>
                </div>
              )}

              {loadingManageData ? (
                <div className="py-20 text-center text-[var(--empire-cream)]/40 font-body text-xs flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-[var(--empire-gold)]">progress_activity</span>
                  <span>Querying database records...</span>
                </div>
              ) : activeManageEntity === 'cats' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">Photo</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Breed</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Medical</th>
                        <th className="py-3 px-4">Date Logged</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catsList.map((cat) => (
                        <tr key={cat.id} className="border-b border-[var(--bg-border)]/20 hover:bg-[var(--bg-elevated)]/10">
                          <td className="py-3 px-4">
                            {cat.photo_url ? (
                              <img src={cat.photo_url} alt={cat.name} className="w-8 h-8 rounded-lg object-cover border border-[var(--bg-border)]/50" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)]/60 flex items-center justify-center text-[var(--empire-cream)]/45">
                                <span className="material-symbols-outlined text-sm">pets</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">{cat.name || 'Unnamed'}</td>
                          <td className="py-3 px-4 font-body text-xs text-[var(--empire-cream)]/70">{cat.breed_estimate || 'Unknown'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider ${cat.status === 'stray' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                cat.status === 'adopted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>{cat.status}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              {cat.sterilized && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20 font-bold uppercase">Sterilized</span>}
                              {cat.vaccinated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 font-bold uppercase">Vax</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-data text-xs text-[var(--empire-cream)]/65">{formatUTCDate(cat.created_at)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditCatClick(cat)}
                                className="px-2 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)] border border-[var(--bg-border)]/50 text-[10px] font-bold text-[var(--empire-cream)] cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCat(cat.id)}
                                className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-bold text-red-400 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeManageEntity === 'colonies' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">Colony Name</th>
                        <th className="py-3 px-4">Caretaker ID</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Date Formed</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coloniesList.map((colony) => (
                        <tr key={colony.id} className="border-b border-[var(--bg-border)]/20 hover:bg-[var(--bg-elevated)]/10">
                          <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">{colony.name}</td>
                          <td className="py-3 px-4 font-data text-xs text-[var(--empire-cream)]/60">{colony.caretaker_id || 'None'}</td>
                          <td className="py-3 px-4 font-body text-xs text-[var(--empire-cream)]/75">
                            {colony.location ? (
                              <span className="font-data text-[10px]">fuzzed coordinates</span>
                            ) : (
                              'No coordinates'
                            )}
                          </td>
                          <td className="py-3 px-4 font-data text-xs text-[var(--empire-cream)]/65">{formatUTCDate(colony.created_at)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteColony(colony.id)}
                              className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-bold text-red-400 cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeManageEntity === 'events' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">Campaign Title</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Capacity</th>
                        <th className="py-3 px-4">Event Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsList.map((ev) => (
                        <tr key={ev.id} className="border-b border-[var(--bg-border)]/20 hover:bg-[var(--bg-elevated)]/10">
                          <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">{ev.title}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider ${ev.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                ev.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>{ev.status}</span>
                          </td>
                          <td className="py-3 px-4 font-data text-xs text-[var(--empire-cream)]/70">{ev.capacity} volunteers max</td>
                          <td className="py-3 px-4 font-data text-xs text-[var(--empire-cream)]/65">{formatUTCDate(ev.event_time)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-bold text-red-400 cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                        <th className="py-3 px-4">Guild Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Minimum Points</th>
                        <th className="py-3 px-4">Date Formed</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guildsList.map((guild) => (
                        <tr key={guild.id} className="border-b border-[var(--bg-border)]/20 hover:bg-[var(--bg-elevated)]/10">
                          <td className="py-3 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">{guild.name}</td>
                          <td className="py-3 px-4 font-body text-xs text-[var(--empire-cream)]/70 capitalize">{guild.category}</td>
                          <td className="py-3 px-4 font-data text-xs text-emerald-400">{guild.min_points_required} pts required</td>
                          <td className="py-3 px-4 font-data text-xs text-[var(--empire-cream)]/65">{formatUTCDate(guild.created_at)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteGuild(guild.id)}
                              className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-bold text-red-400 cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Selected Volunteer Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedProfile(null)} />
          <div className="relative w-full max-w-3xl bg-[var(--bg-surface)] border border-[var(--bg-border)]/50 shadow-[0_0_50px_rgba(212,163,89,0.15)] rounded-2xl overflow-hidden z-10 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[var(--bg-border)]/20 pb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--empire-gold)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">account_circle</span>
                  <span>Volunteer Profile Details</span>
                </h2>
                <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">
                  ID: {selectedProfile.id} · Joined: {formatUTCDate(selectedProfile.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
                className="p-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] transition-colors cursor-pointer bg-transparent border-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 border border-[var(--bg-border)]/30 rounded-xl p-4 bg-[var(--bg-elevated)]/50">
              <div className="text-center">
                <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase block">Role</span>
                <span className="font-body text-xs font-extrabold text-[var(--empire-gold)] capitalize">{selectedProfile.role}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase block">Empire Points</span>
                <span className="font-data text-xs font-black text-emerald-400">{selectedProfile.empire_points} pts</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase block">Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider ${selectedProfile.is_enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                  {selectedProfile.is_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            {((selectedProfile.password_expires_at && new Date(selectedProfile.password_expires_at) < new Date()) ||
              (selectedProfile.max_usages !== null && selectedProfile.max_usages !== undefined &&
                (selectedProfile.usages_count ?? 0) >= selectedProfile.max_usages)) ? (
              <div className="text-center font-body text-xs py-2 px-4 rounded-xl border bg-red-500/10 text-red-400 border-red-500/20 font-bold">
                {selectedProfile.password_expires_at && new Date(selectedProfile.password_expires_at) < new Date()
                  ? `⚠️ Account Expired on: ${new Date(selectedProfile.password_expires_at).toLocaleString()}`
                  : `⚠️ Account locked: usage limit of ${selectedProfile.max_usages} reached.`}
              </div>
            ) : selectedProfile.password_expires_at ? (
              <div className="text-center font-body text-xs py-2 px-4 rounded-xl border bg-amber-500/10 text-amber-400 border-amber-500/20">
                ⏳ Trial Timer Expires on: {new Date(selectedProfile.password_expires_at).toLocaleString()}
              </div>
            ) : null}

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">
                    Display Name
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)] font-normal normal-case"
                    />
                  </label>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">
                    Preferred Role Focus
                    <input
                      type="text"
                      value={editRoleFocus}
                      onChange={(e) => setEditRoleFocus(e.target.value)}
                      placeholder="e.g. Trapper, Feeder"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)] font-normal normal-case"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Volunteer Bio</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-3 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Location Neighborhood</label>
                  <input
                    type="text"
                    value={editNeighborhood}
                    onChange={(e) => setEditNeighborhood(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)]"
                  />
                </div>
              </div>

              {/* Admin-only Account Credentials & Limits Editor */}
              <div className="border-t border-[var(--bg-border)]/20 pt-4 mt-2">
                <h3 className="font-display text-sm font-bold text-[var(--empire-gold)] mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">key</span>
                  <span>Credentials & Expiration (Admin Control Only)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Set New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password (min 6 chars)"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Expiration Date/Time</label>
                    <input
                      type="datetime-local"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Usage Limit (Max logins)</label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={editMaxUsages}
                      onChange={(e) => setEditMaxUsages(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-center mt-3 bg-[var(--bg-elevated)]/50 border border-[var(--bg-border)]/20 p-3 rounded-xl">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase block">Usage Status</span>
                    <span className="font-body text-xs text-[var(--empire-cream)]">
                      Logged in: <strong className="text-[var(--empire-gold)]">{editUsagesCount}</strong> times {editMaxUsages !== '' ? `(Limit: ${editMaxUsages})` : '(No limit)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditUsagesCount(0);
                      showNotification('success', 'Usages count reset. Save changes to commit.');
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/50 rounded-lg font-body text-[10px] font-bold uppercase cursor-pointer transition-all"
                  >
                    Reset Counter
                  </button>
                </div>
              </div>

              {/* Volunteer Activity Ledger */}
              <div className="border-t border-[var(--bg-border)]/20 pt-4 mt-2">
                <h3 className="font-display text-sm font-bold text-[var(--empire-gold)] mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">analytics</span>
                  <span>Volunteer Activity Ledger</span>
                </h3>

                {loadingActivity ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <span className="material-symbols-outlined text-2xl animate-spin text-[var(--empire-gold)]">progress_activity</span>
                    <span className="font-body text-xs text-[var(--empire-cream)]/50">Retrieving audit activity summary...</span>
                  </div>
                ) : profileActivity ? (
                  <div className="flex flex-col gap-4">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-[var(--bg-elevated)]/50 p-2.5 rounded-lg border border-[var(--bg-border)]/20">
                        <span className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase block">Cats Logged</span>
                        <span className="font-data text-sm font-extrabold text-[var(--empire-cream)]">{profileActivity.cats.length}</span>
                      </div>
                      <div className="bg-[var(--bg-elevated)]/50 p-2.5 rounded-lg border border-[var(--bg-border)]/20">
                        <span className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase block">Events Run</span>
                        <span className="font-data text-sm font-extrabold text-[var(--empire-cream)]">{profileActivity.organizedEvents.length}</span>
                      </div>
                      <div className="bg-[var(--bg-elevated)]/50 p-2.5 rounded-lg border border-[var(--bg-border)]/20">
                        <span className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase block">Events Joined</span>
                        <span className="font-data text-sm font-extrabold text-[var(--empire-cream)]">{profileActivity.signups.length}</span>
                      </div>
                      <div className="bg-[var(--bg-elevated)]/50 p-2.5 rounded-lg border border-[var(--bg-border)]/20">
                        <span className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase block">Audit Trails</span>
                        <span className="font-data text-sm font-extrabold text-[var(--empire-cream)]">{profileActivity.auditLogs.length}</span>
                      </div>
                    </div>

                    {/* Detailed Lists tabs/sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
                      {/* Cats */}
                      <div className="border border-[var(--bg-border)]/20 rounded-xl p-3 bg-[var(--bg-elevated)]/10">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--empire-cream)]/40 block mb-2">Cats Sighted</span>
                        {profileActivity.cats.length === 0 ? (
                          <div className="text-[10px] text-[var(--empire-cream)]/30 italic">No cats reported yet.</div>
                        ) : (
                          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                            {profileActivity.cats.map((c) => (
                              <li key={c.id} className="flex justify-between items-center text-[10px] bg-[var(--bg-elevated)]/30 px-2 py-1 rounded border border-[var(--bg-border)]/20">
                                <span className="font-semibold truncate max-w-[150px]">{c.name || 'Unnamed Cat'}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${c.status === 'stray' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>{c.status}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Events Organized/Attended */}
                      <div className="border border-[var(--bg-border)]/20 rounded-xl p-3 bg-[var(--bg-elevated)]/10">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--empire-cream)]/40 block mb-2">TNR Operations</span>
                        {profileActivity.organizedEvents.length === 0 && profileActivity.signups.length === 0 ? (
                          <div className="text-[10px] text-[var(--empire-cream)]/30 italic">No event history found.</div>
                        ) : (
                          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                            {profileActivity.organizedEvents.map((e) => (
                              <li key={e.id} className="flex justify-between items-center text-[10px] bg-amber-500/5 px-2 py-1 rounded border border-amber-500/20">
                                <span className="font-semibold truncate max-w-[150px] text-amber-400">👑 {e.title}</span>
                                <span className="text-[8px] font-bold uppercase text-amber-400/80">Organizer</span>
                              </li>
                            ))}
                            {profileActivity.signups.map((s) => (
                              <li key={s.id} className="flex justify-between items-center text-[10px] bg-teal-500/5 px-2 py-1 rounded border border-teal-500/20">
                                <span className="font-semibold truncate max-w-[150px] text-teal-400">🐾 {s.title}</span>
                                <span className="text-[8px] font-bold uppercase text-teal-400/80">Attended</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Moderator Applications History */}
                      <div className="border border-[var(--bg-border)]/20 rounded-xl p-3 bg-[var(--bg-elevated)]/10">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--empire-cream)]/40 block mb-2">Staff Application History</span>
                        {profileActivity.applications.length === 0 ? (
                          <div className="text-[10px] text-[var(--empire-cream)]/30 italic">No applications submitted.</div>
                        ) : (
                          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                            {profileActivity.applications.map((a) => (
                              <li key={a.id} className="flex flex-col gap-1 text-[10px] bg-[var(--bg-elevated)]/30 px-2.5 py-1.5 rounded border border-[var(--bg-border)]/20">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-[var(--empire-cream)]/50">{formatUTCDate(a.created_at)}</span>
                                  <span className={`px-1 rounded text-[8px] font-bold uppercase ${a.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      a.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>{a.status}</span>
                                </div>
                                <p className="italic text-[9px] text-[var(--empire-cream)]/75 mt-0.5 line-clamp-2">&quot;{a.reason}&quot;</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Audit Logs */}
                      <div className="border border-[var(--bg-border)]/20 rounded-xl p-3 bg-[var(--bg-elevated)]/10">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--empire-cream)]/40 block mb-2">Recent System Audits</span>
                        {profileActivity.auditLogs.length === 0 ? (
                          <div className="text-[10px] text-[var(--empire-cream)]/30 italic">No system actions logged.</div>
                        ) : (
                          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                            {profileActivity.auditLogs.map((l) => (
                              <li key={l.id} className="flex flex-col gap-0.5 text-[9px] bg-[var(--bg-elevated)]/30 px-2 py-1 rounded border border-[var(--bg-border)]/20 font-mono">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-[8px] text-[var(--empire-gold)] uppercase">{l.action.replace('_', ' ')}</span>
                                  <span className="text-[8px] text-[var(--empire-cream)]/45">{formatUTCDate(l.created_at)}</span>
                                </div>
                                {l.details && <span className="text-[8px] text-[var(--empire-cream)]/60 italic truncate mt-0.5">{l.details}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-[var(--empire-cream)]/45 italic text-center py-6">Could not load activity records.</div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-[var(--bg-border)]/20 pt-4 mt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionLoading === 'toggle-enable'}
                    onClick={handleToggleProfileEnablement}
                    className={`px-4 py-2 border rounded-xl font-body text-xs font-bold uppercase cursor-pointer transition-all ${selectedProfile.is_enabled
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                  >
                    {actionLoading === 'toggle-enable' ? 'Processing...' : (selectedProfile.is_enabled ? 'Disable Profile' : 'Enable Profile')}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === 'delete-user'}
                    onClick={() => handleDeleteUser(selectedProfile.id)}
                    className="px-4 py-2 bg-red-950 text-red-400 border border-red-800/40 hover:bg-red-900 rounded-xl font-body text-xs font-bold uppercase cursor-pointer transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'delete-user' ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProfile(null)}
                    className="px-4 py-2 bg-transparent text-[var(--empire-cream)]/50 hover:bg-[var(--bg-elevated)] rounded-xl border border-transparent cursor-pointer font-body text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'save-profile'}
                    className="px-4 py-2 bg-[var(--empire-gold)] text-black rounded-xl hover:bg-[#e6b020] cursor-pointer font-body text-xs font-bold uppercase transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'save-profile' ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Dialog */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsAddUserOpen(false)} />
          <div
            className="relative w-full max-w-2xl bg-[var(--bg-surface)] rounded-3xl border border-[var(--bg-border)] shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden z-10 p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsAddUserOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer border-none bg-transparent"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Header */}
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[var(--empire-gold)] flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
                <span>Create User Account</span>
              </h2>
              <p className="font-body text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Create a direct Supabase authentication credential account — independent of Clerk. Set custom security policies, expiry, and login constraints.
              </p>
            </div>

            <form onSubmit={handleAddUserSubmit} className="flex flex-col gap-6">

              {/* Section 1: Account Information */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-2">
                  <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">badge</span>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]/80">Account Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-email" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">mail</span>
                      <input
                        id="user-email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
                      />
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-name" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Display Name</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">person</span>
                      <input
                        id="user-name"
                        type="text"
                        required
                        placeholder="Jane Doe"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* System Role */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-role" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">System Role</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">shield_person</span>
                      <select
                        id="user-role"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'user' | 'moderator' | 'admin')}
                        className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] font-semibold cursor-pointer appearance-none"
                      >
                        <option value="user">Standard User / Volunteer</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-password" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      Password <span className="text-[var(--text-secondary)]/60 lowercase italic">(blank to auto-generate)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">key</span>
                      <input
                        id="user-password"
                        type="password"
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Expiry & Security Policy */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-[var(--bg-border)]/20 pb-2">
                  <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">security</span>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]/80">Security & Expiry Controls</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Expiry Type */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-expiry-type" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Account Expiry Policy</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">timer</span>
                      <select
                        id="user-expiry-type"
                        value={newExpiryType}
                        onChange={(e) => setNewExpiryType(e.target.value as 'none' | 'hours' | 'custom')}
                        className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] font-semibold cursor-pointer appearance-none"
                      >
                        <option value="none">No Expiry (Permanent)</option>
                        <option value="hours">Expires After N Hours</option>
                        <option value="custom">Custom Expiry Date &amp; Time</option>
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  {/* Max Usages */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-max-usages" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      Max Login Limit <span className="text-[var(--text-secondary)]/60 lowercase italic">(blank = unlimited)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 material-symbols-outlined text-base pointer-events-none">login</span>
                      <input
                        id="user-max-usages"
                        type="number"
                        min="1"
                        placeholder="e.g. 5"
                        value={newMaxUsages}
                        onChange={(e) => setNewMaxUsages(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Conditional expiry hours input */}
                {newExpiryType === 'hours' && (
                  <div className="flex flex-col gap-1.5 animate-fade-in pl-4 border-l-2 border-[var(--empire-gold)]">
                    <label htmlFor="user-expiry-hours" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Hours Until Expiry</label>
                    <input
                      id="user-expiry-hours"
                      type="number"
                      min="1"
                      placeholder="e.g. 24"
                      value={newExpiryHours || ''}
                      onChange={(e) => setNewExpiryHours(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
                    />
                    <p className="text-[9px] text-[var(--text-secondary)]/60">Account will auto-expire and lock exactly N hours from creation time.</p>
                  </div>
                )}

                {/* Conditional custom expiry datetime */}
                {newExpiryType === 'custom' && (
                  <div className="flex flex-col gap-1.5 animate-fade-in pl-4 border-l-2 border-[var(--empire-gold)]">
                    <label htmlFor="user-expiry-date" className="font-display font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Expiry Date &amp; Time</label>
                    <input
                      id="user-expiry-date"
                      type="datetime-local"
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
                    />
                    <p className="text-[9px] text-[var(--text-secondary)]/60">Account will lock after this specific date/time (local timezone).</p>
                  </div>
                )}

                {/* Bypass Email Verification toggle */}
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setNewBypassVerification(!newBypassVerification)}
                    className={`relative mt-0.5 flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200 cursor-pointer border ${newBypassVerification
                        ? 'bg-[var(--life-teal)] border-[var(--life-teal)]'
                        : 'bg-[var(--bg-border)] border-[var(--bg-border)]'
                      }`}
                    aria-label="Toggle bypass email verification"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${newBypassVerification ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-display text-xs font-bold text-[var(--text-primary)]">
                      Bypass Email Verification
                    </span>
                    <span className="font-body text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      {newBypassVerification
                        ? '✓ Account activated immediately — no verification email sent. User can sign in right away.'
                        : '✉ Supabase will send a verification email. Account remains locked until they verify.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-[var(--bg-elevated)]/40 border border-[var(--bg-border)]/30 rounded-xl p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-[var(--empire-gold)] mt-0.5">info</span>
                <p className="font-body text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Display name is automatically converted to a unique slug for system identification (e.g. &quot;Jane Doe&quot; → <code className="font-mono">jane_doe</code>).
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 border-t border-[var(--bg-border)]/20 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-5 py-2.5 bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--bg-border)] rounded-xl font-display text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-user'}
                  className="px-6 py-2.5 bg-[var(--empire-gold)] text-white hover:bg-[var(--empire-gold-dim)] rounded-xl font-display text-xs font-bold uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-ambient border-none"
                >
                  {actionLoading === 'add-user' ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">person_add</span>
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cat sighting Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setEditingCat(null)} />
          <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--bg-border)]/50 shadow-[0_0_50px_rgba(212,163,89,0.15)] rounded-2xl overflow-hidden z-10 p-6 flex flex-col gap-5">
            <div className="flex justify-between items-start border-b border-[var(--bg-border)]/20 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">pets</span>
                  <span>Edit Cat Details (Admin Override)</span>
                </h2>
                <p className="font-body text-[9px] text-[var(--empire-cream)]/50 mt-0.5">ID: {editingCat.id}</p>
              </div>
              <button
                onClick={() => setEditingCat(null)}
                className="p-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] transition-colors cursor-pointer bg-transparent border-0"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateCatSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Cat Name</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full mt-1 p-2 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Breed Sighting Estimate</label>
                <input
                  type="text"
                  value={catForm.breed_estimate}
                  onChange={(e) => setCatForm({ ...catForm, breed_estimate: e.target.value })}
                  className="w-full mt-1 p-2 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Status</label>
                <select
                  value={catForm.status}
                  onChange={(e) => setCatForm({ ...catForm, status: e.target.value })}
                  className="w-full mt-1 p-2 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)]"
                >
                  <option value="stray">Stray</option>
                  <option value="adopted">Adopted</option>
                  <option value="sheltered">Sheltered</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Health Notes</label>
                <textarea
                  value={catForm.health_notes || ''}
                  onChange={(e) => setCatForm({ ...catForm, health_notes: e.target.value })}
                  className="w-full mt-1 p-2 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)]"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 border border-[var(--bg-border)] rounded-xl text-xs font-bold text-[var(--empire-cream)]/60 hover:bg-[var(--bg-elevated)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--empire-gold)] to-orange-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED CAT MODAL */}
      {selectedCat && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => setSelectedCat(null)} />
          <div className="relative bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)]/50 shadow-ambient max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 z-10 flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4 border-b border-[var(--bg-border)]/20 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--empire-cream)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)]">pets</span>
                  <span>{selectedCat.name || 'Unnamed Cat'}</span>
                </h2>
                <div className="text-[10px] text-[var(--empire-cream)]/50 mt-0.5 font-data select-all">
                  Sighting ID: {selectedCat.id}
                </div>
              </div>
              <button
                onClick={() => setSelectedCat(null)}
                className="text-[var(--empire-cream)]/40 hover:text-[var(--empire-cream)] transition-colors cursor-pointer bg-transparent border-0"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                {selectedCat.photo_url ? (
                  <img
                    src={selectedCat.photo_url}
                    alt={selectedCat.name}
                    className="w-full aspect-square rounded-2xl object-cover border border-[var(--bg-border)] bg-[var(--bg-void)]"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-void)] flex flex-col items-center justify-center text-[var(--empire-cream)]/20 gap-2">
                    <span className="material-symbols-outlined text-5xl">pets</span>
                    <span className="text-xs">No image provided</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 text-xs font-body text-[var(--empire-cream)]">
                <div>
                  <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                    Verification
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-lg ${selectedCat.is_verified
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                          : 'bg-amber-500/10 border-amber-500/25 text-amber-600'
                        }`}
                    >
                      {selectedCat.is_verified ? 'Verified Report' : 'Awaiting Audit'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[var(--bg-border)]/20 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Breed
                    </span>
                    <p className="font-semibold mt-0.5">{selectedCat.breed_estimate || 'Unknown'}</p>
                    {selectedCat.breed_confidence !== null && selectedCat.breed_confidence !== undefined && (
                      <span className="text-[9px] font-data text-[var(--empire-cream)]/45">
                        Confidence: {(selectedCat.breed_confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Color / Coat
                    </span>
                    <p className="font-semibold mt-0.5">{selectedCat.color || 'Not Specified'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[var(--bg-border)]/20 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Age Est.
                    </span>
                    <p className="font-semibold mt-0.5">{selectedCat.age_estimate || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      BCS (Body Cond)
                    </span>
                    <p className="font-semibold mt-0.5">{selectedCat.bcs_estimate ?? 'Unknown'} / 9</p>
                  </div>
                </div>

                <div className="border-t border-[var(--bg-border)]/20 pt-3 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                    Clergy & Wellness Attributes
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${selectedCat.sterilized
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                        }`}
                    >
                      Sterilized
                    </span>
                    <span
                      className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${selectedCat.vaccinated
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                        }`}
                    >
                      Vaccinated
                    </span>
                    <span
                      className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${selectedCat.microchipped
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                        }`}
                    >
                      Microchipped
                    </span>
                  </div>
                </div>

                {selectedCat.health_notes && (
                  <div className="border-t border-[var(--bg-border)]/20 pt-3">
                    <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Health Flags & Notes
                    </span>
                    <p className="mt-1 leading-relaxed italic text-[var(--empire-cream)]/75">
                      {selectedCat.health_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-[var(--bg-border)]/20 pt-4">
              <button
                type="button"
                onClick={() => setSelectedCat(null)}
                className="px-4 py-2 bg-transparent text-[var(--empire-cream)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl font-display text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Close Details
              </button>

              <button
                type="button"
                onClick={() => handleToggleCatVerified(selectedCat.id, selectedCat.is_verified)}
                disabled={actionLoadingId === `cat-verify-${selectedCat.id}`}
                className={`px-4 py-2 border text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50 ${selectedCat.is_verified
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-600 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20'
                  }`}
              >
                {actionLoadingId === `cat-verify-${selectedCat.id}` ? 'Processing...' : (selectedCat.is_verified ? 'Unverify Sighting' : 'Verify Sighting')}
              </button>

              {selectedCat.owner_id && (
                <button
                  type="button"
                  onClick={() => {
                    setQueryModal({
                      open: true,
                      targetType: 'cat',
                      targetId: selectedCat.id,
                      volunteerId: selectedCat.owner_id!,
                    });
                  }}
                  className="px-4 py-2 bg-sky-500/10 border border-sky-500/35 text-sky-600 hover:bg-sky-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                >
                  Raise Query
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  await handleDeleteCat(selectedCat.id);
                  setSelectedCat(null);
                }}
                className="px-4 py-2 bg-red-500/10 border border-red-500/35 text-red-500 hover:bg-red-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
              >
                Delete Sighting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT & DETAIL TNR EVENT MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => { setSelectedEvent(null); setEditEventOpen(false); }} />
          <div className="relative bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)]/50 shadow-ambient max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 z-10 flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4 border-b border-[var(--bg-border)]/20 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--empire-cream)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)]">event</span>
                  <span>TNR Operation Details</span>
                </h2>
                <div className="text-[10px] text-[var(--empire-cream)]/50 mt-0.5 font-data select-all">
                  Event ID: {selectedEvent.id}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setEditEventOpen(false);
                }}
                className="text-[var(--empire-cream)]/40 hover:text-[var(--empire-cream)] transition-colors cursor-pointer bg-transparent border-0"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {editEventOpen ? (
              <form onSubmit={handleUpdateEvent} className="flex flex-col gap-4 text-xs font-body text-[var(--empire-cream)]">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={editEventTitle}
                    onChange={(e) => setEditEventTitle(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Description</label>
                  <textarea
                    rows={4}
                    value={editEventDescription}
                    onChange={(e) => setEditEventDescription(e.target.value)}
                    placeholder="Enter operation mission summary..."
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl p-3.5 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)] resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/20 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditEventOpen(false)}
                    className="px-4 py-2 bg-transparent border border-[var(--bg-border)] rounded-xl font-display text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Back to Info
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === 'event-update'}
                    className="px-4 py-2 bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === 'event-update' ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-xs font-body text-[var(--empire-cream)]">
                <div>
                  <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                    Event Title
                  </span>
                  <p className="text-sm font-bold mt-1 text-[var(--empire-cream)]">{selectedEvent.title}</p>
                </div>

                {selectedEvent.description && (
                  <div className="border-t border-[var(--bg-border)]/20 pt-3">
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Operation Description
                    </span>
                    <p className="mt-1 leading-relaxed text-[var(--empire-cream)]/75">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-[var(--bg-border)]/20 pt-3">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Date & Time (UTC)
                    </span>
                    <p className="font-semibold mt-0.5">{formatUTCDateTime(selectedEvent.event_time)}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Created
                    </span>
                    <p className="font-semibold mt-0.5">{formatUTCDate(selectedEvent.created_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[var(--bg-border)]/20 pt-3">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Target Capacity
                    </span>
                    <p className="font-semibold mt-0.5">{selectedEvent.capacity} Volunteers</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Cats Trap-Neuter-Returned
                    </span>
                    <p className="font-semibold mt-0.5">{selectedEvent.cats_tnrd_count} Cats Logged</p>
                  </div>
                </div>

                <div className="border-t border-[var(--bg-border)]/20 pt-4 flex gap-3 justify-end flex-wrap">
                  <button
                    onClick={() => {
                      setEditEventOpen(true);
                      setEditEventTitle(selectedEvent.title);
                      setEditEventDescription(selectedEvent.description || '');
                    }}
                    className="px-3.5 py-1.5 bg-transparent hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Edit Info Fields
                  </button>

                  {selectedEvent.status !== 'open' && (
                    <button
                      onClick={() => handleModerateEvent(selectedEvent.id, 'approve')}
                      disabled={actionLoadingId === `event-mod-${selectedEvent.id}`}
                      className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === `event-mod-${selectedEvent.id}` ? 'Opening...' : 'Open Event'}
                    </button>
                  )}

                  {selectedEvent.status !== 'cancelled' && (
                    <button
                      onClick={() => handleModerateEvent(selectedEvent.id, 'cancel')}
                      disabled={actionLoadingId === `event-mod-${selectedEvent.id}`}
                      className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/35 text-red-500 hover:bg-red-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === `event-mod-${selectedEvent.id}` ? 'Cancelling...' : 'Cancel Event'}
                    </button>
                  )}

                  {selectedEvent.organizer_id && (
                    <button
                      onClick={() => {
                        setQueryModal({
                          open: true,
                          targetType: 'event',
                          targetId: selectedEvent.id,
                          volunteerId: selectedEvent.organizer_id,
                        });
                      }}
                      className="px-3.5 py-1.5 bg-sky-500/10 border border-sky-500/35 text-sky-600 hover:bg-sky-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Query Organizer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RAISE QUERY MODAL */}
      {queryModal?.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => { setQueryModal(null); setQueryMessage(''); }} />
          <div className="relative bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl z-10 flex flex-col gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--empire-cream)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--empire-gold)]">question_answer</span>
                <span>Send Query to Volunteer</span>
              </h3>
              <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-1">
                You are raising a staff query to user ID: <span className="font-data">{queryModal.volunteerId}</span> regarding{' '}
                {queryModal.targetType} ID {queryModal.targetId}.
              </p>
            </div>

            <form onSubmit={handleRaiseQuery} className="flex flex-col gap-4">
              <textarea
                required
                rows={4}
                value={queryMessage}
                onChange={(e) => setQueryMessage(e.target.value)}
                placeholder="Type your inquiry message here. What clarification do you need regarding this log/report?"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-3 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)] resize-none bg-[var(--bg-surface)]"
              />

              <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/20 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setQueryModal(null);
                    setQueryMessage('');
                  }}
                  className="px-4 py-2 bg-transparent border border-[var(--bg-border)] rounded-xl font-display text-xs font-bold uppercase transition-all cursor-pointer text-[var(--empire-cream)]/65"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === 'raise-query'}
                  className="px-4 py-2 bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId === 'raise-query' ? 'Sending...' : 'Send Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
