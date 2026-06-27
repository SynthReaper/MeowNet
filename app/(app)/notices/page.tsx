'use client';
// app/(app)/notices/page.tsx — Notices Listing and Moderation Dashboard

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { createNotice, updateNotice, deleteNotice, getNotices } from '@/lib/actions/notices';

interface Notice {
  id: string;
  title: string;
  content: string;
  is_broadcast: boolean;
  broadcast_type: 'info' | 'warning' | 'error' | 'success';
  is_popup: boolean;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  created_by: string | null;
  target_page: string;
  profiles: { display_name: string } | null;
}

export default function NoticesPage() {
  const { user: clerkUser } = useUser();
  const supabase = createClient();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [role, setRole] = useState<'user' | 'moderator' | 'admin' | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'broadcast' | 'popup' | 'standard'>('all');
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
  const [isPopup, setIsPopup] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [targetPage, setTargetPage] = useState('all');

  // Fetch notices
  const loadNotices = async () => {
    try {
      const res = await getNotices();
      if (res.success && res.data) {
        setNotices(res.data as Notice[]);
      }
    } catch (e) {
      console.error('Failed to load notices:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      // First try to check Clerk user
      if (clerkUser) {
        const { data } = await (supabase
          .from('profiles' as never)
          .select('role')
          .eq('id', clerkUser.id)
          .single() as any);
        if (data) {
          setRole(data.role);
          return;
        }
      }
      
      // Fallback/direct Supabase Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await (supabase
          .from('profiles' as never)
          .select('role')
          .eq('id', user.id)
          .single() as any);
        if (data) setRole(data.role);
        else setRole(null);
      } else {
        setRole(null);
      }
    };

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('profiles' as never)
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }: any) => {
            if (data) setRole(data.role);
          });
      } else {
        if (clerkUser) {
          supabase
            .from('profiles' as never)
            .select('role')
            .eq('id', clerkUser.id)
            .single()
            .then(({ data }: any) => {
              if (data) setRole(data.role);
              else setRole(null);
            });
        } else {
          setRole(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clerkUser, supabase]);

  // Load notices and subscribe to realtime updates
  useEffect(() => {
    loadNotices();

    const channel = supabase
      .channel('notices_board_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notices' },
        () => {
          loadNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openAddModal = () => {
    setEditingNotice(null);
    setTitle('');
    setContent('');
    setIsBroadcast(false);
    setBroadcastType('info');
    setIsPopup(false);
    setExpiresAt('');
    setTargetPage('all');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setIsBroadcast(notice.is_broadcast);
    setBroadcastType(notice.broadcast_type);
    setIsPopup(notice.is_popup);
    setTargetPage(notice.target_page || 'all');
    
    // Format expires_at for datetime-local input
    if (notice.expires_at) {
      const d = new Date(notice.expires_at);
      // Adjust to timezone offset or just format YYYY-MM-DDTHH:MM
      const offsetMs = d.getTimezoneOffset() * 60 * 1000;
      const localTime = new Date(d.getTime() - offsetMs);
      setExpiresAt(localTime.toISOString().slice(0, 16));
    } else {
      setExpiresAt('');
    }
    
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('is_broadcast', String(isBroadcast));
    formData.append('broadcast_type', broadcastType);
    formData.append('is_popup', String(isPopup));
    formData.append('target_page', targetPage);
    if (expiresAt) {
      formData.append('expires_at', new Date(expiresAt).toISOString());
    }

    try {
      let result;
      if (editingNotice) {
        result = await updateNotice(editingNotice.id, formData);
      } else {
        result = await createNotice(formData);
      }

      if (result.success) {
        setIsModalOpen(false);
        loadNotices();
      } else {
        setFormError(result.error || 'Operation failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      const res = await deleteNotice(id);
      if (res.success) {
        loadNotices();
      } else {
        alert('Failed to delete notice: ' + res.error);
      }
    } catch (e: any) {
      alert('Error deleting notice: ' + e.message);
    }
  };

  const isStaff = role === 'admin' || role === 'moderator';

  // Filter and search
  const filteredNotices = notices.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'broadcast') return n.is_broadcast;
    if (filterType === 'popup') return n.is_popup;
    if (filterType === 'standard') return !n.is_broadcast && !n.is_popup;

    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 flex flex-col gap-8">
      {/* Header section */}
      <section className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
            <span>Community Notice Board</span>
          </h1>
          <p className="font-body text-base text-[var(--text-secondary)]">
            Stay up to date with the latest announcements, safety warnings, and system updates from MeowNet.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={openAddModal}
            className="w-full md:w-auto bg-[var(--empire-gold)] text-white hover:bg-[var(--empire-gold-dim)] font-display text-sm font-bold px-6 py-3.5 rounded-full shadow-ambient hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Create Announcement</span>
          </button>
        )}
      </section>

      {/* Filters and search */}
      <section className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--bg-border)] shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-3.5 top-3 text-[var(--text-muted)] material-symbols-outlined text-xl">search</span>
          <input
            type="text"
            placeholder="Search notices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {(['all', 'broadcast', 'popup', 'standard'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 rounded-xl font-display text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-[var(--empire-gold)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--bg-border)] hover:bg-[var(--bg-border)]/20'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Notices list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] p-6 flex flex-col gap-4 h-[220px]">
              <div className="h-6 bg-[var(--bg-border)]/40 w-3/4 rounded-md"></div>
              <div className="h-4 bg-[var(--bg-border)]/30 w-full rounded-md"></div>
              <div className="h-4 bg-[var(--bg-border)]/30 w-5/6 rounded-md"></div>
              <div className="mt-auto h-8 bg-[var(--bg-border)]/40 w-1/4 rounded-full"></div>
            </div>
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-2xl p-12 border border-[var(--bg-border)] text-center max-w-md mx-auto my-12 shadow-sm">
          <div className="text-4xl mb-4">📢</div>
          <h2 className="font-display text-xl text-[var(--text-primary)] font-bold mb-2">No Notices Found</h2>
          <p className="font-body text-sm text-[var(--text-secondary)] mb-6">There are no active notices or announcements fitting this search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotices.map((n) => {
            const dateStr = new Date(n.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const author = n.profiles?.display_name || 'Staff Member';

            // Card border styling if it is a broadcast
            let cardAccent = 'border-[var(--bg-border)]';
            if (n.is_broadcast) {
              if (n.broadcast_type === 'error') cardAccent = 'border-red-500/40 shadow-[0_4px_16px_rgba(239,68,68,0.06)]';
              else if (n.broadcast_type === 'warning') cardAccent = 'border-orange-500/40 shadow-[0_4px_16px_rgba(249,115,22,0.06)]';
              else if (n.broadcast_type === 'success') cardAccent = 'border-teal-500/40 shadow-[0_4px_16px_rgba(20,184,166,0.06)]';
              else cardAccent = 'border-[var(--empire-gold)]/40 shadow-[0_4px_16px_rgba(148,74,0,0.06)]';
            } else if (n.is_popup) {
              cardAccent = 'border-violet-500/40 shadow-[0_4px_16px_rgba(139,92,246,0.06)]';
            }

            return (
              <article
                key={n.id}
                className={`bg-[var(--bg-surface)] rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${cardAccent}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {n.is_broadcast && (
                      <span
                        className={`px-2 py-0.5 rounded-md font-display font-bold text-[10px] uppercase tracking-wider ${
                          n.broadcast_type === 'error'
                            ? 'bg-red-500/10 text-red-500'
                            : n.broadcast_type === 'warning'
                            ? 'bg-orange-500/10 text-orange-500'
                            : n.broadcast_type === 'success'
                            ? 'bg-teal-500/10 text-teal-500'
                            : 'bg-[var(--empire-gold)]/10 text-[var(--empire-gold)]'
                        }`}
                      >
                        {n.broadcast_type} Broadcast
                      </span>
                    )}
                    {n.is_popup && (
                      <span className="bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-md font-display font-bold text-[10px] uppercase tracking-wider">
                        Popup Dialog
                      </span>
                    )}
                    {!n.is_broadcast && !n.is_popup && (
                      <span className="bg-[var(--bg-border)]/30 text-[var(--text-secondary)] px-2 py-0.5 rounded-md font-display font-bold text-[10px] uppercase tracking-wider">
                        Notice
                      </span>
                    )}
                    {n.expires_at && (
                      <span className="bg-zinc-500/10 text-[var(--text-muted)] px-2 py-0.5 rounded-md font-display text-[10px]">
                        Expires: {new Date(n.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    {n.target_page && n.target_page !== 'all' && (
                      <span className="bg-amber-500/10 text-[var(--empire-gold)] px-2 py-0.5 rounded-md font-display font-bold text-[10px] uppercase tracking-wider">
                        Page: {n.target_page}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-extrabold text-lg text-[var(--text-primary)] mb-2.5 leading-snug">
                    {n.title}
                  </h3>

                  <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed mb-4 whitespace-pre-wrap">
                    {n.content}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--bg-border)]/40 flex justify-between items-center mt-auto">
                  <div className="font-body text-xs text-[var(--text-muted)] flex flex-col">
                    <span className="font-bold text-[var(--text-secondary)]">{author}</span>
                    <span>{dateStr}</span>
                  </div>

                  {isStaff && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(n)}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                        title="Edit Notice"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                        title="Delete Notice"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Form Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-lg rounded-3xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--text-primary)]">
                {editingNotice ? 'Edit Announcement' : 'Create Announcement'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)]"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl font-body flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="notice-title" className="font-display font-bold text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                Title
              </label>
              <input
                id="notice-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Notice title..."
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="notice-content" className="font-display font-bold text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                Content
              </label>
              <textarea
                id="notice-content"
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                placeholder="Write notice body here..."
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all resize-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="notice-expiry" className="font-display font-bold text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                Expiration Date (Optional)
              </label>
              <input
                id="notice-expiry"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="notice-target-page" className="font-display font-bold text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                Target Page / Route
              </label>
              <select
                id="notice-target-page"
                value={targetPage}
                onChange={(e) => setTargetPage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
              >
                <option value="all">All Pages (Global)</option>
                <option value="landing">Landing Page (/)</option>
                <option value="login">Sign In (/auth/login)</option>
                <option value="signup">Sign Up (/auth/signup)</option>
                <option value="map">Cat Map (/map)</option>
                <option value="cats">Browse Cats (/cats)</option>
                <option value="events">TNR Events (/events)</option>
                <option value="empire">Empire Leaderboard (/empire)</option>
                <option value="profile">User Profile (/profile)</option>
                <option value="reports">Field Reports (/reports)</option>
                <option value="safety">Colony Safety (/safety)</option>
                <option value="weather">Weather Watch (/weather)</option>
                <option value="notices">Notice Board (/notices)</option>
              </select>
            </div>

            {/* Admin-only Broadcast options */}
            <div className="border-t border-[var(--bg-border)]/40 pt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-display font-bold text-sm text-[var(--text-primary)]">Global Broadcast Banner</span>
                  <span className="font-body text-xs text-[var(--text-muted)]">Render alert bar at top of all pages.</span>
                </div>
                <input
                  type="checkbox"
                  disabled={role !== 'admin'}
                  checked={isBroadcast}
                  onChange={(e) => {
                    setIsBroadcast(e.target.checked);
                    if (e.target.checked) setIsPopup(false); // Can't be both banner and popup modal
                  }}
                  className="w-5 h-5 accent-[var(--empire-gold)] cursor-pointer disabled:cursor-not-allowed"
                />
              </div>

              {isBroadcast && (
                <div className="flex flex-col gap-2 pl-4 border-l-2 border-[var(--empire-gold)] animate-fade-in">
                  <label htmlFor="broadcast-type" className="font-display font-bold text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    Banner Style
                  </label>
                  <select
                    id="broadcast-type"
                    value={broadcastType}
                    disabled={role !== 'admin'}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] font-body text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--empire-gold)]/35 focus:border-[var(--empire-gold)] transition-all"
                  >
                    <option value="info">Info (Gold)</option>
                    <option value="warning">Warning (Orange)</option>
                    <option value="error">Error (Red)</option>
                    <option value="success">Success (Teal)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-display font-bold text-sm text-[var(--text-primary)]">Site-Wide Popup Dialog</span>
                  <span className="font-body text-xs text-[var(--text-muted)]">Display a popup modal to users on load.</span>
                </div>
                <input
                  type="checkbox"
                  disabled={role !== 'admin'}
                  checked={isPopup}
                  onChange={(e) => {
                    setIsPopup(e.target.checked);
                    if (e.target.checked) setIsBroadcast(false); // Can't be both
                  }}
                  className="w-5 h-5 accent-[var(--empire-gold)] cursor-pointer disabled:cursor-not-allowed"
                />
              </div>

              {role !== 'admin' && (
                <p className="font-body text-xs text-amber-600 dark:text-amber-400 italic">
                  Note: Broadcasts and popup modals can only be created by Administrators.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-[var(--bg-border)]/40 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-display font-bold text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--bg-border)] hover:bg-[var(--bg-border)]/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-6 py-2.5 rounded-xl font-display font-bold text-sm text-white transition-all hover:scale-[1.02] shadow-[0_4px_12px_rgba(148,74,0,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                style={{ background: 'var(--empire-gold)' }}
              >
                {formLoading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Announcement</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
