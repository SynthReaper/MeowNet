'use client';
// components/empire/GuildsInterface/index.tsx — Guild Cooperation Portal (Client Component)

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { joinGuild, leaveGuild, contributeToGuildQuest, userCreateGuild } from '@/lib/actions/gamification';

interface Guild {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  points: number;
  member_count?: number;
  min_points_required?: number;
  category?: string;
  creator_id?: string | null;
}

interface GuildQuest {
  id: string;
  guild_id: string;
  title: string;
  description: string | null;
  target_points: number;
  current_points: number;
  is_completed: boolean;
}

interface GuildsInterfaceProps {
  guilds: Guild[];
  currentGuildId: string | null;
  quests: GuildQuest[];
  userPoints: number;
}

export default function GuildsInterface({
  guilds: initialGuilds,
  currentGuildId: initialGuildId,
  quests: initialQuests,
  userPoints: initialUserPoints
}: GuildsInterfaceProps) {
  const [guilds, setGuilds] = useState<Guild[]>(initialGuilds);
  const [currentGuildId, setCurrentGuildId] = useState<string | null>(initialGuildId);
  const [quests, setQuests] = useState<GuildQuest[]>(initialQuests);
  const [userPoints, setUserPoints] = useState(initialUserPoints);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search, Category, and Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOption, setSortOption] = useState('points_desc');

  // Guild Creation Form State
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [newGuildLogo, setNewGuildLogo] = useState('');
  const [newGuildMinPoints, setNewGuildMinPoints] = useState(0);
  const [newGuildCategory, setNewGuildCategory] = useState('General');
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Real-time synchronization helper
  const fetchUpdatedData = async () => {
    const supabase = createClient();

    try {
      // 1. Fetch all guilds
      const { data: dbGuilds } = await supabase
        .from('guilds' as never)
        .select('*')
        .order('points', { ascending: false });

      // 2. Fetch memberships to count active members
      const { data: dbMembers } = await supabase
        .from('guild_members' as never)
        .select('guild_id');

      const counts: Record<string, number> = {};
      dbMembers?.forEach((m: any) => {
        counts[m.guild_id] = (counts[m.guild_id] || 0) + 1;
      });

      const formattedGuilds = (dbGuilds ?? []).map((g: any) => ({
        ...g,
        member_count: counts[g.id] || 0
      }));

      setGuilds(formattedGuilds);

      // 3. Fetch current user session & status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Membership
        const { data: membership } = await supabase
          .from('guild_members' as never)
          .select('guild_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const guildId = membership ? (membership as any).guild_id : null;
        setCurrentGuildId(guildId);

        // Active Quests
        if (guildId) {
          const { data: dbQuests } = await supabase
            .from('guild_quests' as never)
            .select('*')
            .eq('guild_id', guildId)
            .order('is_completed', { ascending: true });
          setQuests(dbQuests ?? []);
        } else {
          setQuests([]);
        }

        // Profile Points
        const { data: profile } = await supabase
          .from('profiles' as never)
          .select('empire_points')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserPoints((profile as any).empire_points ?? 0);
        }
      }
    } catch (err) {
      console.error('Error fetching realtime updates:', err);
    }
  };

  // Subscribe to realtime updates on component mount
  useEffect(() => {
    fetchUpdatedData();

    const supabase = createClient();
    const channel = supabase.channel('realtime-guild-portal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guilds' }, () => {
        fetchUpdatedData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_members' }, () => {
        fetchUpdatedData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_quests' }, () => {
        fetchUpdatedData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuildName || newGuildName.trim().length < 3) {
      setError('Guild name must be at least 3 characters.');
      return;
    }
    if (!newGuildDesc) {
      setError('Please provide a guild description.');
      return;
    }

    setIsCreating(true);
    setError(null);
    setCreateSuccess(null);

    try {
      const res = await userCreateGuild(
        newGuildName,
        newGuildDesc,
        newGuildLogo,
        newGuildMinPoints,
        newGuildCategory
      ) as any;

      if (res.success && res.guild) {
        setCreateSuccess(`Successfully created and joined "${res.guild.name}"!`);
        setNewGuildName('');
        setNewGuildDesc('');
        setNewGuildLogo('');
        setNewGuildMinPoints(0);
        setNewGuildCategory('General');
        
        // Let the realtime subscription reload the lists and memberships automatically
        fetchUpdatedData();
      } else {
        setError(res.error || 'Failed to create guild.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (guildId: string) => {
    setIsUpdating(guildId);
    setError(null);
    try {
      const res = await joinGuild(guildId);
      if (res.success) {
        // Let realtime subscription handle reloading
        fetchUpdatedData();
      } else {
        setError(res.error || 'Failed to join guild.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleLeave = async (guildId: string) => {
    setIsUpdating(guildId);
    setError(null);
    try {
      const res = await leaveGuild(guildId);
      if (res.success) {
        // Let realtime subscription handle reloading
        fetchUpdatedData();
      } else {
        setError(res.error || 'Failed to leave guild.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleContribute = async (questId: string, amount: number) => {
    if (userPoints < amount) {
      setError('Insufficient points to contribute.');
      return;
    }

    setIsUpdating(questId);
    setError(null);
    try {
      const res = await contributeToGuildQuest(questId, amount);
      if (res.success) {
        // Let realtime subscription handle reloading
        fetchUpdatedData();
      } else {
        setError(res.error || 'Failed to contribute points.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsUpdating(null);
    }
  };

  // 1. Calculate ranks based on global points sorting
  const globalSortedGuilds = [...guilds].sort((a, b) => b.points - a.points);
  const ranks: Record<string, number> = {};
  globalSortedGuilds.forEach((g, index) => {
    ranks[g.id] = index + 1;
  });

  // 2. Filter guilds by search and category
  const filteredGuilds = guilds.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // 3. Sort guilds
  const sortedGuilds = [...filteredGuilds].sort((a, b) => {
    if (sortOption === 'points_desc') return b.points - a.points;
    if (sortOption === 'points_asc') return a.points - b.points;
    if (sortOption === 'members_desc') return (b.member_count || 0) - (a.member_count || 0);
    if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
    return 0;
  });

  const activeGuild = guilds.find(g => g.id === currentGuildId);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Guild Lists & Controls */}
      <div className="lg:col-span-8 bg-[var(--bg-surface)] bg-opacity-70 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)]/50 flex flex-col gap-6">
        
        {/* Header section with search/sort */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--life-teal)] text-3xl font-bold">groups</span>
            <h2 className="font-display text-lg text-[var(--text-primary)] font-bold">Regional Volunteer Guilds</h2>
          </div>

          {/* Search, Filter, Sort Panel */}
          <div className="flex flex-col sm:flex-row gap-3 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/30 w-full items-stretch sm:items-center">
            <div className="flex-1 min-w-[200px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">search</span>
              <input
                type="text"
                placeholder="Search guilds..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)]"
              />
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)]"
              >
                <option value="All">All Categories</option>
                <option value="General">General</option>
                <option value="TNR">TNR</option>
                <option value="Feeding">Feeding</option>
                <option value="Rescue">Rescue</option>
                <option value="Medical">Medical</option>
              </select>
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--empire-gold)]"
              >
                <option value="points_desc">Highest Points</option>
                <option value="points_asc">Lowest Points</option>
                <option value="members_desc">Member Count</option>
                <option value="name_asc">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm font-bold">info</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {sortedGuilds.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3 border border-dashed border-[var(--bg-border)]/50 rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-[var(--text-muted)] opacity-50">search_off</span>
              <p className="font-body text-xs text-[var(--text-secondary)] font-bold">No guilds found matching your criteria.</p>
            </div>
          ) : (
            sortedGuilds.map((guild) => {
              const isMember = currentGuildId === guild.id;
              const updating = isUpdating === guild.id;
              const rank = ranks[guild.id] || 0;
              const minPoints = guild.min_points_required ?? 0;
              const userHasEnough = userPoints >= minPoints;

              return (
                <div
                  key={guild.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-4 ${
                    isMember
                      ? 'border-[var(--life-teal)] bg-[var(--life-teal)]/5'
                      : 'border-[var(--bg-border)]/50 bg-[var(--bg-elevated)]/40 hover:border-[var(--bg-border)]'
                  }`}
                >
                  {/* Guild Logo */}
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[var(--bg-border)] bg-[var(--bg-surface)] flex items-center justify-center shadow-inner">
                    {guild.logo_url ? (
                      <img src={guild.logo_url} alt={guild.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-2xl font-bold text-[var(--life-teal)]">shield_cat</span>
                    )}
                  </div>

                  <div className="flex-grow flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base text-[var(--text-primary)] font-extrabold truncate">
                        {guild.name}
                      </h3>
                      <span className="bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {guild.category || 'General'}
                      </span>
                      {isMember && (
                        <span className="bg-[var(--life-teal)] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Your Guild
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs text-[var(--text-secondary)] line-clamp-2 font-medium">
                      {guild.description || 'No description provided.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {/* Rank badge */}
                      {rank === 1 && (
                        <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-500/20">
                          <span className="material-symbols-outlined text-[10px] font-black" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                          <span>Rank #1</span>
                        </span>
                      )}
                      {rank === 2 && (
                        <span className="bg-slate-400/10 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-slate-400/20">
                          <span className="material-symbols-outlined text-[10px] font-black" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                          <span>Rank #2</span>
                        </span>
                      )}
                      {rank === 3 && (
                        <span className="bg-orange-500/10 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-orange-500/20">
                          <span className="material-symbols-outlined text-[10px] font-black" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                          <span>Rank #3</span>
                        </span>
                      )}
                      {rank > 3 && (
                        <span className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--bg-border)]/20">
                          Rank #{rank}
                        </span>
                      )}

                      <span className="font-body text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">stars</span>
                        <span>{guild.points} points</span>
                      </span>
                      <span className="font-body text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">group</span>
                        <span>{guild.member_count || 1} active members</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {isMember ? (
                      <button
                        onClick={() => handleLeave(guild.id)}
                        disabled={updating || isUpdating !== null}
                        className="px-4 py-2 border border-red-500/20 hover:bg-red-500/10 text-red-500 rounded-xl font-display text-xs font-bold tracking-wide transition-all cursor-pointer"
                      >
                        {updating ? 'Leaving...' : 'Leave'}
                      </button>
                    ) : !userHasEnough ? (
                      <span className="text-[10px] font-extrabold text-red-500 bg-red-500/10 px-3 py-2 rounded-xl flex items-center gap-1 border border-red-500/20">
                        <span className="material-symbols-outlined text-xs font-bold">lock</span>
                        <span>Requires {minPoints} pts</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoin(guild.id)}
                        disabled={updating || isUpdating !== null}
                        className="px-4 py-2 bg-[var(--life-teal)] hover:bg-[#6edcd0] text-white rounded-xl font-display text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm hover:shadow"
                      >
                        {updating ? 'Joining...' : 'Join Guild'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Guild Quests Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Active Quest Board */}
        <div className="bg-[var(--bg-surface)] bg-opacity-70 backdrop-blur-md rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)]/50 flex flex-col gap-4">
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
            <span>Cooperative Quests</span>
          </h3>

          {!currentGuildId ? (
            <div className="text-center py-6 flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-3xl opacity-30 text-[var(--text-muted)]">info</span>
              <p className="font-body text-xs text-[var(--text-secondary)] font-semibold leading-relaxed">
                Join a regional guild to participate and collaborate on neighborhood rescue quests!
              </p>
            </div>
          ) : quests.length === 0 ? (
            <div className="text-center py-6 flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-[var(--life-teal)]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              <p className="font-body text-xs text-[var(--text-secondary)] font-semibold">
                No active quests for {activeGuild?.name || 'this guild'}. All clear!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 rounded-xl flex justify-between items-center">
                <span className="font-body text-xs font-bold text-[var(--text-secondary)]">Your Balance:</span>
                <span className="font-display text-xs font-black text-[var(--empire-gold)]">{userPoints} pts</span>
              </div>

              {quests.map((quest) => {
                const completed = quest.is_completed;
                const percent = Math.min((quest.current_points / quest.target_points) * 100, 100);
                const updating = isUpdating === quest.id;

                return (
                  <div key={quest.id} className="p-4 rounded-xl border border-[var(--bg-border)]/30 bg-[var(--bg-elevated)]/40 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <h4 className="font-body text-xs font-bold text-[var(--text-primary)] truncate">{quest.title}</h4>
                        <p className="font-body text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">{quest.description}</p>
                      </div>
                      {completed && (
                        <span className="material-symbols-outlined text-[var(--life-teal)] font-bold text-lg flex-shrink-0">task_alt</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[9px] font-bold text-[var(--text-muted)] uppercase">
                        <span>Progress</span>
                        <span>{quest.current_points} / {quest.target_points} pts</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--bg-border)]/20">
                        <div
                          className="h-full bg-[var(--life-teal)] rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {!completed && (
                      <button
                        onClick={() => handleContribute(quest.id, 10)}
                        disabled={updating || userPoints < 10}
                        className="w-full py-2 bg-gradient-to-r from-[var(--empire-gold)] to-orange-500 hover:shadow text-white rounded-lg font-display text-[10px] font-extrabold tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">volunteer_activism</span>
                        <span>{updating ? 'Contributing...' : 'Contribute 10 XP'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Your Own Rescue Guild */}
        <div className="bg-[var(--bg-surface)] bg-opacity-70 backdrop-blur-md rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)]/50 flex flex-col gap-4">
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--life-teal)]">add_box</span>
            <span>Launch Your Guild</span>
          </h3>
          <p className="font-body text-[11px] text-[var(--text-secondary)] leading-relaxed font-semibold">
            Gather your neighborhood volunteers, establish a regional squad, and kickstart targeted cooperative stray rescue quests!
          </p>

          {createSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs font-bold">check_circle</span>
              <span>{createSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateGuild} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-body text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Guild Name</label>
              <input
                required
                type="text"
                value={newGuildName}
                onChange={e => setNewGuildName(e.target.value)}
                placeholder="e.g. West End Feline Allies"
                className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)]/60 focus:outline-none focus:border-[var(--empire-gold)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Description</label>
              <textarea
                required
                value={newGuildDesc}
                onChange={e => setNewGuildDesc(e.target.value)}
                placeholder="e.g. Coordinating winter feeders across West End..."
                className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)]/60 focus:outline-none focus:border-[var(--empire-gold)] min-h-[50px] resize-none"
              />
            </div>

            {/* Minimum points to join */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Min Points Required to Join</label>
              <input
                type="number"
                min="0"
                value={newGuildMinPoints}
                onChange={e => setNewGuildMinPoints(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)]/60 focus:outline-none focus:border-[var(--empire-gold)]"
              />
            </div>

            {/* Category selection */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Category</label>
              <select
                value={newGuildCategory}
                onChange={e => setNewGuildCategory(e.target.value)}
                className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)]/60 focus:outline-none focus:border-[var(--empire-gold)]"
              >
                <option value="General">General</option>
                <option value="TNR">TNR</option>
                <option value="Feeding">Feeding</option>
                <option value="Rescue">Rescue</option>
                <option value="Medical">Medical</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Logo Image URL (Optional)</label>
              <input
                type="text"
                value={newGuildLogo}
                onChange={e => setNewGuildLogo(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)]/60 focus:outline-none focus:border-[var(--empire-gold)]"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2 bg-[var(--life-teal)] hover:bg-[#6edcd0] text-white rounded-lg font-display text-[10px] font-extrabold tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xs">group_add</span>
              <span>{isCreating ? 'Launching...' : 'Launch Guild'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
