'use client';

// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/moderator/ModeratorDashboardClient.tsx — Interactive Moderator Dashboard

import { useState, useEffect, useTransition, useMemo } from 'react';
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
import dynamic from 'next/dynamic';

const ModeratorHotspotsMap = dynamic(() => import('@/components/map/ModeratorHotspotsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-[var(--bg-elevated)] rounded-2xl border border-[var(--bg-border)]/50">
      <span className="font-body text-sm font-semibold text-[var(--empire-gold)] animate-pulse">Loading map canvas…</span>
    </div>
  ),
});
import {
  moderateCat,
  toggleCatVerified,
  moderateEvent,
  raiseModeratorQuery,
  resolveModeratorQuery,
  shiftQueryToAdmin,
  updateEventByStaff,
  updateProfileByStaff,
  toggleProfileEnabled,
  getAuditLogs,
  getUserActivitySummary,
} from '@/lib/actions/admin';
import FuturisticAuditDashboard from '@/components/admin/FuturisticAuditDashboard';

interface Cat {
  id: string;
  name: string;
  status: 'stray' | 'tnr' | 'adoptable' | 'adopted';
  breed_estimate: string | null;
  age_estimate: string | null;
  owner_id: string | null;
  created_at: string;
  photo_url: string | null;
  is_verified: boolean;
  health_flags: string[] | null;
  health_notes: string | null;
  sterilized: boolean;
  vaccinated: boolean;
  microchipped: boolean;
  contact_info: string | null;
  bcs_estimate: number | null;
  color: string | null;
  shelter_url: string | null;
  breed_confidence: number | null;
  location: any;
}

interface TNREvent {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  status: 'pending' | 'open' | 'cancelled';
  created_at: string;
  cats_tnrd_count: number;
  event_time: string;
  organizer_id: string;
  location: any;
}

interface Query {
  id: string;
  target_type: 'cat' | 'event' | 'profile' | 'general';
  target_id: string | null;
  moderator_id: string | null;
  volunteer_id: string;
  message: string;
  status: 'pending' | 'solved' | 'closed' | 'resolved';
  response: string | null;
  created_at: string;
  chat_messages?: any[];
}

interface Profile {
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
}

interface AuditLog {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
  actor_name: string;
}

interface Props {
  initialCats: Cat[];
  initialEvents: TNREvent[];
  initialQueries: Query[];
  initialProfiles: Profile[];
  initialAuditLogs?: AuditLog[];
  currentUser: {
    id: string;
    role: string;
    sub_role: string | null;
    edits_count: number;
    max_edits: number;
  } | null;
}

