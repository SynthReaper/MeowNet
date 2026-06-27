'use client';
// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/admin/AdminDashboardClient.tsx — Interactive Admin Dashboard

import { useState, useEffect, useMemo } from 'react';
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
  updateUserRole,
  adjustUserPoints,
  adminCreateUser,
  adminDeleteUser,
  updateProfileByStaff,
  resolveModeratorApplication,
  toggleProfileEnabled,
  logAuditAction,
} from '@/lib/actions/admin';

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
          <p key={index} style={{ color: pld.color || pld.fill }}>
            <span className="font-semibold">{pld.name}:</span> {pld.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboardClient({
  initialStats,
  initialProfiles,
  initialAudits,
  initialApplications,
  initialAuditLogs,
}: Props) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [audits] = useState<AuditLog[]>(initialAudits);
  const [applications, setApplications] = useState<ModeratorApplication[]>(initialApplications || []);
  const [auditLogs] = useState<StaffAuditLog[]>(initialAuditLogs || []);

  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'applications' | 'audits' | 'gdpr' | 'database' | 'live'>('analytics');
  const [userSearch, setUserSearch] = useState('');
  const [profileActivity, setProfileActivity] = useState<UserActivitySummary | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [liveActivities, setLiveActivities] = useState<LiveActivityItem[]>([]);

  // Audit Logs Filter States
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditStaffFilter, setAuditStaffFilter] = useState('');
  const [auditDateFilter, setAuditDateFilter] = useState('');

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
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 transform translate-y-0 flex items-center gap-2 ${
            notification.type === 'success'
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

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          <span>Admin Control Center</span>
        </h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/60">
          Manage MeowNet users, review compliance logs, audit the points ledger, and monitor system metrics.
        </p>
      </div>

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

      {/* Tabs Menu */}
      <div className="flex border-b border-[var(--bg-border)]/50 gap-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/50 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          <span className="material-symbols-outlined text-sm">analytics</span>
          Visual Analytics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'users'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/50 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          User Management ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'applications'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/50 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          Moderator Applications ({applications.filter(a => a.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'audits'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/50 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('gdpr')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'gdpr'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/50 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          GDPR Erasure Logs ({audits.length})
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'database'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/50 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          Database Registry Size
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'live'
              ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
              : 'text-[var(--empire-cream)]/50 border-transparent hover:text-[var(--empire-gold)]'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live User Feed
        </button>
      </div>

      {/* Content */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] shadow-ambient p-6 flex flex-col gap-6">
        {activeTab === 'analytics' ? (
          <div className="flex flex-col gap-8">
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
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={registrationGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--life-teal)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="var(--life-teal)" stopOpacity={0}/>
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
                        <ResponsiveContainer width="100%" height="100%">
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
                              {roleDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs font-body font-semibold text-[var(--empire-cream)]/75">{value}</span>} />
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
                      <ResponsiveContainer width="100%" height="100%">
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
                      className={`rounded-2xl border transition-all ${
                        app.status === 'pending'
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
                        <span className={`px-2.5 py-1 rounded-full font-body text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          app.status === 'pending'
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
                              ✓ Approve
                            </button>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleResolveApplication(app.id, 'reject')}
                              className="px-3 py-1.5 bg-[#fff5f5] text-[#c92a2a] border border-[#ffe3e3] rounded-lg font-body text-[10px] font-bold uppercase cursor-pointer hover:bg-[#ffe3e3] transition-all disabled:opacity-50"
                            >
                              ✕ Reject
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
        ) : activeTab === 'audits' ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                  <span className="material-symbols-outlined">receipt_long</span>
                  <span>Staff Activity Audit Logs</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">
                  Track and review all administrative and moderation operations performed by MeowNet staff.
                </p>
              </div>
              <button
                onClick={handleExportAuditsToCSV}
                disabled={filteredAuditLogs.length === 0}
                className="bg-[var(--life-teal)] text-white hover:bg-[var(--life-teal-dim)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Export CSV
              </button>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--bg-elevated)]/30 p-4 rounded-xl border border-[var(--bg-border)]/20">
              <div className="flex gap-2.5 items-center bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--bg-border)]/50">
                <span className="material-symbols-outlined text-sm text-[var(--empire-cream)]/35">search</span>
                <input
                  type="text"
                  placeholder="Filter by action (e.g. edit_profile)..."
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/30"
                />
              </div>
              <div className="flex gap-2.5 items-center bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--bg-border)]/50">
                <span className="material-symbols-outlined text-sm text-[var(--empire-cream)]/35">person</span>
                <input
                  type="text"
                  placeholder="Filter by staff name..."
                  value={auditStaffFilter}
                  onChange={(e) => setAuditStaffFilter(e.target.value)}
                  className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/30"
                />
              </div>
              <div className="flex gap-2.5 items-center bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--bg-border)]/50">
                <span className="material-symbols-outlined text-sm text-[var(--empire-cream)]/35">calendar_today</span>
                <input
                  type="date"
                  value={auditDateFilter}
                  onChange={(e) => setAuditDateFilter(e.target.value)}
                  className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--empire-cream)] cursor-pointer"
                />
              </div>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <div className="py-12 text-center text-[var(--empire-cream)]/40 font-body text-xs">
                No activity logged in the audit trail matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--bg-border)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target User</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[var(--bg-border)]/30 hover:bg-[var(--bg-elevated)]/20 transition-colors">
                        <td className="py-4 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">
                          <button
                            onClick={() => handleOpenProfileById(log.actor_id)}
                            className="font-body text-xs font-bold text-[var(--empire-cream)] hover:underline border-none bg-transparent cursor-pointer p-0 text-left outline-none"
                          >
                            {log.actor_name}
                          </button>
                        </td>
                        <td className="py-4 px-4 font-body text-xs capitalize text-[var(--empire-cream)]/75">
                          {log.actor_role}
                        </td>
                        <td className="py-4 px-4 font-body text-xs">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] uppercase font-bold border border-zinc-200 dark:border-zinc-700">
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-body text-xs text-[var(--empire-cream)]/75 font-mono select-all">
                          {log.target_id ? (
                            <button
                              onClick={() => handleOpenProfileById(log.target_id!)}
                              className="font-body text-xs font-mono text-[var(--empire-cream)]/75 hover:underline border-none bg-transparent cursor-pointer p-0 text-left outline-none"
                            >
                              {log.target_id}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-4 px-4 font-body text-xs text-[var(--empire-cream)]/75">
                          {log.details || '-'}
                        </td>
                        <td className="py-4 px-4 font-body text-[10px] text-[var(--empire-cream)]/50 font-semibold">
                          {formatUTCDateTime(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={databaseSizeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.2} />
                        <XAxis type="number" stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-data)" />
                        <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} fontFamily="var(--font-body)" width={120} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="rows" name="Row Count" radius={[0, 4, 4, 0]}>
                          {databaseSizeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
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
        ) : (
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
        )}
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
                <span className={`inline-block px-2 py-0.5 rounded-full font-body text-[9px] font-bold uppercase tracking-wider ${
                  selectedProfile.is_enabled
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
                  <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Preferred Role Focus</label>
                  <input
                    type="text"
                    value={editRoleFocus}
                    onChange={(e) => setEditRoleFocus(e.target.value)}
                    placeholder="e.g. Trapper, Feeder"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-xl p-2.5 font-body text-xs outline-none focus:border-[var(--empire-gold)] mt-1 text-[var(--empire-cream)]"
                  />
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
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  c.status === 'stray' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
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
                                  <span className={`px-1 rounded text-[8px] font-bold uppercase ${
                                    a.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
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
                    className={`px-4 py-2 border rounded-xl font-body text-xs font-bold uppercase cursor-pointer transition-all ${
                      selectedProfile.is_enabled
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    {selectedProfile.is_enabled ? 'Disable Profile' : 'Enable Profile'}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === 'delete-user'}
                    onClick={() => handleDeleteUser(selectedProfile.id)}
                    className="px-4 py-2 bg-red-950 text-red-400 border border-red-800/40 hover:bg-red-900 rounded-xl font-body text-xs font-bold uppercase cursor-pointer transition-all"
                  >
                    Delete User
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
                    Save Changes
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
                    className={`relative mt-0.5 flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200 cursor-pointer border ${
                      newBypassVerification
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
    </div>
  );
}