const fmtDate = (dateStr: string) => {
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

const fmtDateTime = (dateStr: string) => {
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

export default function ModeratorDashboardClient({
  initialCats,
  initialEvents,
  initialQueries,
  initialProfiles,
  initialAuditLogs,
  currentUser,
}: Props) {
  const [cats, setCats] = useState<Cat[]>(initialCats);
  const [events, setEvents] = useState<TNREvent[]>(initialEvents);
  const [queries, setQueries] = useState<Query[]>(initialQueries);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs ?? []);
  const router = useRouter();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'map' | 'cats' | 'events' | 'queries' | 'profiles' | 'audits' | 'live'>('map');

  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'queries') {
        setActiveTab('queries');
      }
    }
  }, []);

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
        c.health_flags.forEach(flag => {
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
      fmtDateTime(q.created_at)
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `meownet_moderator_queries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Queries successfully exported to CSV.');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] p-3 rounded-xl shadow-ambient text-xs font-body text-[var(--empire-cream)]">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} style={{ color: pld.color || pld.fill }}>
              <span className="font-semibold">{pld.name}:</span> {pld.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const fetchInitialActivities = async () => {
      try {
        const supabase = createClient();
        const { data: msgs } = await supabase
          .from('community_messages' as never)
          .select('id, created_at, message, user_id, profiles:profiles(display_name)' as never)
          .order('created_at', { ascending: false })
          .limit(20) as any;

        const { data: catsData } = await supabase
          .from('cats' as never)
          .select('id, created_at, name, status, owner_id, profiles:profiles(display_name)' as never)
          .order('created_at', { ascending: false })
          .limit(20) as any;

        const { data: eventsData } = await supabase
          .from('tnr_events' as never)
          .select('id, created_at, title, organizer_id, profiles:profiles(display_name)' as never)
          .order('created_at', { ascending: false })
          .limit(10) as any;

        const combined: any[] = [];
        if (msgs) {
          msgs.forEach((m: any) => {
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
          catsData.forEach((c: any) => {
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
          eventsData.forEach((e: any) => {
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
    const channelName = `live-feed-mod-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName);

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'community_messages'
    }, async (payload: any) => {
      const msg = payload.new;
      const { data: profile } = await supabase.from('profiles' as never).select('display_name').eq('id', msg.user_id).single() as any;
      const name = profile?.display_name || 'Anonymous';
      
      setLiveActivities(prev => [{
        id: msg.id,
        timestamp: msg.created_at,
        type: 'chat',
        description: `Posted in chat: "${msg.message.slice(0, 60)}${msg.message.length > 60 ? '...' : ''}"`,
        actorName: name,
        actorId: msg.user_id
      }, ...prev].slice(0, 100));
    });

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'cats'
    }, async (payload: any) => {
      const cat = payload.new;
      const { data: profile } = await supabase.from('profiles' as never).select('display_name').eq('id', cat.owner_id).single() as any;
      const name = profile?.display_name || 'Anonymous';

      setLiveActivities(prev => [{
        id: cat.id,
        timestamp: cat.created_at,
        type: 'cat',
        description: `Logged new cat sighting: "${cat.name || 'Unnamed Cat'}" (${cat.status})`,
        actorName: name,
        actorId: cat.owner_id
      }, ...prev].slice(0, 100));
    });

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'tnr_events'
    }, async (payload: any) => {
      const ev = payload.new;
      const { data: profile } = await supabase.from('profiles' as never).select('display_name').eq('id', ev.organizer_id).single() as any;
      const name = profile?.display_name || 'Anonymous';

      setLiveActivities(prev => [{
        id: ev.id,
        timestamp: ev.created_at,
        type: 'event',
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
      handleOpenMemberModal(existing);
    } else {
      setLoadingActivity(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles' as never)
          .select('id, display_name, role, empire_points, created_at, bio, preferred_role, location_neighborhood, contact_phone, is_enabled')
          .eq('id', userId)
          .single() as any;
        if (data) {
          handleOpenMemberModal(data as Profile);
        } else {
          showNotification('error', 'Profile not found.');
        }
      } catch (err) {
        showNotification('error', 'Error loading profile.');
      } finally {
        setLoadingActivity(false);
      }
    }
  };

  // Search & Filter State
  const [catSearch, setCatSearch] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState<string>('all');
  const [catVerifyFilter, setCatVerifyFilter] = useState<string>('all');

  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('all');

  const [querySearch, setQuerySearch] = useState('');
  const [queryStatusFilter, setQueryStatusFilter] = useState<string>('active');

  const [profileSearch, setProfileSearch] = useState('');

  const [auditSearch, setAuditSearch] = useState('');

  // Modals & Action States
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TNREvent | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileActivity, setProfileActivity] = useState<any>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Raise Query form state
  const [queryModal, setQueryModal] = useState<{
    open: boolean;
    targetType: 'cat' | 'event' | 'profile';
    targetId: string;
    volunteerId: string;
  } | null>(null);
  const [queryMessage, setQueryMessage] = useState('');

  // Event editing state
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');

  // Profile editing state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPreferredRole, setEditPreferredRole] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');

  // Query resolution inline/modal response state
  const [resolvingQueryId, setResolvingQueryId] = useState<string | null>(null);
  const [queryResolutionText, setQueryResolutionText] = useState('');
  const [shiftingQueryId, setShiftingQueryId] = useState<string | null>(null);
  const [shiftReasonText, setShiftReasonText] = useState('');
  const [isAdminQueryOpen, setIsAdminQueryOpen] = useState(false);
  const [adminQueryMessage, setAdminQueryMessage] = useState('');

  // Loading / Transitions
  const [isPending, startTransition] = useTransition();
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Audit Logs when audits tab becomes active
  useEffect(() => {
    let active = true;
    if (activeTab === 'audits') {
      setLoadingAudits(true);
      getAuditLogs()
        .then((logs) => {
          if (active) {
            setAuditLogs(logs as AuditLog[]);
          }
        })
        .catch(() => {
          if (active) {
            showNotification('error', 'Failed to fetch audit logs.');
          }
        })
        .finally(() => {
          if (active) {
            setLoadingAudits(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [activeTab]);

  // Moderate Cat (Approve / Delete)
  const handleModerateCat = (catId: string, action: 'approve' | 'delete') => {
    if (action === 'delete' && !confirm('Are you sure you want to permanently delete this cat sighting?')) return;
    setActionLoadingId(`cat-mod-${catId}`);
    startTransition(async () => {
      try {
        const res = await moderateCat(catId, action);
        if (res.success) {
          if (action === 'delete') {
            setCats(cats.filter((c) => c.id !== catId));
            if (selectedCat?.id === catId) setSelectedCat(null);
          } else {
            // mark sterilized or update local status to verify it's audited
            setCats(cats.map((c) => (c.id === catId ? { ...c, sterilized: true } : c)));
            if (selectedCat?.id === catId) setSelectedCat({ ...selectedCat, sterilized: true });
          }
          showNotification('success', `Successfully ${action === 'delete' ? 'deleted' : 'approved'} cat sighting.`);
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
          showNotification('success', 'Moderator query raised successfully.');
          // Optimistically refresh queries list
          getAuditLogs(); // Trigger refresh state if needed, or simply let page revalidation handle it.
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

  // Resolve query
  const handleResolveQuery = (queryId: string) => {
    setActionLoadingId(`query-resolve-${queryId}`);
    startTransition(async () => {
      try {
        const res = await resolveModeratorQuery(queryId, queryResolutionText || undefined);
        if (res.success) {
          const updated = queries.map((q) =>
            q.id === queryId ? ({ ...q, status: 'resolved', response: queryResolutionText || null } as Query) : q
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

  // Shift query to admin
  const handleShiftQuery = (queryId: string) => {
    if (!shiftReasonText.trim()) {
      showNotification('error', 'Please state a reason for escalating this query to Admin.');
      return;
    }
    setActionLoadingId(`query-shift-${queryId}`);
    startTransition(async () => {
      try {
        const res = await shiftQueryToAdmin(queryId, shiftReasonText);
        if (res.success) {
          const updated = queries.map((q) =>
            q.id === queryId ? ({ ...q, message: `${q.message}\n\n[SHIFTED_TO_ADMIN: ${shiftReasonText}]` } as Query) : q
          );
          setQueries(updated);
          setShiftingQueryId(null);
          setShiftReasonText('');
          showNotification('success', 'Query successfully shifted to Admin.');
        } else {
          showNotification('error', res.error || 'Failed to shift query.');
        }
      } catch {
        showNotification('error', 'Network error.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Raise query to admin (as a moderator)
  const handleRaiseQueryToAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminQueryMessage.trim()) {
      showNotification('error', 'Please enter a message to raise to the Admin.');
      return;
    }
    setActionLoadingId('raise-admin-query');
    startTransition(async () => {
      try {
        const res = await raiseModeratorQuery(
          'profile',
          'admin-system',
          currentUser?.id || '',
          `[MODERATOR_QUERY_TO_ADMIN] ${adminQueryMessage.trim()}`
        );
        if (res.success) {
          setIsAdminQueryOpen(false);
          setAdminQueryMessage('');
          showNotification('success', 'Staff query submitted to Admin successfully.');
          window.location.reload();
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

  // Open member details modal and load user activity stats
  const handleOpenMemberModal = async (profile: Profile) => {
    setSelectedProfile(profile);
    setEditDisplayName(profile.display_name ?? '');
    setEditBio(profile.bio ?? '');
    setEditPreferredRole(profile.preferred_role ?? '');
    setEditNeighborhood(profile.location_neighborhood ?? '');
    setEditContactPhone(profile.contact_phone ?? '');

    setLoadingActivity(true);
    setProfileActivity(null);
    try {
      const res = await getUserActivitySummary(profile.id);
      if (res.success && res.data) {
        setProfileActivity(res.data);
      } else {
        showNotification('error', res.error || 'Failed to fetch activity summary.');
      }
    } catch {
      showNotification('error', 'Failed to load volunteer activity.');
    } finally {
      setLoadingActivity(false);
    }
  };

  // Edit volunteer details
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setActionLoadingId('profile-save');
    startTransition(async () => {
      try {
        const res = await updateProfileByStaff(selectedProfile.id, {
          display_name: editDisplayName,
          bio: editBio || undefined,
          preferred_role: editPreferredRole || undefined,
          location_neighborhood: editNeighborhood || undefined,
          contact_phone: editContactPhone || undefined,
        });
        if (res.success) {
          setProfiles(
            profiles.map((p) =>
              p.id === selectedProfile.id
                ? {
                    ...p,
                    display_name: editDisplayName,
                    bio: editBio || null,
                    preferred_role: editPreferredRole || null,
                    location_neighborhood: editNeighborhood || null,
                    contact_phone: editContactPhone || null,
                  }
                : p
            )
          );
          setSelectedProfile({
            ...selectedProfile,
            display_name: editDisplayName,
            bio: editBio || null,
            preferred_role: editPreferredRole || null,
            location_neighborhood: editNeighborhood || null,
            contact_phone: editContactPhone || null,
          });
          setEditProfileOpen(false);
          showNotification('success', 'Profile updated successfully.');
        } else {
          showNotification('error', res.error || 'Failed to save profile changes.');
        }
      } catch {
        showNotification('error', 'Network error.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Disable / Enable member profile (suspend/reinstate)
  const handleToggleProfileEnablement = () => {
    if (!selectedProfile) return;
    const nextState = !selectedProfile.is_enabled;
    setActionLoadingId('profile-enable-toggle');
    startTransition(async () => {
      try {
        const res = await toggleProfileEnabled(selectedProfile.id, nextState);
        if (res.success) {
          setProfiles(profiles.map((p) => (p.id === selectedProfile.id ? { ...p, is_enabled: nextState } : p)));
          setSelectedProfile({ ...selectedProfile, is_enabled: nextState });
          showNotification('success', `Profile ${nextState ? 'reinstated' : 'suspended'} successfully.`);
        } else {
          showNotification('error', res.error || 'Failed to toggle account status.');
        }
      } catch {
        showNotification('error', 'Network error.');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Filtered lists
  const filteredCats = cats.filter((c) => {
    const term = catSearch.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(term) || c.id.toLowerCase().includes(term);
    const statusMatch = catStatusFilter === 'all' || c.status === catStatusFilter;
    const verifyMatch =
      catVerifyFilter === 'all' ||
      (catVerifyFilter === 'verified' && c.is_verified) ||
      (catVerifyFilter === 'unverified' && !c.is_verified);
    return nameMatch && statusMatch && verifyMatch;
  });

  const filteredEvents = events.filter((e) => {
    const term = eventSearch.toLowerCase();
    const titleMatch = e.title?.toLowerCase().includes(term) || e.id.toLowerCase().includes(term);
    const statusMatch = eventStatusFilter === 'all' || e.status === eventStatusFilter;
    return titleMatch && statusMatch;
  });

  const filteredQueries = queries.filter((q) => {
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

  const filteredProfiles = profiles.filter((p) => {
    const term = profileSearch.toLowerCase();
    return (
      (p.display_name?.toLowerCase().includes(term) ?? false) ||
      p.id.toLowerCase().includes(term) ||
      (p.location_neighborhood?.toLowerCase().includes(term) ?? false)
    );
  });

  const filteredAudits = auditLogs.filter((log) => {
    const term = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      (log.details?.toLowerCase().includes(term) ?? false) ||
      log.actor_name.toLowerCase().includes(term) ||
      log.actor_id.toLowerCase().includes(term)
    );
  });

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
          <span className="material-symbols-outlined text-3xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield
          </span>
          <span>Moderator Command Center</span>
        </h1>
        <p className="font-body text-sm text-[var(--empire-cream)]/60">
          Verify stray reports, update community TNR campaigns, address inquiries, and audit logs.
        </p>
      </div>

      {currentUser?.sub_role === 'sub_moderator' && (
        <div className="bg-[#fdf3e7] border border-[#fbdcb2] rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm text-xs font-semibold text-[#8a561e] animate-fade-in">
          <span className="material-symbols-outlined text-xl text-[#eb8424]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <div className="flex-1">
            <p className="font-bold text-[#964a00]">Sub-Moderator Mode (Limited Access)</p>
            <p className="text-[#6b5a4d] mt-0.5 font-medium">
              You can view all logs, queries, and sightings. Your account is configured for testing with a maximum limit of <strong>{currentUser.max_edits} edits</strong> total.
              Currently used: <strong className="text-[#eb8424]">{currentUser.edits_count} / {currentUser.max_edits} edits</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--bg-border)] shadow-ambient flex items-center gap-4 hover:shadow-active transition-all">
          <div className="w-12 h-12 rounded-xl bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">pets</span>
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--empire-cream)] font-data">
              {cats.filter((c) => !c.is_verified).length}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 mt-0.5">
              Unverified Cats
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--bg-border)] shadow-ambient flex items-center gap-4 hover:shadow-active transition-all">
          <div className="w-12 h-12 rounded-xl bg-[var(--life-teal)]/10 text-[var(--life-teal)] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">event</span>
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text-primary)] font-data">
              {events.filter((e) => e.status === 'pending').length}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
              Pending Events
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--bg-border)] shadow-ambient flex items-center gap-4 hover:shadow-active transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">question_answer</span>
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text-primary)] font-data">
              {queries.filter((q) => q.status !== 'closed' && q.status !== 'resolved').length}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
              Active Inquiries
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--bg-border)] shadow-ambient flex items-center gap-4 hover:shadow-active transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">volunteer_activism</span>
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text-primary)] font-data">{profiles.length}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
              Monitored Volunteers
            </div>
          </div>
        </div>
      </div>

      {/* Tab Menu */}
      <div className="flex border-b border-[var(--bg-border)]/30 gap-4 overflow-x-auto pb-1">
        {[
          { key: 'map', label: 'Interactive Map' },
          { key: 'cats', label: 'Stray Cats', count: cats.length },
          { key: 'events', label: 'TNR Events', count: events.length },
          { key: 'queries', label: 'Queries Log', count: queries.filter((q) => q.status !== 'closed' && q.status !== 'resolved').length },
          { key: 'profiles', label: 'Volunteers', count: profiles.length },
          { key: 'audits', label: 'Audit Trail' },
          { key: 'live', label: 'Live User Feed' },
        ].map((tab) => {
          const isLive = tab.key === 'live';
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 font-display text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'text-[var(--empire-gold)] border-[var(--empire-gold)]'
                  : 'text-[var(--empire-cream)]/40 border-transparent hover:text-[var(--empire-gold)]'
              }`}
            >
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              <span>{tab.label} {tab.count !== undefined && `(${tab.count})`}</span>
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] shadow-ambient p-6">
        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                  <span className="material-symbols-outlined">map</span>
                  <span>Interactive Hotspots Sighting Map</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">
                  Click on pins to view status information, verify cat sightings, or approve TNR events.
                </p>
              </div>
            </div>
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
        )}

        {/* CATS TAB */}
        {activeTab === 'cats' && (
          <div className="flex flex-col gap-6">
            {/* Verification & Health Analytics */}
            {isMounted && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[var(--bg-elevated)]/30 p-5 rounded-2xl border border-[var(--bg-border)]/20 mb-2">
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
                          {verificationRatioData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={24} formatter={(value) => <span className="text-[10px] font-body font-semibold text-[var(--empire-cream)]/75">{value}</span>} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCats.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-[var(--bg-elevated)]/40 rounded-2xl border border-[var(--bg-border)]/40 p-4 flex flex-col justify-between gap-4 hover:border-[var(--empire-gold)]/60 transition-all shadow-sm"
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
                          {cat.sterilized && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-600 rounded-md">
                              Sterilized
                            </span>
                          )}
                          {cat.vaccinated && (
                            <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-[9px] font-bold text-sky-600 rounded-md">
                              Vaccinated
                            </span>
                          )}
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
                        className={`px-2 py-1 border text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                          cat.is_verified
                            ? 'bg-amber-500/10 border-amber-500/35 text-amber-600 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20'
                        }`}
                      >
                        {cat.is_verified ? 'Unverify' : 'Verify'}
                      </button>

                      {cat.owner_id && (
                        <button
                          onClick={() =>
                            setQueryModal({
                              open: true,
                              targetType: 'cat',
                              targetId: cat.id,
                              volunteerId: cat.owner_id!,
                            })
                          }
                          className="px-2 py-1 bg-sky-500/10 border border-sky-500/35 text-sky-600 hover:bg-sky-500/20 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                        >
                          Query
                        </button>
                      )}

                      <button
                        onClick={() => handleModerateCat(cat.id, 'delete')}
                        disabled={actionLoadingId === `cat-mod-${cat.id}`}
                        className="px-2 py-1 bg-red-500/10 border border-red-500/35 text-red-500 hover:bg-red-500/20 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TNR EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="flex flex-col gap-6">
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
              <div className="overflow-x-auto">
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
                          {fmtDateTime(event.event_time)}
                        </td>
                        <td className="py-4 px-4 font-data text-xs text-[var(--empire-cream)] font-bold">
                          {event.capacity} volunteers
                        </td>
                        <td className="py-4 px-4 font-data text-xs text-[var(--empire-cream)] font-bold">
                          {event.cats_tnrd_count} cats
                        </td>
                        <td className="py-4 px-4 font-body text-xs">
                          <span
                            className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded-md ${
                              event.status === 'open'
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
                              onClick={() => {
                                setSelectedEvent(event);
                                setEditEventTitle(event.title);
                                setEditEventDescription(event.description ?? '');
                              }}
                              className="px-2 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[9px] font-bold uppercase rounded-md cursor-pointer transition-all"
                            >
                              Edit
                            </button>

                            {event.status !== 'open' && (
                              <button
                                onClick={() => handleModerateEvent(event.id, 'approve')}
                                disabled={actionLoadingId === `event-mod-${event.id}`}
                                className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-all disabled:opacity-50"
                              >
                                Open
                              </button>
                            )}

                            {event.status !== 'cancelled' && (
                              <button
                                onClick={() => handleModerateEvent(event.id, 'cancel')}
                                disabled={actionLoadingId === `event-mod-${event.id}`}
                                className="px-2 py-1 bg-red-500/10 border border-red-500/35 text-red-500 hover:bg-red-500/20 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-all disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}

                            {event.organizer_id && (
                              <button
                                onClick={() =>
                                  setQueryModal({
                                    open: true,
                                    targetType: 'event',
                                    targetId: event.id,
                                    volunteerId: event.organizer_id,
                                  })
                                }
                                className="px-2 py-1 bg-sky-500/10 border border-sky-500/35 text-sky-600 hover:bg-sky-500/20 text-[9px] font-bold uppercase rounded-md cursor-pointer transition-all"
                              >
                                Query
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
        )}

        {/* MODERATOR QUERIES TAB */}
        {activeTab === 'queries' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4 items-center justify-between border-b border-[var(--bg-border)]/20 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--empire-gold)] flex items-center gap-2">
                  <span className="material-symbols-outlined">question_answer</span>
                  <span>Moderator Queries Log</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">
                  Review and resolve official system inquiries raised by staff regarding cat and event status logs.
                </p>
              </div>
              <div className="flex gap-2">
                {currentUser?.role === 'moderator' && (
                  <button
                    onClick={() => setIsAdminQueryOpen(true)}
                    className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">gavel</span>
                    Raise Query to Admin
                  </button>
                )}
                <button
                  onClick={handleExportQueriesToCSV}
                  disabled={filteredQueries.length === 0}
                  className="bg-[var(--life-teal)] text-white hover:bg-[var(--life-teal-dim)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Export CSV
                </button>
              </div>
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
                No queries found in the system.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
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

                  const canCurrentUserResolve = (!isShifted && !isModToAdmin) || currentUser?.role === 'admin';

                  return (
                    <div
                      key={q.id}
                      onClick={() => router.push(`/support/${q.id}`)}
                      className="bg-[var(--bg-elevated)]/40 border border-[var(--bg-border)]/45 p-5 rounded-2xl flex flex-col gap-4 shadow-sm cursor-pointer hover:bg-[var(--bg-border)]/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="w-full">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40 font-data">
                              Query #{q.id.slice(0, 8)}
                            </span>
                            <span
                              className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded-md ${
                                q.status === 'closed'
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
                          <p className="font-body text-xs font-semibold text-[var(--empire-cream)] mt-3 leading-relaxed">
                            {displayMessage}
                          </p>
                          {isShifted && (
                            <div className="mt-3 bg-rose-500/5 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-[11px] font-medium flex flex-col gap-1">
                              <span className="font-bold flex items-center gap-1 text-rose-400">
                                <span className="material-symbols-outlined text-[14px]">gavel</span> 
                                Escalated to Admin by Moderator
                              </span>
                              {shiftReason && <p className="mt-1 leading-relaxed">{shiftReason}</p>}
                            </div>
                          )}
                        </div>
                      </div>

                      {q.status === 'resolved' || q.status === 'closed' ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-xl">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                            Resolution Action Details
                          </div>
                          <p className="font-body text-xs text-[var(--empire-cream)]/75 mt-1 leading-relaxed">
                            {q.response || 'Inquiry resolved and closed.'}
                          </p>
                        </div>
                      ) : (
                        <div className="border-t border-[var(--bg-border)]/20 pt-3.5 flex flex-col gap-3">
                          {resolvingQueryId === q.id ? (
                            <div className="flex flex-col gap-3">
                              <textarea
                                rows={2}
                                placeholder="Write a response note to attach to this resolution..."
                                value={queryResolutionText}
                                onChange={(e) => setQueryResolutionText(e.target.value)}
                                className="w-full bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl p-3 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setResolvingQueryId(null);
                                  }}
                                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResolveQuery(q.id);
                                  }}
                                  disabled={actionLoadingId === `query-resolve-${q.id}`}
                                  className="px-3 py-1.5 bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Submit Resolution
                                </button>
                              </div>
                            </div>
                          ) : shiftingQueryId === q.id ? (
                            <div className="flex flex-col gap-3">
                              <textarea
                                rows={2}
                                placeholder="State the reason why you are shifting this query to Admin..."
                                value={shiftReasonText}
                                onChange={(e) => setShiftReasonText(e.target.value)}
                                className="w-full bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl p-3 text-xs text-[var(--empire-cream)] focus:border-[var(--empire-gold)] outline-none resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShiftingQueryId(null);
                                  }}
                                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShiftQuery(q.id);
                                  }}
                                  disabled={actionLoadingId === `query-shift-${q.id}`}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                                  Shift to Admin
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2 items-center">
                              {!canCurrentUserResolve ? (
                                <span className="text-[11px] font-bold text-rose-400/80 bg-rose-500/5 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1 select-none">
                                  <span className="material-symbols-outlined text-sm">lock</span>
                                  Awaiting Admin Resolution
                                </span>
                              ) : (
                                <>
                                  {currentUser?.role === 'moderator' && !isShifted && !isModToAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShiftingQueryId(q.id);
                                        setShiftReasonText('');
                                      }}
                                      className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/35 text-rose-400 hover:bg-rose-500/20 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">gavel</span>
                                      Shift to Admin
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setResolvingQueryId(q.id);
                                      setQueryResolutionText('');
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                                  >
                                    Resolve Inquiry
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/support/${q.id}`);
                                    }}
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--empire-cream)] text-xs font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">chat</span>
                                    Open Chat
                                  </button>
                                </>
                              )}
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
        )}

        {/* VOLUNTEER PROFILES TAB */}
        {activeTab === 'profiles' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3 items-center flex-1 max-w-md bg-[var(--bg-elevated)] px-3 py-2 rounded-xl border border-[var(--bg-border)]/50">
                <span className="material-symbols-outlined text-[var(--empire-cream)]/30 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search profiles by name, ID, or neighborhood..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="w-full bg-transparent border-0 font-body text-xs outline-none text-[var(--empire-cream)] placeholder-[var(--empire-cream)]/35"
                />
              </div>
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="py-16 text-center text-[var(--empire-cream)]/40 font-body text-xs">
                No volunteer accounts found matching search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--bg-border)]/45 text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                      <th className="py-3 px-4">Volunteer</th>
                      <th className="py-3 px-4">Volunteer ID</th>
                      <th className="py-3 px-4">Neighborhood</th>
                      <th className="py-3 px-4">Points Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[var(--bg-border)]/20 hover:bg-[var(--bg-elevated)]/20 transition-colors"
                      >
                        <td className="py-4 px-4 font-body text-xs font-bold text-[var(--empire-cream)]">
                          {p.display_name || 'Unnamed Volunteer'}
                        </td>
                        <td className="py-4 px-4 font-data text-[10px] text-[var(--empire-cream)]/50 select-all font-semibold">
                          {p.id}
                        </td>
                        <td className="py-4 px-4 font-body text-xs text-[var(--empire-cream)]/75">
                          {p.location_neighborhood || 'Not Set'}
                        </td>
                        <td className="py-4 px-4 font-data text-xs text-[var(--empire-cream)] font-bold">
                          {p.empire_points.toLocaleString()} pts
                        </td>
                        <td className="py-4 px-4 font-body text-xs">
                          <span
                            className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded-md ${
                              p.is_enabled
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                                : 'bg-red-500/10 border-red-500/25 text-red-500'
                            }`}
                          >
                            {p.is_enabled ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleOpenMemberModal(p)}
                            className="px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[9px] font-bold uppercase rounded-md cursor-pointer transition-all"
                          >
                            View & Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === 'audits' && (
          <FuturisticAuditDashboard 
            initialAuditLogs={auditLogs as any} 
            currentUserRole="moderator" 
          />
        )}

        {activeTab === 'live' && (
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
                          {fmtDateTime(act.timestamp)}
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

      {/* DETAILED CAT MODAL */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-6">
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
                className="text-[var(--empire-cream)]/40 hover:text-[var(--empire-cream)] transition-colors cursor-pointer"
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
                      className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-lg ${
                        selectedCat.is_verified
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
                    {selectedCat.breed_confidence !== null && (
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
                      className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${
                        selectedCat.sterilized
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                      }`}
                    >
                      Sterilized
                    </span>
                    <span
                      className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${
                        selectedCat.vaccinated
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                      }`}
                    >
                      Vaccinated
                    </span>
                    <span
                      className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${
                        selectedCat.microchipped
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
                onClick={() => setSelectedCat(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
              >
                Close details
              </button>

              <button
                onClick={() => handleToggleCatVerified(selectedCat.id, selectedCat.is_verified)}
                disabled={actionLoadingId === `cat-verify-${selectedCat.id}`}
                className={`px-4 py-2 border text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                  selectedCat.is_verified
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-600 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20'
                }`}
              >
                {selectedCat.is_verified ? 'Unverify report' : 'Verify report'}
              </button>

              {selectedCat.owner_id && (
                <button
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
                onClick={() => handleModerateCat(selectedCat.id, 'delete')}
                disabled={actionLoadingId === `cat-mod-${selectedCat.id}`}
                className="px-4 py-2 bg-red-500/10 border border-red-500/35 text-red-500 hover:bg-red-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Delete Sighting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT & DETAIL TNR EVENT MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-6">
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
                className="text-[var(--empire-cream)]/40 hover:text-[var(--empire-cream)] transition-colors cursor-pointer"
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
                    className="px-4 py-2 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Back to Info
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === 'event-update'}
                    className="px-4 py-2 bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Changes
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
                    <p className="font-semibold mt-0.5">{fmtDateTime(selectedEvent.event_time)}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Created
                    </span>
                    <p className="font-semibold mt-0.5">{fmtDate(selectedEvent.created_at)}</p>
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
                    onClick={() => setEditEventOpen(true)}
                    className="px-3.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Edit Info Fields
                  </button>

                  {selectedEvent.status !== 'open' && (
                    <button
                      onClick={() => handleModerateEvent(selectedEvent.id, 'approve')}
                      disabled={actionLoadingId === `event-mod-${selectedEvent.id}`}
                      className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Open Event
                    </button>
                  )}

                  {selectedEvent.status !== 'cancelled' && (
                    <button
                      onClick={() => handleModerateEvent(selectedEvent.id, 'cancel')}
                      disabled={actionLoadingId === `event-mod-${selectedEvent.id}`}
                      className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/35 text-red-500 hover:bg-red-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel Event
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

      {/* DETAILED MEMBER PROFILE & ACTIVITY SUMMARY MODAL */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4 border-b border-[var(--bg-border)]/20 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--empire-cream)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)]">volunteer_activism</span>
                  <span>Volunteer Profile Hub</span>
                </h2>
                <div className="text-[10px] text-[var(--empire-cream)]/50 mt-0.5 font-data select-all">
                  User ID: {selectedProfile.id}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProfile(null);
                  setEditProfileOpen(false);
                  setProfileActivity(null);
                }}
                className="text-[var(--empire-cream)]/40 hover:text-[var(--empire-cream)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {editProfileOpen ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-xs font-body text-[var(--empire-cream)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Display Name</label>
                    <input
                      type="text"
                      required
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">
                      Neighborhood Sighting Area
                    </label>
                    <input
                      type="text"
                      value={editNeighborhood}
                      onChange={(e) => setEditNeighborhood(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Contact Phone</label>
                    <input
                      type="text"
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Preferred Role</label>
                    <input
                      type="text"
                      value={editPreferredRole}
                      onChange={(e) => setEditPreferredRole(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">Rescue Bio / Statement</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl p-3 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)] resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/20 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(false)}
                    className="px-4 py-2 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Back to Info
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === 'profile-save'}
                    className="px-4 py-2 bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Volunteer
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-6 text-xs font-body text-[var(--empire-cream)]">
                {/* Profile fields info card */}
                <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Display Name
                    </span>
                    <p className="font-bold text-sm mt-0.5">{selectedProfile.display_name || 'Unnamed Volunteer'}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Empire Points
                    </span>
                    <p className="font-bold text-sm text-[var(--life-teal)] mt-0.5">
                      {selectedProfile.empire_points.toLocaleString()} pts
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Preferred Specialty Role
                    </span>
                    <p className="font-semibold mt-0.5">{selectedProfile.preferred_role || 'Not declared'}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Local Neighborhood
                    </span>
                    <p className="font-semibold mt-0.5">{selectedProfile.location_neighborhood || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Contact Phone
                    </span>
                    <p className="font-semibold mt-0.5">{selectedProfile.contact_phone || 'None'}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                      Account Status
                    </span>
                    <p className="font-semibold mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          selectedProfile.is_enabled ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <span>{selectedProfile.is_enabled ? 'Active Account' : 'Suspended'}</span>
                    </p>
                  </div>
                  {selectedProfile.bio && (
                    <div className="col-span-1 sm:col-span-2 border-t border-[var(--bg-border)]/20 pt-3">
                      <span className="block text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wide">
                        About / Statement
                      </span>
                      <p className="mt-1 leading-relaxed text-[var(--empire-cream)]/75 italic">
                        "{selectedProfile.bio}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Activity summary block */}
                <div className="border-t border-[var(--bg-border)]/25 pt-4">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--empire-gold)] mb-3">
                    Recent Volunteer Activity
                  </h3>

                  {loadingActivity ? (
                    <div className="py-8 text-center text-[var(--empire-cream)]/50 font-body text-[10px] flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-lg animate-spin text-[var(--empire-gold)]">
                        progress_activity
                      </span>
                      <span>Loading database logs...</span>
                    </div>
                  ) : profileActivity ? (
                    <div className="flex flex-col gap-4 max-h-[30vh] overflow-y-auto pr-1">
                      {/* Grid metrics summary */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[var(--bg-elevated)] p-2.5 rounded-lg border border-[var(--bg-border)]/30 text-center">
                          <div className="font-data font-bold text-sm text-[var(--empire-cream)]">
                            {profileActivity.cats?.length ?? 0}
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                            Cats Sighted
                          </span>
                        </div>
                        <div className="bg-[var(--bg-elevated)] p-2.5 rounded-lg border border-[var(--bg-border)]/30 text-center">
                          <div className="font-data font-bold text-sm text-[var(--empire-cream)]">
                            {profileActivity.organizedEvents?.length ?? 0}
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                            Campaigns Run
                          </span>
                        </div>
                        <div className="bg-[var(--bg-elevated)] p-2.5 rounded-lg border border-[var(--bg-border)]/30 text-center">
                          <div className="font-data font-bold text-sm text-[var(--empire-cream)]">
                            {profileActivity.signups?.length ?? 0}
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/40">
                            Events Attended
                          </span>
                        </div>
                      </div>

                      {/* Log lists */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--empire-cream)]/40 block">
                          History Log
                        </span>
                        {profileActivity.auditLogs?.length === 0 && profileActivity.modQueries?.length === 0 ? (
                          <div className="text-[10px] text-[var(--empire-cream)]/40 italic py-2">
                            No recent audit or query activities logged.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {profileActivity.auditLogs?.map((log: any) => (
                              <div
                                key={log.id}
                                className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--bg-border)]/20 flex justify-between gap-4 text-[10px]"
                              >
                                <span className="font-medium text-[var(--empire-cream)]/85">
                                  {log.details || log.action}
                                </span>
                                <span className="font-data text-[9px] text-[var(--empire-cream)]/40 shrink-0">
                                  {fmtDate(log.created_at)}
                                </span>
                              </div>
                            ))}
                            {profileActivity.modQueries?.map((q: any) => (
                              <div
                                key={q.id}
                                className="bg-amber-500/5 p-2 rounded-lg border border-amber-500/20 flex justify-between gap-4 text-[10px]"
                              >
                                <span className="font-medium text-amber-800">
                                  Query: "{q.message.slice(0, 45)}..." ({q.status})
                                </span>
                                <span className="font-data text-[9px] text-amber-500 shrink-0">
                                  {fmtDate(q.created_at)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-[var(--empire-cream)]/40 italic">
                      Could not retrieve database logs for this volunteer.
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--bg-border)]/20 pt-4 flex gap-3 justify-end flex-wrap">
                  <button
                    onClick={() => setEditProfileOpen(true)}
                    className="px-3.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Edit Profile Details
                  </button>

                  <button
                    onClick={handleToggleProfileEnablement}
                    disabled={actionLoadingId === 'profile-enable-toggle'}
                    className={`px-3.5 py-1.5 border text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                      selectedProfile.is_enabled
                        ? 'bg-red-500/10 border-red-500/35 text-red-500 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 hover:bg-emerald-500/20'
                    }`}
                  >
                    {selectedProfile.is_enabled ? 'Suspend Account' : 'Reinstate Account'}
                  </button>

                  <button
                    onClick={() => {
                      setQueryModal({
                        open: true,
                        targetType: 'profile',
                        targetId: selectedProfile.id,
                        volunteerId: selectedProfile.id,
                      });
                    }}
                    className="px-3.5 py-1.5 bg-sky-500/10 border border-sky-500/35 text-sky-600 hover:bg-sky-500/20 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Raise Direct Query
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RAISE QUERY MODAL */}
      {queryModal?.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
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
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl p-3 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)] resize-none"
              />

              <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/20 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setQueryModal(null);
                    setQueryMessage('');
                  }}
                  className="px-4 py-2 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === 'raise-query'}
                  className="px-4 py-2 bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Send Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* RAISE QUERY TO ADMIN MODAL */}
      {isAdminQueryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--empire-cream)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--empire-gold)]">gavel</span>
                <span>Raise Inquiry to Administrator</span>
              </h3>
              <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-1">
                Submit an official system query to the MeowNet administration board regarding policy, tools, or escalated cases.
              </p>
            </div>

            <form onSubmit={handleRaiseQueryToAdmin} className="flex flex-col gap-4">
              <textarea
                required
                rows={4}
                value={adminQueryMessage}
                onChange={(e) => setAdminQueryMessage(e.target.value)}
                placeholder="Describe your inquiry or case in detail. What assistance or policy clarification is needed from system admins?"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl p-3 text-xs text-[var(--empire-cream)] outline-none focus:border-[var(--empire-gold)] resize-none"
              />

              <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/20 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminQueryOpen(false);
                    setAdminQueryMessage('');
                  }}
                  className="px-4 py-2 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === 'raise-admin-query'}
                  className="px-4 py-2 bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Send Query to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
