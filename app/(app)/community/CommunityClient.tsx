'use client';
/* eslint-disable @next/next/no-img-element, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/community/CommunityClient.tsx — Full Reddit/Slack-style Community Hub with WhatsApp-style DMs

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  postCommunityMessage,
  deleteCommunityMessage,
  flagCommunityMessage,
  toggleReaction,
  sendDirectMessage,
  getDirectMessages,
  getDMConversations,
  createCommunityChannel,
  uploadChatMedia,
  createPrivateChannel,
  joinPrivateChannelByInviteCode,
  getChannelMembers,
  markDMsAsRead,
  editDirectMessage,
  deleteDirectMessage,
  type CommunityMessage,
  type Channel,
  type Reaction,
  type DirectMessage,
} from '@/lib/actions/community';
import { createClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio?: string | null;
  preferred_role?: string | null;
  location_neighborhood?: string | null;
}

interface DMConversation {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  lastMessage: string;
  created_at: string;
  unread: boolean;
}

interface TenorItem {
  id: string;
  url: string;
  title: string;
}

interface Props {
  initialMessages: CommunityMessage[];
  initialChannels: Channel[];
  isSignedIn: boolean;
  currentUser: { id: string; role: string; displayName: string; avatarUrl: string | null } | null;
}


const ALL_CHANNELS: Channel[] = [
  { id: 'general',          slug: 'general',          name: 'General',          description: 'Open discussion for everyone',              icon: 'forum' },
  { id: 'adoption-stories', slug: 'adoption-stories', name: 'Adoption Stories', description: 'Share your heartwarming rescue and adoption stories', icon: 'favorite' },
  { id: 'volunteer-hub',    slug: 'volunteer-hub',    name: 'Volunteer Hub',    description: 'Real-time coordination and volunteer dispatch', icon: 'groups' },
  { id: 'urgent-medical',   slug: 'urgent-medical',   name: 'Urgent Medical',   description: 'Emergency medical alerts and care coordination', icon: 'medical_services' },
  { id: 'tnr-ops',          slug: 'tnr-ops',          name: 'TNR Ops',          description: 'Coordinate Trap-Neuter-Return operations',   icon: 'content_cut' },
  { id: 'cat-sightings',    slug: 'cat-sightings',    name: 'Cat Sightings',    description: 'Share and confirm stray cat sightings',      icon: 'pets' },
  { id: 'rescue',           slug: 'rescue',           name: 'Rescue Help',      description: 'Emergency rescue coordination',              icon: 'emergency' },
  { id: 'resources',        slug: 'resources',        name: 'Resources',        description: 'Food drives, supplies, vet contacts',        icon: 'volunteer_activism' },
  { id: 'off-topic',        slug: 'off-topic',        name: 'Off Topic',        description: 'Casual chat and cat pics',                   icon: 'mood' },
  { id: 'management',       slug: 'management',       name: 'Staff Hub',        description: 'Moderator and admin coordination (staff only)', icon: 'admin_panel_settings' },
];
const CHANNELS = ALL_CHANNELS;

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

const EMOJI_CATEGORIES = {
  smileys: {
    label: 'Smileys & Emotion',
    icon: 'sentiment_very_satisfied',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🫣','🤭','🫢','🫡','🤫','🫠','🧐','🤓','😎','🥸','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤔']
  },
  animals: {
    label: 'Animals & Nature',
    icon: 'pets',
    emojis: ['🐱','🐈','🐈‍⬛','🐶','🐕','🦮','🐕‍🦺','🐩','🐺','🦊','🦝','🦁','🐯','🐅','🐆','🐴','🫏','🐎','🦄','🦓','🦌','🫎','🐮','🐂','🐃','🐄','🐷','🐖','🐗','🐽','🐏','🐑','🐐','🐪','🐫','🦙','🦒','🐘','🦣','🦏','🦛','🐭','🐀','🐹','🐰','🐇','🐿️','🦫','🦔','🦥','🐻','🐨','🐼','🐾']
  },
  food: {
    label: 'Food & Drink',
    icon: 'restaurant',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🫓','🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🧆','🍳','🍲','🥗','🍿','🧂']
  },
  activities: {
    label: 'Activities',
    icon: 'sports_soccer',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🪀','🏓','🏑','🥍','🏏','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','skateboard','🛼','🏋️','🤸','⛹️','🧘','🏄','🏊','🤽','🚴']
  },
  objects: {
    label: 'Objects',
    icon: 'lightbulb',
    emojis: ['💡','🔦','🕯️','🪔','🔌','🔋','💿','📷','📸','📹','🎥','📽️','📞','☎️','📺','📻','🎙️','⏰','⏳','🕰️','🧳','🔑','🗝️','🔨','🪓','⛏️','🛠️','🗡️','🛡️','⚙️','🛟','🎁','🎈','✉️']
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RoleBadge({ role }: { role: string | null }) {
  if (role === 'admin') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wider">
      <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1" }}>crown</span>
      Admin
    </span>
  );
  if (role === 'moderator') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[9px] font-bold uppercase tracking-wider">
      <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
      Mod
    </span>
  );
  return null;
}

// Overlapping cat profile avatar presets matching the mockups
const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=100',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=100',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=100',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=100',
];

interface PollProps {
  messageId: string;
  messageText: string;
}

function PollCard({ messageId, messageText }: PollProps) {
  const match = messageText.match(/\[📊 Poll\]\s*([^|]+)\s*\|\s*(.*)/);
  if (!match) return <p className="text-sm font-body">{messageText}</p>;

  const question = match[1].trim();
  const options = match[2].split('|').map(o => o.trim()).filter(Boolean);

  const localStorageKey = `poll_vote_${messageId}`;
  const [selectedOption, setSelectedOption] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem(localStorageKey);
      return val !== null ? Number(val) : null;
    }
    return null;
  });

  const getInitialVotes = () => {
    const seed = messageId.charCodeAt(0) || 10;
    return options.map((_, i) => (seed * (i + 1) + (i % 2 === 0 ? 3 : 7)) % 15);
  };

  const [voteCounts, setVoteCounts] = useState<number[]>(() => {
    const base = getInitialVotes();
    if (selectedOption !== null && base[selectedOption] !== undefined) {
      base[selectedOption] += 1;
    }
    return base;
  });

  const handleVote = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setVoteCounts(prev => {
      const next = [...prev];
      next[idx] += 1;
      return next;
    });
    localStorage.setItem(localStorageKey, String(idx));
  };

  const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="mt-2.5 p-4 bg-[#fdf9f3] border border-[#dbc2b2]/45 rounded-2xl max-w-sm shadow-sm select-none">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="material-symbols-outlined text-[#eb8424] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>poll</span>
        <span className="font-display text-[10px] font-bold text-[#eb8424] uppercase tracking-wider">Community Poll</span>
      </div>
      <h4 className="font-display text-xs font-extrabold text-[#5c4a3c] mb-3 leading-snug">{question}</h4>
      <div className="space-y-1.5">
        {options.map((opt, idx) => {
          const count = voteCounts[idx] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isVoted = selectedOption === idx;
          const isAnyVoted = selectedOption !== null;

          return (
            <button
              key={idx}
              disabled={isAnyVoted}
              onClick={() => handleVote(idx)}
              className={`w-full relative overflow-hidden p-2 rounded-xl border text-left text-[11px] font-semibold font-body transition-all flex items-center justify-between min-h-[36px] bg-white border-[#dbc2b2]/30 ${
                isVoted 
                  ? 'border-[#eb8424] text-[#944a00]' 
                  : isAnyVoted 
                    ? 'text-[#5c4a3c]/50' 
                    : 'hover:border-[#eb8424]/60 hover:bg-[#dbc2b2]/5 text-[#5c4a3c] cursor-pointer'
              }`}
            >
              <div 
                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out z-0 ${
                  isVoted ? 'bg-[#eb8424]/15' : 'bg-[#dbc2b2]/5'
                }`}
                style={{ width: `${percentage}%` }}
              />
              <span className="relative z-10 break-words max-w-[80%]">{opt}</span>
              {isAnyVoted && (
                <span className="relative z-10 font-bold text-[9px] text-[#6b5a4d]/60 shrink-0">
                  {percentage}% ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>
      {totalVotes > 0 && (
        <p className="font-body text-[8px] text-[#6b5a4d]/40 mt-2 font-bold uppercase tracking-wider text-right">
          Total votes: {totalVotes}
        </p>
      )}
    </div>
  );
}

// High-fidelity layout parser for custom message templates
const renderMessageContent = (messageText: string, messageId?: string) => {
  // 1. Check for HVAC System Alert
  if (messageText.includes('[SYSTEM_HVAC_ALERT]')) {
    const content = messageText.replace('[SYSTEM_HVAC_ALERT]', '').trim();
    return (
      <div className="flex items-center justify-center my-2.5 w-full animate-fade-in col-span-full">
        <div className="inline-flex items-center gap-2 px-4.5 py-1.5 bg-[#fdf2f4] border border-[#fbd3db] rounded-full text-[11px] sm:text-xs font-semibold text-[#cf3c56] shadow-sm select-none">
          <span className="material-symbols-outlined text-sm sm:text-base" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
          <span>{content}</span>
        </div>
      </div>
    );
  }

  // 2. Check for Dispatch System Alert
  if (messageText.includes('[SYSTEM_DISPATCH_ALERT]')) {
    const content = messageText.replace('[SYSTEM_DISPATCH_ALERT]', '').trim();
    return (
      <div className="flex items-center justify-center my-2.5 w-full animate-fade-in col-span-full">
        <div className="inline-flex items-center gap-2 px-4.5 py-1.5 bg-[#eafaf9] border border-[#ccefe3] rounded-full text-[11px] sm:text-xs font-semibold text-[#006a63] shadow-sm select-none">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span>{content}</span>
        </div>
      </div>
    );
  }

  // 3. Check for Map Pin Card
  if (messageText.includes('[📍 Map Pin]')) {
    const match = messageText.match(/\[📍 Map Pin\] ([^(]+)\(([^,]+),([^)]+)\)/);
    const label = match ? match[1].trim() : 'Location';
    
    return (
      <div className="flex flex-col gap-2 mt-1">
        <div className="rounded-2xl overflow-hidden border border-[#dbc2b2]/45 w-64 sm:w-80 aspect-[2.2/1] relative bg-[#f7f0e8] flex flex-col justify-end shadow-sm">
          {/* Map Styled background */}
          <div className="absolute inset-0 bg-[#e3d8cd]" style={{
            backgroundImage: 'radial-gradient(#dbc2b2 1.5px, transparent 1.5px)',
            backgroundSize: '16px 16px'
          }} />
          {/* Map Pin in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex flex-col items-center select-none">
              <span className="material-symbols-outlined text-3.5xl text-[#e07a34]" style={{ fontVariationSettings: "'FILL' 1'", filter: 'drop-shadow(0 2.5px 5px rgba(0,0,0,0.18))' }}>location_on</span>
              <span className="w-2.5 h-2.5 rounded-full bg-black/25 blur-[1.5px] absolute -bottom-0.5" />
            </div>
          </div>
          {/* Overlay Label in bottom left */}
          <div className="m-2.5 bg-white border border-[#dbc2b2]/35 px-2.5 py-1 rounded-xl shadow-md z-10 self-start flex items-center gap-1 text-[10px] font-bold text-[#5c4a3c] select-none">
            <span className="material-symbols-outlined text-xs text-[#e07a34]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <span>{label}</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Check for PDF Document File Attachment Card
  if (messageText.includes('[📎 File Attachment:')) {
    const match = messageText.match(/\[📎 File Attachment: ([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      const filename = match[1];
      const url = match[2];
      const size = filename.includes('Roster') ? '1.2 MB' : 'Attachment';
      return (
        <div className="flex items-center justify-between gap-3.5 p-3.5 mt-1.5 bg-[#fdfdfc] border border-[#dbc2b2]/45 rounded-2xl max-w-xs shadow-sm hover:bg-[#f7f0e8]/10 transition-colors select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#e6f7f6] flex items-center justify-center text-[#006a63] shrink-0 border border-[#ccefe3]/40">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-extrabold text-[#5c4a3c] truncate">{filename}</p>
              <p className="font-body text-[10px] text-[#6b5a4d]/50 font-bold">{size}</p>
            </div>
          </div>
          <a href={url} download target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full hover:bg-[#dbc2b2]/20 flex items-center justify-center text-[#6b5a4d] hover:text-[#eb8424] transition-colors shrink-0">
            <span className="material-symbols-outlined text-base">download</span>
          </a>
        </div>
      );
    }
  }

  // 5. Check for Poll Card
  if (messageText.includes('[📊 Poll]')) {
    return <PollCard messageId={messageId ?? 'poll-temp'} messageText={messageText} />;
  }

  // 6. Check for standard image markdown MOCK rendering
  if (messageText.startsWith('![GIF]') || messageText.startsWith('![Image]')) {
    const match = messageText.match(/\((.*?)\)/);
    if (match) {
      return <img src={match[1]} alt="Chat Media" className="rounded-xl max-h-48 shadow-sm border border-[#dbc2b2]/35 object-cover mt-1" />;
    }
  }

  // Standard Plain Text Message
  return <p className="break-words leading-relaxed text-sm font-body">{messageText}</p>;
};


// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunityClient({ initialMessages, initialChannels, isSignedIn: propIsSignedIn, currentUser: propCurrentUser }: Props) {
  const { user: clerkUser, isSignedIn: isClerkSignedIn } = useUser();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setIsSupabaseLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      setIsSupabaseLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = clerkUser?.id ?? supabaseUser?.id;
    if (!userId) {
      if (!isClerkSignedIn && isSupabaseLoaded && !supabaseUser) {
        setCurrentUser(null);
      }
      return;
    }

    const fetchCurrentProfile = async () => {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles' as never)
          .select('id, display_name, avatar_url, role')
          .eq('id', userId)
          .single() as any;

        if (profile) {
          setCurrentUser({
            id: profile.id,
            role: profile.role ?? 'user',
            displayName: profile.display_name ?? clerkUser?.username ?? clerkUser?.firstName ?? 'Volunteer',
            avatarUrl: profile.avatar_url ?? clerkUser?.imageUrl ?? null,
          });
        }
      } catch (e) {
        console.error('Failed to fetch client-side profile:', e);
      }
    };

    fetchCurrentProfile();
  }, [clerkUser, supabaseUser, isClerkSignedIn, isSupabaseLoaded, propCurrentUser]);

  const isSignedIn = isClerkSignedIn || !!supabaseUser || propIsSignedIn;
  const isStaff = currentUser?.role === 'moderator' || currentUser?.role === 'admin';

  // 1. Server Context and Channels state
  const [serverContext, setServerContext] = useState<'public' | 'private' | 'dms'>('public');
  const [channels, setChannels] = useState<Channel[]>(initialChannels);

  // Memoized Channels List (Resolves subscription cycle lag)
  const channelsList = useMemo(() => {
    return ((channels && channels.length > 0) ? channels : CHANNELS)
      .filter(ch => ch.slug !== 'management' || isStaff);
  }, [channels, isStaff]);

  const [activeChannel, setActiveChannel] = useState<Channel | null>(() => {
    const fallback = initialChannels.find(c => !c.is_private) || initialChannels[0] || null;
    return fallback;
  });
  const [activeDMUser, setActiveDMUser] = useState<Profile | null>(null);

  // Channel members & search states
  const [activeChannelMembers, setActiveChannelMembers] = useState<Profile[]>([]);
  const [globalProfiles, setGlobalProfiles] = useState<Profile[]>([]);
  const [inviteCodeText, setInviteCodeText] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [isSearchingDMUser, setIsSearchingDMUser] = useState(false);
  const [isNewChannelPrivate, setIsNewChannelPrivate] = useState(true);

  // Fetch DM partner on URL params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const dmUserId = params.get('dm');
    if (dmUserId) {
      const supabase = createClient();
      supabase
        .from('profiles' as never)
        .select('id, display_name, avatar_url, role')
        .eq('id', dmUserId)
        .single()
        .then((res) => {
          const data = res.data as unknown as Profile | null;
          if (data) {
            setServerContext('dms');
            setActiveDMUser(data);
          }
        });
    }
  }, []);

  // Fetch all global profiles
  useEffect(() => {
    const fetchGlobalProfiles = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles' as never)
          .select('id, display_name, avatar_url, role, bio, preferred_role, location_neighborhood')
          .limit(100) as unknown as { data: Profile[] | null };
        if (data) {
          setGlobalProfiles(data);
        }
      } catch (e) {
        console.error('Failed to fetch global profiles:', e);
      }
    };
    fetchGlobalProfiles();
  }, []);

  // Fetch members of the active private channel
  useEffect(() => {
    if (activeChannel?.is_private && activeChannel?.id) {
      let active = true;
      getChannelMembers(activeChannel.id).then(members => {
        if (active) {
          setActiveChannelMembers(members);
        }
      });

      const supabase = createClient();
      const sub = supabase
        .channel(`members-${activeChannel.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'channel_members',
          filter: `channel_id=eq.${activeChannel.id}`
        }, () => {
          getChannelMembers(activeChannel.id).then(members => {
            if (active) {
              setActiveChannelMembers(members);
            }
          });
        })
        .subscribe();
      return () => {
        active = false;
        supabase.removeChannel(sub);
      };
    }
  }, [activeChannel]);

  // Real-time channels list updates
  useEffect(() => {
    const supabase = createClient();
    const channelsSub = supabase
      .channel('realtime-channels-list')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_channels',
      }, (payload) => {
        const newChan = payload.new as Channel;
        setChannels((prev) => {
          if (prev.some(c => c.id === newChan.id)) return prev;
          return [...prev, newChan];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'community_channels',
      }, (payload) => {
        const updatedChan = payload.new as Channel;
        setChannels((prev) => prev.map(c => c.id === updatedChan.id ? { ...c, ...updatedChan } : c));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'community_channels',
      }, (payload) => {
        setChannels((prev) => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelsSub);
    };
  }, []);

  const [messages, setMessages] = useState<CommunityMessage[]>(initialMessages);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);

  const [text, setText] = useState('');
  const [isPending, setIsPending] = useState(false);

  // Custom messaging states (Location, Polls, Alerts)
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [activeAlertPrefix, setActiveAlertPrefix] = useState<'hvac' | 'dispatch' | 'none'>('none');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [approvedDMs, setApprovedDMs] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('approved_dms_list');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<CommunityMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [reportMsgId, setReportMsgId] = useState<string | null>(null);
  const [reportReasonRule, setReportReasonRule] = useState<string>('Rule 1: Respect & Harassment (No abusive behavior or targeting others)');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Modals state
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [createChannelError, setCreateChannelError] = useState<string | null>(null);

  // Emoji, GIF & Sticker Panel
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiPickerTab, setEmojiPickerTab] = useState<'emojis' | 'gifs' | 'stickers'>('emojis');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [gifSearch, setGifSearch] = useState('');
  const [gifsList, setGifsList] = useState<TenorItem[]>([]);
  const [stickersList, setStickersList] = useState<TenorItem[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);

  // Media attachments
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile cache for resolving realtime message sender details
  const profileCache = useRef<Record<string, { display_name: string; avatar_url: string | null; role: string }>>({});

  useEffect(() => {
    initialMessages.forEach(msg => {
      if (msg.user_id && msg.display_name) {
        profileCache.current[msg.user_id] = {
          display_name: msg.display_name,
          avatar_url: msg.avatar_url,
          role: msg.role ?? 'user'
        };
      }
    });
  }, [initialMessages]);

  const [reactions, setReactions] = useState<Record<string, Reaction[]>>(() => {
    const initial: Record<string, Reaction[]> = {};
    initialMessages.forEach((msg) => {
      if (msg.reactions) {
        initial[msg.id] = msg.reactions;
      }
    });
    return initial;
  });

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch DM conversations list
  const loadConversations = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const data = await getDMConversations();
      const updated = data.map((c) =>
        activeDMUser && c.id === activeDMUser.id ? { ...c, unread: false } : c
      );
      setDmConversations(updated);
    } catch (e) {
      console.error(e);
    }
  }, [isSignedIn, activeDMUser]);

  const handleSelectChannel = useCallback((ch: Channel) => {
    setActiveDMUser(null);
    setActiveChannel(ch);
    setActiveChannelMembers([]);
    setSidebarOpen(false);
  }, []);

  const handleSelectDM = useCallback(async (dm: Profile) => {
    setActiveDMUser(dm);
    setActiveChannel(null);
    setSidebarOpen(false);

    // Mark as read locally immediately
    setDmConversations((prev) =>
      prev.map((c) => (c.id === dm.id ? { ...c, unread: false } : c))
    );

    // Mark as read in backend
    try {
      await markDMsAsRead(dm.id);
    } catch (err) {
      console.error('Failed to mark DMs as read:', err);
    }
  }, [markDMsAsRead]);

  const handleSwitchServerContext = useCallback((context: 'public' | 'private' | 'dms') => {
    setServerContext(context);
    if (context === 'public') {
      const firstPublic = channelsList.find(c => !c.is_private) || null;
      setActiveChannel(firstPublic);
      setActiveDMUser(null);
      setActiveChannelMembers([]);
    } else if (context === 'private') {
      const firstPrivate = channelsList.find(c => c.is_private) || null;
      setActiveChannel(firstPrivate);
      setActiveDMUser(null);
      setActiveChannelMembers([]);
    } else if (context === 'dms') {
      setActiveChannel(null);
      if (dmConversations.length > 0) {
        setActiveDMUser(dmConversations[0]);
      } else {
        setActiveDMUser(null);
      }
      setActiveChannelMembers([]);
    }
  }, [channelsList, dmConversations]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadConversations();
    }, 0);
    return () => clearTimeout(t);
  }, [loadConversations]);

  // Fetch DM messages with active partner
  useEffect(() => {
    if (!isSignedIn || !activeDMUser) return;
    const fetchDMs = async () => {
      const data = await getDirectMessages(activeDMUser.id);
      setDmMessages(data);
      // Mark DMs as read in backend
      try {
        await markDMsAsRead(activeDMUser.id);
      } catch (err) {
        console.error('Failed to mark DMs as read:', err);
      }
    };
    fetchDMs();

    const supabase = createClient();
    // Use a stable, sorted pair as the channel name so this subscription
    // only fires for the exact conversation between the two users.
    const pairKey = [currentUser?.id, activeDMUser.id].sort().join('-');
    const sub = supabase
      .channel(`dm-pair-${pairKey}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, (payload) => {
        const incoming = payload.new as unknown as DirectMessage;
        // Only apply if it belongs to this exact conversation
        const isThisConversation =
          (incoming.sender_id === currentUser?.id && incoming.receiver_id === activeDMUser.id) ||
          (incoming.sender_id === activeDMUser.id && incoming.receiver_id === currentUser?.id);
        if (!isThisConversation) return;
        // Dedup — the optimistic update from handlePost may have already added it
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });

        // If we are actively viewing the conversation and the sender is the other user, mark as read in backend
        if (incoming.sender_id === activeDMUser.id && incoming.receiver_id === currentUser?.id) {
          markDMsAsRead(activeDMUser.id).catch(console.error);
        }

        loadConversations();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
      }, (payload) => {
        const updated = payload.new as unknown as DirectMessage;
        setDmMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'direct_messages',
      }, (payload) => {
        setDmMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [isSignedIn, activeDMUser, currentUser, loadConversations, markDMsAsRead]);

  // Global realtime subscription for direct messages (for unread counts/red dots in sidebar)
  useEffect(() => {
    if (!isSignedIn || !currentUser?.id) return;
    const supabase = createClient();
    
    const sub = supabase
      .channel(`dm-global-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [isSignedIn, currentUser?.id, loadConversations]);

  // Load Tenor GIFs/Stickers
  useEffect(() => {
    if (emojiPickerTab === 'emojis') return;
    const search = async () => {
      setIsLoadingGifs(true);
      const query = gifSearch.trim() || 'cat';
      const endpoint = emojiPickerTab === 'gifs' ? 'gifs' : 'stickers';
      try {
        const res = await fetch(`/api/tenor?type=${endpoint}&q=${encodeURIComponent(query)}&limit=15`);
        const result = await res.json() as { data?: { id: string; url: string; title: string }[] };
        if (result.data) {
          const formatted = result.data.map((gif) => ({
            id: gif.id,
            url: gif.url,
            title: gif.title
          }));
          if (emojiPickerTab === 'gifs') setGifsList(formatted);
          else setStickersList(formatted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingGifs(false);
      }
    };

    const timeout = setTimeout(search, 400);
    return () => clearTimeout(timeout);
  }, [gifSearch, emojiPickerTab]);

  // Filter messages by active channel & search query
  const channelMessages = useMemo(() => {
    if (!activeChannel) return [];
    let filtered = messages.filter(
      (m) => {
        if (m.channel_id && activeChannel.id && activeChannel.id.length > 15) {
          return m.channel_id === activeChannel.id;
        }
        return (m.channel_slug ?? 'general') === activeChannel.slug;
      }
    );
    if (searchQuery.trim()) {
      filtered = filtered.filter(m => m.message.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [messages, activeChannel, searchQuery]);

  // Filter DM messages by search query — dedup by id as a final safety net
  const filteredDmMessages = useMemo(() => {
    // Remove any duplicates first (guard against realtime + optimistic double-add)
    const seen = new Set<string>();
    const unique = dmMessages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    if (!searchQuery.trim()) return unique;
    return unique.filter((m) => m.message.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dmMessages, searchQuery]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, dmMessages.length, activeChannel?.slug, activeDMUser]);

  // Supabase Realtime Channel subscription
  useEffect(() => {
    const supabase = createClient();
    const channelId = `community-messages-${Math.random().toString(36).substring(2, 9)}`;
    
    const sub = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages',
      }, (payload) => {
        const incoming = payload.new as unknown as {
          id: string;
          user_id: string;
          message: string;
          created_at: string;
          is_flagged?: boolean;
          channel_id?: string;
          parent_id?: string;
          edited_at?: string;
        };
        const isOwn = incoming.user_id === currentUser?.id;
        const cached = profileCache.current[incoming.user_id];
        const matchingChannel = channelsList.find(c => c.id === incoming.channel_id);
        const channelSlug = matchingChannel ? matchingChannel.slug : null;

        // Avoid duplicates
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === incoming.id);
          if (exists) return prev;
          return [...prev, {
            id: incoming.id,
            user_id: incoming.user_id,
            message: incoming.message,
            created_at: incoming.created_at,
            is_flagged: incoming.is_flagged ?? false,
            channel_id: incoming.channel_id ?? null,
            channel_slug: channelSlug,
            parent_id: incoming.parent_id ?? null,
            edited_at: incoming.edited_at ?? null,
            display_name: isOwn ? (currentUser?.displayName ?? 'You') : (cached?.display_name ?? 'Anonymous Volunteer'),
            avatar_url: isOwn ? (currentUser?.avatarUrl ?? null) : (cached?.avatar_url ?? null),
            role: isOwn ? (currentUser?.role ?? 'user') : (cached?.role ?? 'user'),
            reactions: [],
          }];
        });

        // Fetch profile details if not cached and not own message
        if (!isOwn && !cached) {
          supabase
            .from('profiles' as never)
            .select('display_name, avatar_url, role')
            .eq('id', incoming.user_id)
            .single()
            .then((res) => {
              const data = res.data as unknown as Profile | null;
              if (data) {
                const resolved = {
                  display_name: data.display_name ?? 'Anonymous Volunteer',
                  avatar_url: data.avatar_url ?? null,
                  role: data.role ?? 'user'
                };
                profileCache.current[incoming.user_id] = resolved;
                setMessages((prev) => prev.map((m) => m.user_id === incoming.user_id ? {
                  ...m,
                  display_name: resolved.display_name,
                  avatar_url: resolved.avatar_url,
                  role: resolved.role,
                } : m));
              }
            });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'community_messages',
      }, (payload) => {
        const updated = payload.new as unknown as {
          id: string;
          message: string;
          is_flagged?: boolean;
          edited_at?: string;
        };
        setMessages((prev) => prev.map((m) => m.id === updated.id ? {
          ...m,
          message: updated.message,
          is_flagged: updated.is_flagged ?? false,
          edited_at: updated.edited_at ?? null,
        } : m));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'community_messages',
      }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      });

    sub.subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentUser, channelsList]);

  // File Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File size exceeds 10MB limit.');
      return;
    }

    setAttachedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedPreview(null);
    }
  };

  const handleClearAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendFormattedMessage = async (formattedText: string) => {
    if (!formattedText.trim() || isPending) return;
    setIsPending(true);
    try {
      if (activeDMUser) {
        const res = await sendDirectMessage(activeDMUser.id, formattedText);
        if (res.success && res.data) {
          const newMsg = res.data;
          setDmMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          loadConversations();
        } else {
          showToast('error', res.error || 'Failed to send message.');
        }
      } else {
        if (!activeChannel) return;
        const res = await postCommunityMessage(formattedText, activeChannel.id);
        if (!res.success) {
          showToast('error', res.error || 'Failed to send message.');
        }
      }
    } catch (e) {
      console.error('Failed to send formatted message:', e);
      showToast('error', 'Failed to send message.');
    } finally {
      setIsPending(false);
    }
  };

  const handleShareLocation = () => {
    if (!('geolocation' in navigator)) {
      showToast('error', 'Geolocation not supported by this browser.');
      return;
    }

    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        const label = prompt('Enter a label for this location (e.g. Stray spotted, Feed station):', 'Volunteer Location') || 'Volunteer Location';
        const formatted = `[📍 Map Pin] ${label} (${lat},${lon})`;
        await sendFormattedMessage(formatted);
        setIsSharingLocation(false);
      },
      (err) => {
        console.error('Failed to get location:', err);
        showToast('error', 'Failed to get location: ' + err.message);
        setIsSharingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) {
      showToast('error', 'Poll question is required.');
      return;
    }
    const filteredOptions = pollOptions.filter(o => o.trim());
    if (filteredOptions.length < 2) {
      showToast('error', 'At least two options are required.');
      return;
    }

    const formatted = `[📊 Poll] ${pollQuestion} | ${filteredOptions.join(' | ')}`;
    await sendFormattedMessage(formatted);

    setPollQuestion('');
    setPollOptions(['', '']);
    setIsPollModalOpen(false);
  };

  const handleApproveDM = (userId: string) => {
    setApprovedDMs(prev => {
      const next = { ...prev, [userId]: true };
      localStorage.setItem('approved_dms_list', JSON.stringify(next));
      return next;
    });
    showToast('success', 'DM request approved! You can now chat.');
  };

  const handlePost = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn) return;
    if (!text.trim() && !attachedFile) return;

    setIsPending(true);
    let mediaUrl = undefined;
    let mediaType = undefined;

    try {
      if (attachedFile) {
        setIsUploadingMedia(true);
        const fd = new FormData();
        fd.set('file', attachedFile);
        const uploadRes = await uploadChatMedia(fd);
        setIsUploadingMedia(false);

        if (uploadRes.success && uploadRes.url) {
          mediaUrl = uploadRes.url;
          mediaType = uploadRes.type;
        } else {
          showToast('error', uploadRes.error || 'Failed to upload media.');
          setIsPending(false);
          return;
        }
      }

      let msgText = text.trim();
      if (activeAlertPrefix === 'hvac') {
        msgText = `[SYSTEM_HVAC_ALERT] ${msgText}`;
      } else if (activeAlertPrefix === 'dispatch') {
        msgText = `[SYSTEM_DISPATCH_ALERT] ${msgText}`;
      }
      setActiveAlertPrefix('none');
      setText('');
      handleClearAttachment();

      if (activeDMUser) {
        const res = await sendDirectMessage(activeDMUser.id, msgText, mediaUrl, mediaType);
        if (res.success && res.data) {
          const newMsg = res.data;
          // Optimistically add — the realtime sub will dedup if it also fires
          setDmMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          loadConversations();
        } else {
          showToast('error', res.error || 'Failed to send direct message.');
        }
      } else {
        if (!activeChannel) {
          showToast('error', 'No active channel selected.');
          setIsPending(false);
          return;
        }
        if (mediaUrl) {
          if (mediaType === 'image') {
            msgText += `\n\n![Image](${mediaUrl})`;
          } else {
            msgText += `\n\n[📎 File Attachment: ${attachedFile?.name || 'Attachment'}](${mediaUrl})`;
          }
        }
        const parentId = replyToMessage?.id;
        setReplyToMessage(null);
        const res = await postCommunityMessage(msgText, activeChannel.id, parentId);
        if (!res.success) showToast('error', res.error || 'Failed to send.');
      }
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsPending(false);
      inputRef.current?.focus();
    }
  };

  const handleSelectGif = async (url: string, type: 'image' | 'sticker') => {
    setIsEmojiPickerOpen(false);
    setIsPending(true);
    try {
      if (activeDMUser) {
        const res = await sendDirectMessage(activeDMUser.id, '', url, type);
        if (res.success && res.data) {
          const newMsg = res.data;
          // Dedup guard same as regular send path
          setDmMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          loadConversations();
        } else {
          showToast('error', res.error || 'Failed to send GIF.');
        }
      } else {
        if (!activeChannel) {
          showToast('error', 'No active channel selected.');
          setIsPending(false);
          return;
        }
        const res = await postCommunityMessage(`![GIF](${url})`, activeChannel.id);
        if (!res.success) showToast('error', res.error || 'Failed to send.');
      }
    } catch {
      showToast('error', 'Network error.');
    } finally {
      setIsPending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  const handleStartEdit = (msg: CommunityMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.message);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    setActionPending(true);
    try {
      if (activeDMUser) {
        const res = await editDirectMessage(msgId, editText.trim());
        if (res.success) {
          setDmMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, message: editText.trim(), edited_at: new Date().toISOString() }
                : m
            )
          );
          setEditingMessageId(null);
          setEditText('');
          showToast('success', 'Message edited.');
        } else {
          showToast('error', res.error || 'Failed to edit direct message.');
        }
      } else {
        const { editCommunityMessage } = await import('@/lib/actions/community');
        const res = await editCommunityMessage(msgId, editText.trim());
        if (res.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, message: editText.trim(), edited_at: new Date().toISOString() }
                : m
            )
          );
          setEditingMessageId(null);
          setEditText('');
          showToast('success', 'Message edited.');
        } else {
          showToast('error', res.error || 'Failed to edit message.');
        }
      }
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setActionPending(false);
    }
  };

  const handleDelete = (msgId: string) => {
    setDeletingMessageId(msgId);
  };

  const handleFlag = async (msgId: string, flagged: boolean) => {
    const res = await flagCommunityMessage(msgId, !flagged);
    if (res.success) {
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, is_flagged: !flagged } : m));
      showToast('success', `Message ${!flagged ? 'flagged' : 'unflagged'}.`);
    } else {
      showToast('error', res.error || 'Failed.');
    }
  };

  const handleReportMessage = (msgId: string) => {
    setReportMsgId(msgId);
    setReportReasonRule('Rule 1: Respect & Harassment (No abusive behavior or targeting others)');
  };

  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    if (!isSignedIn) return;
    setReactions((prev) => {
      const msgReactions = prev[msgId] ?? [];
      const existing = msgReactions.find((r) => r.emoji === emoji);
      if (existing) {
        return {
          ...prev,
          [msgId]: existing.reacted
            ? msgReactions.map((r) => r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), reacted: false } : r).filter((r) => r.count > 0)
            : msgReactions.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r),
        };
      }
      return { ...prev, [msgId]: [...msgReactions, { emoji, count: 1, reacted: true }] };
    });

    try {
      const res = await toggleReaction(msgId, emoji);
      if (!res.success) {
        showToast('error', res.error || 'Failed to update reaction.');
      }
    } catch {
      showToast('error', 'Network error. Reaction not saved.');
    }
  }, [isSignedIn, showToast]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateChannelError(null);
    setIsCreatingChannel(true);

    try {
      const res = isNewChannelPrivate
        ? await createPrivateChannel(newChannelName, newChannelDesc)
        : await createCommunityChannel(newChannelName, newChannelDesc);

      if (res.success && res.data) {
        const newChan = res.data;
        setIsCreateChannelOpen(false);
        setNewChannelName('');
        setNewChannelDesc('');
        showToast('success', `Group "${newChan.name}" created successfully!`);
        
        // Add to local state and activate it
        setChannels((prev) => {
          if (prev.some(c => c.id === newChan.id)) return prev;
          return [...prev, newChan];
        });
        setActiveChannel(newChan);
      } else {
        setCreateChannelError(res.error || 'Failed to create group.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred.';
      setCreateChannelError(msg);
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const handleJoinPrivateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCodeText.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    try {
      const res = await joinPrivateChannelByInviteCode(code);
      if (res.success && res.data) {
        const joinedChan = res.data;
        showToast('success', `Joined group: ${joinedChan.name}`);
        setInviteCodeText('');
        // update local channels list
        setChannels((prev) => {
          if (prev.some(c => c.id === joinedChan.id)) return prev;
          return [...prev, joinedChan];
        });
        setActiveChannel(joinedChan);
      } else {
        showToast('error', res.error || 'Failed to join group.');
      }
    } catch {
      showToast('error', 'Network error joining group.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartDMByUserId = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = searchUserId.trim();
    if (!targetId) return;
    
    // Basic UUID validation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
      showToast('error', 'Invalid User ID format. Must be a UUID.');
      return;
    }
    
    if (targetId === currentUser?.id) {
      showToast('error', 'You cannot direct message yourself.');
      return;
    }
    
    setIsSearchingDMUser(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles' as never)
        .select('id, display_name, avatar_url, role')
        .eq('id', targetId)
        .single() as unknown as { data: Profile | null; error: { message: string } | null };
        
      if (error || !data) {
        showToast('error', 'User not found. Check the ID and try again.');
      } else {
        setActiveDMUser(data);
        setSearchUserId('');
        setServerContext('dms');
        showToast('success', `Conversation started with ${data.display_name}`);
      }
    } catch {
      showToast('error', 'Error querying user profile.');
    } finally {
      setIsSearchingDMUser(false);
    }
  };

  const filteredEmojis = useMemo(() => {
    const list: string[] = [];
    const search = emojiSearch.trim().toLowerCase();
    Object.values(EMOJI_CATEGORIES).forEach((cat) => {
      cat.emojis.forEach((emoji) => {
        if (!search || emoji.includes(search)) {
          list.push(emoji);
        }
      });
    });
    return list;
  }, [emojiSearch]);

  return (
    <div id="community-page-root" className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[var(--bg-surface)]">
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── REDESIGNED UNIFIED SIDEBAR (Mockup 1 & 2) ─────────────────────── */}
      <aside className={`
        fixed lg:relative top-0 left-0 h-full z-40 lg:z-auto
        w-[280px] shrink-0 flex flex-col
        bg-[#f7f0e8] dark:bg-[var(--bg-surface)] border-r border-[#dbc2b2]/45 dark:border-[var(--bg-border)]
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Top Header of Sidebar */}
        <div className="px-5 py-5 border-b border-[#dbc2b2]/35 dark:border-[var(--bg-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Orange Paw Logo Capsule */}
            <div className="w-10 h-10 rounded-xl bg-[#eb8424] flex items-center justify-center text-white shadow-sm shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
            </div>
            <div>
              <div className="font-display text-sm font-extrabold text-[#5c4a3c] dark:text-[var(--text-primary)] leading-tight">Rescue Channels</div>
              <div className="font-body text-[10px] text-[#5c4a3c]/50 dark:text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">Mission Control</div>
            </div>
          </div>
        </div>

        {/* Scrollable channels & DM lists */}
        <div className="flex-grow overflow-y-auto px-3.5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            {/* Render Public & Private Groups */}
            {channelsList.map((ch) => {
              const active = !activeDMUser && activeChannel?.id === ch.id;
              const isVolunteerHub = ch.slug === 'volunteer-hub';
              const isStaffHub = ch.slug === 'management';
              
              let displayIcon = ch.icon;
              // Override icons to match mockups
              if (ch.slug === 'general') displayIcon = 'forum';
              else if (ch.slug === 'adoption-stories') displayIcon = 'favorite';
              else if (ch.slug === 'volunteer-hub') displayIcon = 'groups';
              else if (ch.slug === 'urgent-medical') displayIcon = 'medical_services';

              return (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChannel(ch)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all mb-0.5 cursor-pointer font-body text-xs font-bold ${
                    active
                      ? 'bg-[#eb8424] text-white shadow-sm'
                      : 'text-[#6b5a4d] dark:text-[var(--text-secondary)] hover:bg-[#dbc2b2]/20 dark:hover:bg-[var(--bg-border)]/50 hover:text-[#5c4a3c] dark:hover:text-[var(--text-primary)]'
                  }`}
                  type="button"
                >
                  <span className={`material-symbols-outlined text-base shrink-0 ${active ? 'text-white' : 'opacity-70'}`} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {displayIcon}
                  </span>
                  <span className="truncate flex-1">
                    {ch.name}
                  </span>
                  
                  {isVolunteerHub && (
                    <span className="font-body text-[9px] font-bold bg-[#f2445c] text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-sm">
                      New
                    </span>
                  )}
                  {isStaffHub && (
                    <span className={`font-body text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600'}`}>
                      Staff
                    </span>
                  )}
                </button>
              );
            })}
            {/* Special DM Switcher List Item */}
            {isSignedIn && (
              <button
                onClick={() => handleSwitchServerContext('dms')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all mb-0.5 cursor-pointer font-body text-xs font-bold ${
                  serverContext === 'dms' && !activeDMUser
                    ? 'bg-[#eb8424] text-white shadow-sm'
                    : 'text-[#6b5a4d] hover:bg-[#dbc2b2]/20 hover:text-[#5c4a3c]'
                }`}
                type="button"
              >
                <span className={`material-symbols-outlined text-base shrink-0 ${serverContext === 'dms' && !activeDMUser ? 'text-white' : 'opacity-70'}`} style={serverContext === 'dms' && !activeDMUser ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  mail
                </span>
                <span className="truncate flex-1">Private Messages</span>
              </button>
            )}
          </div>

          {/* Under Private Messages, if the context is DMs, show active direct conversations */}
          {isSignedIn && serverContext === 'dms' && (
            <div className="flex flex-col gap-1.5 border-t border-[#dbc2b2]/35 pt-3.5 pl-1.5">
              <div className="px-2 py-0.5 font-body text-[9px] font-extrabold uppercase tracking-widest text-[#6b5a4d]/40 dark:text-[var(--text-muted)] mb-1 select-none flex items-center justify-between">
                <span>Active DMs</span>
                <span className="material-symbols-outlined text-xs">chat_bubble_outline</span>
              </div>
              
              {/* Start DM: search by display name from loaded profiles */}
              {isSignedIn && (
                <div className="mb-2">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#6b5a4d]/40 dark:text-[var(--text-muted)] pointer-events-none">search</span>
                    <input
                      type="text"
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                      placeholder="Search by name..."
                      className="w-full bg-white dark:bg-[var(--bg-elevated)] border border-[#dbc2b2]/40 dark:border-[var(--bg-border)] rounded-lg pl-6 pr-2 py-1.5 text-[10px] text-[#5c4a3c] dark:text-[var(--text-primary)] outline-none focus:border-[#eb8424]"
                      disabled={isSearchingDMUser}
                    />
                  </div>
                  {/* Dropdown of matching profiles */}
                  {searchUserId.trim().length >= 2 && (
                    <div className="mt-1 bg-white dark:bg-[var(--bg-surface)] border border-[#dbc2b2]/40 dark:border-[var(--bg-border)] rounded-xl overflow-hidden shadow-md max-h-36 overflow-y-auto">
                      {globalProfiles
                        .filter(
                          (p) =>
                            p.id !== currentUser?.id &&
                            (p.display_name ?? '').toLowerCase().includes(searchUserId.toLowerCase())
                        )
                        .slice(0, 6)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handleSelectDM(p);
                              setSearchUserId('');
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#f7f0e8] text-left transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full bg-[#fceee1] border border-[#dbc2b2]/40 flex items-center justify-center shrink-0 overflow-hidden">
                              {p.avatar_url
                                ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                : <span className="text-[8px] font-bold text-[#eb8424]">{p.display_name?.[0]?.toUpperCase() ?? '?'}</span>
                              }
                            </div>
                            <span className="font-body text-[10px] font-semibold text-[#5c4a3c] truncate">{p.display_name ?? 'Unknown'}</span>
                            <RoleBadge role={p.role} />
                          </button>
                        ))}
                      {globalProfiles.filter(
                        (p) => p.id !== currentUser?.id && (p.display_name ?? '').toLowerCase().includes(searchUserId.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-[9px] text-[#6b5a4d]/50 italic">No users found</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {dmConversations.length === 0 ? (
                <div className="px-2 py-3 text-[9px] text-[#6b5a4d]/50 font-body italic select-none text-center bg-white/20 rounded-lg border border-dashed border-[#dbc2b2]/30">
                  No active conversations. Search above to start one.
                </div>
              ) : (
                dmConversations.map((dm) => {
                  const active = activeDMUser?.id === dm.id;
                  return (
                    <button
                      key={dm.id}
                      onClick={() => handleSelectDM(dm)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 cursor-pointer font-body ${
                        active
                          ? 'bg-[#eb8424]/10 text-[#eb8424] border border-[#eb8424]/30 font-bold'
                          : 'text-[#6b5a4d] dark:text-[var(--text-secondary)] hover:bg-[#dbc2b2]/15 dark:hover:bg-[var(--bg-border)]/50 hover:text-[#5c4a3c] dark:hover:text-[var(--text-primary)]'
                      }`}
                      type="button"
                    >
                      {/* Larger, clearer avatar */}
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-[#fceee1] flex-shrink-0 flex items-center justify-center border border-[#dbc2b2]/50 shadow-sm">
                        {dm.avatar_url ? (
                          <img src={dm.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-[#eb8424]">
                            {dm.display_name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate flex items-center justify-between gap-1">
                          <span className="truncate">{dm.display_name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {dm.unread && (
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </div>
                        </div>
                        {dm.lastMessage && (
                          <div className="text-[9px] text-[#6b5a4d]/40 dark:text-[var(--text-muted)] truncate font-normal mt-0.5">
                            {dm.lastMessage.startsWith('![') ? '📷 Image' : dm.lastMessage.slice(0, 30)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Create Group & Join Group Buttons at bottom of channels list */}
        <div className="px-5 py-3 shrink-0 flex gap-2">
          <button
            onClick={() => {
              setIsNewChannelPrivate(currentUser?.role !== 'admin');
              setIsCreateChannelOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1 py-2 border border-[#dbc2b2] dark:border-[var(--bg-border)] hover:border-[#eb8424] text-[#eb8424] hover:bg-white/45 dark:hover:bg-[var(--bg-border)]/50 bg-transparent rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {currentUser?.role === 'admin' ? 'New Channel' : 'New Group'}
          </button>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-1 py-2 border border-[#dbc2b2] dark:border-[var(--bg-border)] hover:border-[#5c4a3c] dark:hover:border-[var(--text-primary)] text-[#5c4a3c] dark:text-[var(--text-secondary)] hover:bg-white/45 dark:hover:bg-[var(--bg-border)]/50 bg-transparent rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            Join Group
          </button>
        </div>

        {/* Bottom Profile details and Settings & Support links */}
        <div className="p-4 border-t border-[#dbc2b2]/35 dark:border-[var(--bg-border)] bg-[#f7f0e8] dark:bg-[var(--bg-surface)] flex flex-col gap-2 shrink-0 select-none">
          {isSignedIn && currentUser && (
            <div className="flex items-center justify-between bg-white/40 dark:bg-[var(--bg-elevated)]/60 border border-[#dbc2b2]/35 dark:border-[var(--bg-border)] p-2 rounded-xl mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#eb8424]/40 shrink-0 flex items-center justify-center bg-[#fceee1]">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display text-xs font-bold text-[#eb8424]">
                      {currentUser.displayName[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-body text-[11px] font-extrabold text-[#5c4a3c] dark:text-[var(--text-primary)] truncate">
                    {currentUser.displayName}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-body text-[9px] text-[#5c4a3c]/50 dark:text-[var(--text-muted)] font-bold">Online</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentUser.id);
                  showToast('success', 'User ID copied!');
                }}
                className="material-symbols-outlined text-[12px] text-[#eb8424] hover:text-[#d66c0e] bg-transparent border-none cursor-pointer p-0.5 shrink-0"
                title="Copy User ID"
              >
                content_copy
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-[#6b5a4d] dark:text-[var(--text-secondary)] text-xs font-bold px-1 mt-1">
            <Link href="/profile" className="flex items-center gap-1.5 hover:text-[#eb8424] no-underline">
              <span className="material-symbols-outlined text-base">settings</span>
              <span>Settings</span>
            </Link>
            <Link href="/moderator?tab=queries" className="flex items-center gap-1.5 hover:text-[#eb8424] no-underline">
              <span className="material-symbols-outlined text-base">help</span>
              <span>Support</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ────────────────────────────── */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden relative bg-[var(--bg-surface)]">
        
        {/* Chat Header */}
        <div className="shrink-0 px-5 lg:px-6 py-4 border-b border-[#dbc2b2]/35 dark:border-[var(--bg-border)] bg-white dark:bg-[var(--bg-surface)] flex items-center justify-between z-10 shadow-sm select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-[#dbc2b2]/40 dark:border-[var(--bg-border)] text-[#6b5a4d] dark:text-[var(--text-secondary)] hover:bg-[#f7f0e8] dark:hover:bg-[var(--bg-border)]/50 transition-all cursor-pointer bg-transparent"
              type="button"
              aria-label="Open sidebar"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>

            {activeDMUser ? (
              <>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#dbc2b2]/35 flex-shrink-0 flex items-center justify-center border border-[#dbc2b2]/50 shadow-sm">
                  {activeDMUser.avatar_url ? (
                    <img src={activeDMUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm text-[#eb8424]">
                      {activeDMUser.display_name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="font-display text-sm font-extrabold text-[#5c4a3c] dark:text-[var(--text-primary)] leading-tight flex items-center gap-1.5">
                    <span>{activeDMUser.display_name}</span>
                    <RoleBadge role={activeDMUser.role} />
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                    <span className="font-body text-[10px] text-[#5c4a3c]/50 dark:text-[var(--text-muted)] font-bold uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </>
            ) : activeChannel ? (
              <>
                <span className="material-symbols-outlined text-xl text-[#eb8424]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {activeChannel.slug === 'general' ? 'forum' : 
                   activeChannel.slug === 'adoption-stories' ? 'favorite' :
                   activeChannel.slug === 'volunteer-hub' ? 'groups' :
                   activeChannel.slug === 'urgent-medical' ? 'medical_services' : activeChannel.icon}
                </span>
                <div>
                  <h1 className="font-display text-sm font-extrabold text-[#5c4a3c] dark:text-[var(--text-primary)] leading-tight">
                    {activeChannel.name}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                    <span className="font-body text-[10px] text-[#5c4a3c]/50 dark:text-[var(--text-muted)] font-bold uppercase tracking-wider">
                      {activeChannel.slug === 'general' ? `${globalProfiles.length || 6} members online • Active` :
                       activeChannel.slug === 'volunteer-hub' ? `${globalProfiles.length || 6} online volunteers • Real-time dispatch` :
                       activeChannel.slug === 'adoption-stories' ? `${Math.max(2, Math.ceil(globalProfiles.length * 0.4))} members online • Sharing stories` :
                       activeChannel.slug === 'urgent-medical' ? `${Math.max(1, Math.ceil(globalProfiles.length * 0.15))} members online • Critical coordination` :
                       `${globalProfiles.length || 6} members online • Active Now`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <h1 className="font-display text-sm font-bold text-[#5c4a3c]/50 dark:text-[var(--text-muted)]">Select a room</h1>
            )}
          </div>

          {/* Right Header elements: overlapping pictures */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isSearching && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="bg-[#f7f0e8] dark:bg-[var(--bg-elevated)] border border-[#dbc2b2]/45 dark:border-[var(--bg-border)] rounded-lg px-2 py-1.5 text-xs text-[#5c4a3c] dark:text-[var(--text-primary)] outline-none focus:border-[#eb8424] w-36 sm:w-48 animate-fade-in"
                  autoFocus
                />
              )}
              <button
                onClick={() => {
                  setIsSearching(!isSearching);
                  if (isSearching) {
                    setSearchQuery('');
                  }
                }}
                className={`material-symbols-outlined text-xl hover:text-[#eb8424] cursor-pointer bg-transparent border-0 ${
                  isSearching ? 'text-[#eb8424]' : 'text-[#6b5a4d] dark:text-[var(--text-secondary)]'
                }`}
                type="button"
                title="Search messages"
              >
                {isSearching ? 'close' : 'search'}
              </button>
            </div>
            
            {!activeDMUser && activeChannel && (
              <div className="flex items-center">
                <div className="flex -space-x-2.5 overflow-hidden">
                  {MOCK_AVATARS.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-[var(--bg-surface)] object-cover"
                    />
                  ))}
                </div>
                <span className="font-body text-[10px] font-extrabold text-[#6b5a4d] dark:text-[var(--text-secondary)] bg-[#f7f0e8] dark:bg-[var(--bg-elevated)] px-2 py-1 rounded-full border border-[#dbc2b2]/40 dark:border-[var(--bg-border)] ml-1.5 shadow-sm">
                  +{Math.max(1, globalProfiles.length - MOCK_AVATARS.length)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Feed Container with repeating cat-head pattern background */}
        <div className="flex-grow overflow-y-auto px-5 lg:px-6 py-6 flex flex-col gap-1.5 cat-pattern">
          {!isSignedIn && (
            <div className="mb-4 flex items-center gap-3 bg-[var(--empire-gold)]/5 border border-[var(--empire-gold)]/20 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-[var(--empire-gold)] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
              <div className="flex-1 font-body text-xs text-[var(--empire-cream)]/60">
                You&apos;re browsing as a guest. <strong className="text-[var(--empire-cream)]">Sign in</strong> to post messages and react.
              </div>
              <Link href="/auth/login" className="shrink-0 bg-[var(--empire-gold)] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg no-underline hover:bg-[#e6b020] transition-all">
                Sign In
              </Link>
            </div>
          )}

          {activeDMUser ? (
            // DMs rendering
            <>
              {activeDMUser && !approvedDMs[activeDMUser.id] && (
                <div className="mb-4 p-4.5 rounded-2xl border border-[#eb8424]/30 bg-[#fdf9f3] max-w-md mx-auto w-full flex flex-col gap-2.5 shadow-sm select-none animate-fade-in text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#eb8424] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble_outline</span>
                    <span className="font-display text-[10px] font-bold text-[#eb8424] uppercase tracking-wider">Incoming Chat Request</span>
                  </div>
                  <p className="font-body text-xs text-[#5c4a3c] leading-relaxed">
                    <strong>{activeDMUser.display_name}</strong> wishes to start a private chat with you. Approve the request to start private messaging.
                  </p>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => handleApproveDM(activeDMUser.id)}
                      className="px-3.5 py-1.5 bg-[#eb8424] hover:bg-[#d66c0e] text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">done</span>
                      <span>Approve Request</span>
                    </button>
                  </div>
                </div>
              )}
              {filteredDmMessages.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-20 text-center select-none">
                <span className="material-symbols-outlined text-5xl text-[var(--empire-gold)]/30 mb-2">forum</span>
                <h2 className="font-display text-base font-bold text-[var(--empire-cream)]/50">
                  {searchQuery.trim() ? 'No matching messages' : 'Start a conversation'}
                </h2>
                <p className="font-body text-xs text-[var(--empire-cream)]/35 mt-1">
                  {searchQuery.trim() ? 'Try adjusting your search query.' : 'Direct messages are private and real-time.'}
                </p>
              </div>
            ) : (
              (() => {
                // Group consecutive DM messages from the same sender (like channel view)
                let lastSenderId: string | null = null;
                let lastTime: number | null = null;
                return filteredDmMessages.map((dm) => {
                  const isOwn = dm.sender_id === currentUser?.id;
                  const dmTime = new Date(dm.created_at).getTime();
                  // Group if same sender and within 5 minutes
                  const isSameGroup =
                    lastSenderId === dm.sender_id &&
                    lastTime !== null &&
                    dmTime - lastTime < 5 * 60 * 1000;
                  lastSenderId = dm.sender_id;
                  lastTime = dmTime;

                  return (
                    <div
                      key={dm.id}
                      className={`group relative flex gap-3 w-full ${
                        isOwn ? 'justify-end' : 'justify-start'
                      } ${isSameGroup ? 'mt-0.5' : 'mt-4'}`}
                      onMouseEnter={() => setHoveredMsg(dm.id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {/* Left avatar — only on first message of incoming group */}
                      {!isOwn && !isSameGroup ? (
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#dbc2b2]/45 shrink-0 bg-[#f7f0e8] flex items-center justify-center shadow-sm">
                          {activeDMUser.avatar_url ? (
                            <img src={activeDMUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-display text-sm font-bold text-[#eb8424]">
                              {activeDMUser.display_name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                          )}
                        </div>
                      ) : !isOwn ? (
                        // Spacer so grouped messages stay aligned
                        <div className="w-9 shrink-0" />
                      ) : null}

                      <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {/* Name + role badge — only on first message of group */}
                        {!isSameGroup && (
                          <div className="flex items-center gap-1.5 mb-1">
                            {!isOwn && (
                              <>
                                <span className="font-body text-[11px] font-bold text-[#5c4a3c]">{activeDMUser.display_name}</span>
                                <RoleBadge role={activeDMUser.role} />
                              </>
                            )}
                            {isOwn && (
                              <span className="font-body text-[11px] font-bold text-[#eb8424]">You</span>
                            )}
                            <span className="font-body text-[10px] text-[#6b5a4d]/35">
                              {new Date(dm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}

                        {/* Message bubble or edit textarea */}
                        {editingMessageId === dm.id ? (
                          <div className="flex flex-col gap-2 mt-1 bg-white p-3 rounded-2xl border border-[#dbc2b2] shadow-sm w-64 sm:w-80 text-left">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full bg-transparent border-0 outline-none font-body text-xs sm:text-sm text-[#5c4a3c] resize-none"
                              rows={2}
                              maxLength={2000}
                              disabled={actionPending}
                            />
                            <div className="flex gap-2 justify-end text-[10px] font-bold uppercase">
                              <button
                                type="button"
                                disabled={actionPending}
                                onClick={handleCancelEdit}
                                className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={actionPending || !editText.trim()}
                                onClick={() => handleSaveEdit(dm.id)}
                                className="px-2 py-1 bg-[#eb8424] text-white rounded-lg hover:bg-[#d66c0e] cursor-pointer disabled:opacity-40"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm border shadow-sm leading-relaxed ${
                            isOwn
                              ? 'bg-[#eb8424] border-[#d66c0e] text-white rounded-tr-sm'
                              : 'bg-white dark:bg-[var(--bg-elevated)] border-[#f0e6dc] dark:border-[var(--bg-border)] text-[#5c4a3c] dark:text-[var(--text-primary)] rounded-tl-sm'
                          }`}>
                            <div className="flex flex-col">
                              {renderMessageContent(dm.message, dm.id)}
                              {dm.edited_at && (
                                <span className="text-[9px] text-[#6b5a4d]/40 mt-1 self-end italic font-semibold select-none flex items-center gap-0.5 opacity-60">
                                  <span className="material-symbols-outlined text-[9px] scale-75">edit</span>
                                  <span>edited</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timestamp on grouped messages (subtle) + sent check for own */}
                        {isSameGroup && (
                          <span className="font-body text-[9px] text-[#6b5a4d]/25 mt-0.5">
                            {new Date(dm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}

                        {/* Sent indicator for own messages */}
                        {isOwn && (
                          <span className="flex items-center gap-0.5 text-[9px] text-[#6b5a4d]/30 mt-0.5 font-body select-none">
                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>done</span>
                            Sent
                          </span>
                        )}
                      </div>

                      {/* Right avatar — only on first message of own group */}
                      {isOwn && !isSameGroup ? (
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#dbc2b2]/45 shrink-0 bg-[#fceee1] flex items-center justify-center shadow-sm">
                          {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-display text-xs font-bold text-[#eb8424]">ME</span>
                          )}
                        </div>
                      ) : isOwn ? (
                        // Spacer so grouped messages stay aligned
                        <div className="w-9 shrink-0" />
                      ) : null}

                      {/* Hover Reaction Toolbar Menu for DMs */}
                      {hoveredMsg === dm.id && (
                        <div className={`absolute -top-3.5 flex items-center gap-0.5 bg-white border border-[#dbc2b2]/45 rounded-xl shadow-md px-1.5 py-0.5 z-10 animate-fade-in ${
                          isOwn ? 'right-12' : 'left-12'
                        }`}>
                          {(() => {
                            const elapsed = Date.now() - new Date(dm.created_at).getTime();
                            const canEdit = isOwn && elapsed < 15 * 60 * 1000;
                            return canEdit ? (
                              <button
                                onClick={() => {
                                  setEditingMessageId(dm.id);
                                  setEditText(dm.message);
                                }}
                                className="p-1 rounded text-[#6b5a4d]/50 hover:text-[#eb8424] hover:bg-[#dbc2b2]/20 transition-all cursor-pointer bg-transparent border-none flex items-center"
                                type="button"
                                title="Edit message"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                            ) : null;
                          })()}

                          {isOwn && (
                            <button
                              onClick={() => handleDelete(dm.id)}
                              className="p-1 rounded text-[#6b5a4d]/50 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer bg-transparent border-none flex items-center"
                              type="button"
                              title="Delete message"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()  )}
            </>
          ) : activeChannel ? (
            // Channel Feed Messages rendering
            channelMessages.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-20 text-center select-none">
                <span className="material-symbols-outlined text-5xl text-[var(--empire-gold)]/30 mb-2">forum</span>
                <h2 className="font-display text-base font-bold text-[var(--empire-cream)]/50">No messages yet</h2>
                <p className="font-body text-xs text-[var(--empire-cream)]/35 mt-1">Be the first to say something in #{activeChannel.name}!</p>
              </div>
            ) : (
              channelMessages.map((msg, idx) => {
                const prev = channelMessages[idx - 1];
                const isSystemAlert = msg.message.includes('[SYSTEM_HVAC_ALERT]') || msg.message.includes('[SYSTEM_DISPATCH_ALERT]');
                
                if (isSystemAlert) {
                  return (
                    <div key={msg.id} className="w-full">
                      {renderMessageContent(msg.message, msg.id)}
                    </div>
                  );
                }

                const isSameAuthor = prev && prev.user_id === msg.user_id &&
                  (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000;
                const isOwn = currentUser?.id === msg.user_id;
                const msgReactions = reactions[msg.id] ?? [];

                return (
                  <div
                    key={msg.id}
                    className={`group relative flex gap-3 w-full ${isOwn ? 'justify-end' : 'justify-start'} ${isSameAuthor ? 'mt-0.5' : 'mt-4'}`}
                    onMouseEnter={() => setHoveredMsg(msg.id)}
                    onMouseLeave={() => setHoveredMsg(null)}
                  >
                    {/* Left Avatar for incoming */}
                    {!isOwn && !isSameAuthor && (
                      <button
                        onClick={() => setSelectedProfileId(msg.user_id)}
                        className="w-9 h-9 rounded-full border border-[#dbc2b2]/45 overflow-hidden flex items-center justify-center shadow-sm shrink-0 cursor-pointer bg-[#f7f0e8]"
                      >
                        {msg.avatar_url ? (
                          <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-display text-sm font-bold text-[#eb8424]">
                            {(msg.display_name ?? 'V')[0].toUpperCase()}
                          </span>
                        )}
                      </button>
                    )}
                    
                    {!isOwn && isSameAuthor && <div className="w-9 shrink-0" />}

                    <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isSameAuthor && (
                        <div className="flex items-center gap-2 mb-1 text-[11px] text-[#6b5a4d]/45 font-bold">
                          {isOwn ? (
                            <>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-[#eb8424] font-bold">You</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-[#5c4a3c]">{msg.display_name ?? 'Anonymous'}</span>
                              <RoleBadge role={msg.role} />
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Reply Target Header if reply */}
                      {msg.parent_id && (() => {
                        const parentMsg = messages.find(m => m.id === msg.parent_id);
                        return parentMsg ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#6b5a4d]/50 mb-1 select-none font-bold">
                            <span className="material-symbols-outlined text-xs">reply</span>
                            <span>Replying to <strong>{parentMsg.display_name}</strong></span>
                            <span className="truncate max-w-[120px] italic">&quot;{parentMsg.message}&quot;</span>
                          </div>
                        ) : null;
                      })()}

                      {/* Main Message Bubble */}
                      {editingMessageId === msg.id ? (
                        <div className="flex flex-col gap-2 mt-1 bg-white p-3 rounded-2xl border border-[#dbc2b2] shadow-sm w-64 sm:w-80">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-transparent border-0 outline-none font-body text-xs sm:text-sm text-[#5c4a3c] resize-none"
                            rows={2}
                            maxLength={2000}
                            disabled={actionPending}
                          />
                          <div className="flex gap-2 justify-end text-[10px] font-bold uppercase">
                            <button
                              type="button"
                              disabled={actionPending}
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={actionPending || !editText.trim()}
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-2 py-1 bg-[#eb8424] text-white rounded-lg hover:bg-[#d66c0e] cursor-pointer disabled:opacity-40"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-2xl p-4 text-xs sm:text-sm border shadow-sm ${
                          isOwn
                            ? 'bg-[#eb8424] border-[#d66c0e] text-white rounded-tr-none'
                            : 'bg-white dark:bg-[var(--bg-elevated)] border-[#f0e6dc] dark:border-[var(--bg-border)] text-[#5c4a3c] dark:text-[var(--text-primary)] rounded-tl-none'
                        } ${msg.is_flagged ? 'border-red-200' : ''}`}>
                          {msg.is_flagged ? (
                            isStaff ? (
                              <span className="flex flex-col gap-1 border-l-2 border-red-500 pl-2 text-left">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase select-none">
                                  <span className="material-symbols-outlined text-xs">warning</span>
                                  <span>Flagged (Staff HQ visibility only)</span>
                                </span>
                                <span className="italic text-[#5c4a3c]/60">{msg.message}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-red-500 italic text-[11px] font-semibold select-none">
                                <span className="material-symbols-outlined text-xs">flag</span>
                                <span>This message was flagged by moderation.</span>
                              </span>
                            )
                          ) : (
                            <div className="flex flex-col">
                              {renderMessageContent(msg.message, msg.id)}
                              {msg.edited_at && (
                                <span className="text-[9px] text-[#6b5a4d]/40 mt-1 self-end italic font-semibold select-none flex items-center gap-0.5 opacity-60">
                                  <span className="material-symbols-outlined text-[9px] scale-75">edit</span>
                                  <span>edited</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reactions list */}
                      {msgReactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {msgReactions.map((r) => (
                            <button
                              key={r.emoji}
                              onClick={() => handleReact(msg.id, r.emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] transition-all cursor-pointer ${
                                r.reacted
                                  ? 'bg-[#eb8424]/10 border-[#eb8424]/40 text-[#eb8424]'
                                  : 'bg-white border-[#dbc2b2]/40 text-[#6b5a4d] hover:border-[#eb8424]/30'
                              }`}
                              type="button"
                            >
                              {r.emoji} <span className="font-body font-bold text-[9px]">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Avatar for outgoing */}
                    {isOwn && !isSameAuthor && (
                      <button
                        onClick={() => setSelectedProfileId(msg.user_id)}
                        className="w-9 h-9 rounded-full border border-[#dbc2b2]/45 overflow-hidden flex items-center justify-center shadow-sm shrink-0 cursor-pointer bg-[#fceee1]"
                      >
                        {currentUser?.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-display text-xs font-bold text-[#eb8424]">
                            ME
                          </span>
                        )}
                      </button>
                    )}
                    
                    {isOwn && isSameAuthor && <div className="w-9 shrink-0" />}

                    {/* Hover Reaction Toolbar Menu */}
                    {hoveredMsg === msg.id && (
                      <div className={`absolute -top-3.5 flex items-center gap-0.5 bg-white border border-[#dbc2b2]/45 rounded-xl shadow-md px-1.5 py-0.5 z-10 animate-fade-in ${
                        isOwn ? 'right-12' : 'left-12'
                      }`}>
                        {isSignedIn && QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className="text-xs p-1 rounded hover:bg-[#dbc2b2]/20 transition-all cursor-pointer border-none bg-transparent"
                            type="button"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}

                        {isSignedIn && (
                          <button
                            onClick={() => setReplyToMessage(msg)}
                            className="p-1 rounded text-[#6b5a4d]/50 hover:text-[#eb8424] hover:bg-[#dbc2b2]/20 transition-all cursor-pointer bg-transparent border-none flex items-center"
                            type="button"
                            title="Reply"
                          >
                            <span className="material-symbols-outlined text-sm">reply</span>
                          </button>
                        )}

                        {(() => {
                          const elapsed = Date.now() - new Date(msg.created_at).getTime();
                          const canEdit = isOwn && elapsed < 15 * 60 * 1000;
                          return canEdit ? (
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="p-1 rounded text-[#6b5a4d]/50 hover:text-[#eb8424] hover:bg-[#dbc2b2]/20 transition-all cursor-pointer bg-transparent border-none flex items-center"
                              type="button"
                              title="Edit message"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                          ) : null;
                        })()}

                        {isStaff ? (
                          <button
                            onClick={() => handleFlag(msg.id, msg.is_flagged)}
                            className={`p-1 rounded transition-all cursor-pointer bg-transparent border-none flex items-center ${msg.is_flagged ? 'text-red-500 hover:bg-red-50' : 'text-[#6b5a4d]/50 hover:text-amber-500 hover:bg-amber-50'}`}
                            type="button"
                            title={msg.is_flagged ? 'Unflag' : 'Flag message'}
                          >
                            <span className="material-symbols-outlined text-sm" style={msg.is_flagged ? { fontVariationSettings: "'FILL' 1" } : {}}>flag</span>
                          </button>
                        ) : (
                          isSignedIn && !isOwn && !msg.is_flagged && (
                            <button
                              onClick={() => handleReportMessage(msg.id)}
                              className="p-1 rounded text-[#6b5a4d]/50 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer bg-transparent border-none flex items-center"
                              type="button"
                              title="Report message to moderators"
                            >
                              <span className="material-symbols-outlined text-sm">flag</span>
                            </button>
                          )
                        )}
                        {(isOwn || isStaff) && (
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="p-1 rounded text-[#6b5a4d]/50 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer bg-transparent border-none flex items-center"
                            type="button"
                            title="Delete message"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center select-none">
              <span className="material-symbols-outlined text-5xl text-[#eb8424]/25 mb-3">forum</span>
              <h2 className="font-display text-base font-bold text-[#5c4a3c]/60">Welcome to MeowNet Chat</h2>
              <p className="font-body text-xs text-[#6b5a4d]/50 mt-1 max-w-sm">
                Select one of the rescue channels on the sidebar, or search by User ID to start a secure private conversation.
              </p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Media Upload Preview Panel */}
        {attachedFile && (
          <div className="px-5 lg:px-6 py-2.5 bg-[#f7f0e8]/50 border-t border-[#dbc2b2]/35 flex items-center justify-between gap-3 animate-slide-up select-none">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-[#eb8424]">
                {attachedFile.type.startsWith('image/') ? 'image' : attachedFile.type.startsWith('video/') ? 'video_file' : 'picture_as_pdf'}
              </span>
              <div className="text-xs font-body">
                <p className="font-extrabold text-[#5c4a3c] truncate max-w-md">{attachedFile.name}</p>
                <p className="text-[10px] text-[#6b5a4d]/60 font-bold">{(attachedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {attachedPreview && (
              <img src={attachedPreview} alt="" className="h-10 w-10 object-cover rounded-lg border border-[#dbc2b2]/45" />
            )}
            <button
              onClick={handleClearAttachment}
              className="text-[#6b5a4d]/40 hover:text-red-400 p-1 bg-transparent border-none cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Smiley Emoji/GIF Drawer Panel */}
        {isEmojiPickerOpen && (
          <div className="mx-5 lg:mx-6 mb-2 bg-[#f7f0e8] border border-[#dbc2b2]/45 rounded-2xl shadow-2xl flex flex-col h-72 z-20">
            <div className="flex justify-between items-center bg-white px-4 py-2 border-b border-[#dbc2b2]/35 rounded-t-2xl">
              <div className="flex gap-4">
                {[
                  { id: 'emojis', label: 'Emojis', icon: 'mood' },
                  { id: 'gifs', label: 'GIFs', icon: 'gif' },
                  { id: 'stickers', label: 'Stickers', icon: 'store' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setEmojiPickerTab(t.id as 'emojis' | 'gifs' | 'stickers')}
                    className={`font-body text-xs font-bold flex items-center gap-1.5 pb-1 cursor-pointer border-b-2 transition-all ${
                      emojiPickerTab === t.id
                        ? 'text-[#eb8424] border-[#eb8424]'
                        : 'text-[#6b5a4d]/50 border-transparent hover:text-[#5c4a3c]'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setIsEmojiPickerOpen(false)} className="text-[#6b5a4d]/40 hover:text-red-400 p-1 bg-transparent border-none cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 bg-white/40">
              {emojiPickerTab === 'emojis' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-white border border-[#dbc2b2]/45 rounded-xl px-3 py-1.5">
                    <span className="material-symbols-outlined text-sm text-[#6b5a4d]/40">search</span>
                    <input
                      type="text"
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                      placeholder="Search emojis..."
                      className="w-full bg-transparent border-none outline-none text-xs font-body text-[#5c4a3c] placeholder-[#6b5a4d]/40"
                    />
                  </div>
                  <div className="grid grid-cols-8 sm:grid-cols-12 gap-2 text-2xl">
                    {filteredEmojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setText((prev) => prev + emoji);
                          inputRef.current?.focus();
                        }}
                        className="hover:scale-110 active:scale-95 transition-all p-1.5 rounded bg-white/40 hover:bg-white cursor-pointer border-none outline-none"
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-white border border-[#dbc2b2]/45 rounded-xl px-3 py-1.5">
                    <span className="material-symbols-outlined text-sm text-[#6b5a4d]/40">search</span>
                    <input
                      type="text"
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                      placeholder={`Search Tenor ${emojiPickerTab === 'gifs' ? 'GIFs' : 'Stickers'}...`}
                      className="w-full bg-transparent border-none outline-none text-xs font-body text-[#5c4a3c] placeholder-[#6b5a4d]/40"
                    />
                  </div>
                  {isLoadingGifs ? (
                    <div className="flex items-center justify-center p-8">
                      <span className="material-symbols-outlined animate-spin text-[#eb8424]">progress_activity</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {(emojiPickerTab === 'gifs' ? gifsList : stickersList).map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectGif(item.url, emojiPickerTab === 'gifs' ? 'image' : 'sticker')}
                          className="hover:scale-102 active:scale-95 transition-all rounded-lg overflow-hidden border border-[#dbc2b2]/45 cursor-pointer p-0 bg-transparent"
                          type="button"
                        >
                          <img src={item.url} alt={item.title} className="w-full h-24 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Message panel */}
        <div className="shrink-0 border-t border-[#dbc2b2]/35 px-5 lg:px-6 py-4 bg-white z-10 select-none">
          {isSignedIn ? (
            (activeChannel || activeDMUser) ? (
              activeDMUser && !approvedDMs[activeDMUser.id] ? (
                <div className="flex flex-col items-center justify-center gap-2.5 bg-[#fdf9f3]/50 border border-dashed border-[#dbc2b2]/45 rounded-2xl py-6 px-6 max-w-xl mx-auto w-full text-center select-none shadow-sm">
                  <span className="material-symbols-outlined text-[#eb8424] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  <p className="font-body text-xs font-bold text-[#5c4a3c] leading-relaxed">
                    DM Request Pending. Please approve the chat request above to start private conversations.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePost} className="flex flex-col gap-2 max-w-4xl mx-auto">
                  {replyToMessage && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#eb8424]/5 border-l-2 border-[#eb8424] rounded-r-lg text-xs mb-2">
                      <div className="flex items-center gap-1.5 text-[#6b5a4d]/85">
                        <span className="material-symbols-outlined text-sm">reply</span>
                        <span>Replying to <strong>{replyToMessage.display_name}</strong>:</span>
                        <span className="truncate max-w-[200px] italic">&quot;{replyToMessage.message}&quot;</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyToMessage(null)}
                        className="text-[#6b5a4d]/40 hover:text-red-400 p-0.5 cursor-pointer bg-transparent border-0 flex items-center"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )}
                  
                  {isStaff && (
                    <div className="flex gap-2 mb-1.5 select-none items-center pl-3">
                      <span className="text-[10px] font-bold text-[#6b5a4d]/50 uppercase tracking-wider">Alert Broadcast:</span>
                      <button
                        type="button"
                        onClick={() => setActiveAlertPrefix(activeAlertPrefix === 'hvac' ? 'none' : 'hvac')}
                        className={`text-[9px] px-2.5 py-1 rounded-full font-bold transition-all border cursor-pointer ${
                          activeAlertPrefix === 'hvac'
                            ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
                            : 'bg-transparent text-[#6b5a4d]/60 border-[#dbc2b2]/40 hover:bg-[#dbc2b2]/10'
                        }`}
                      >
                        ⚠️ HVAC Alert
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAlertPrefix(activeAlertPrefix === 'dispatch' ? 'none' : 'dispatch')}
                        className={`text-[9px] px-2.5 py-1 rounded-full font-bold transition-all border cursor-pointer ${
                          activeAlertPrefix === 'dispatch'
                            ? 'bg-[#eafaf9] text-[#006a63] border-[#ccefe3] shadow-sm'
                            : 'bg-transparent text-[#6b5a4d]/60 border-[#dbc2b2]/40 hover:bg-[#dbc2b2]/10'
                        }`}
                      >
                        📍 Dispatch Alert
                      </button>
                    </div>
                  )}

                  {/* Main Input Pill Box */}
                  <div className="flex items-center gap-2 bg-[#fdf9f3]/60 border border-[#dbc2b2]/45 rounded-[32px] pl-2.5 pr-1.5 py-1.5 focus-within:border-[#eb8424] focus-within:bg-white transition-all shadow-inner">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,application/pdf"
                    />
                    
                    {/* Attachments Menu Button */}
                    <div className="relative shrink-0 flex items-center">
                      <button
                        onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                        type="button"
                        title="Attach files, location, polls, events"
                        className={`h-8 w-8 rounded-full hover:bg-[#dbc2b2]/20 flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent shrink-0 ${
                          isAttachmentMenuOpen ? 'text-[#eb8424] bg-[#dbc2b2]/10' : 'text-[#6b5a4d]/60'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{isAttachmentMenuOpen ? 'close' : 'add'}</span>
                      </button>

                      {isAttachmentMenuOpen && (
                        <div className="absolute bottom-10 left-0 bg-white border border-[#dbc2b2]/45 rounded-2xl shadow-xl p-2.5 w-52 flex flex-col gap-1 z-50 animate-fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              fileInputRef.current?.click();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#dbc2b2]/10 text-left rounded-xl transition-all cursor-pointer font-body text-xs font-bold text-[#5c4a3c]"
                          >
                            <span className="material-symbols-outlined text-base text-[#6b5a4d]">image</span>
                            <span>Photo, Video or PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              handleShareLocation();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#dbc2b2]/10 text-left rounded-xl transition-all cursor-pointer font-body text-xs font-bold text-[#5c4a3c]"
                          >
                            <span className="material-symbols-outlined text-base text-[#eb8424]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                            <span>Share Location</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              setIsPollModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#dbc2b2]/10 text-left rounded-xl transition-all cursor-pointer font-body text-xs font-bold text-[#5c4a3c]"
                          >
                            <span className="material-symbols-outlined text-base text-[#eb8424]">poll</span>
                            <span>Create Poll</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setIsAttachmentMenuOpen(false);
                              const title = prompt('Enter Event Title:', 'Colony Cleanup Day') || 'Colony Cleanup Day';
                              const url = prompt('Enter Event URL or path:', '/events') || '/events';
                              const formatted = `[📎 File Attachment: ${title}](${url})`;
                              await sendFormattedMessage(formatted);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#dbc2b2]/10 text-left rounded-xl transition-all cursor-pointer font-body text-xs font-bold text-[#5c4a3c]"
                          >
                            <span className="material-symbols-outlined text-base text-[#006a63]">calendar_today</span>
                            <span>Share Event Link</span>
                          </button>
                          {isStaff && (
                            <>
                              <div className="border-t border-[#dbc2b2]/35 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAttachmentMenuOpen(false);
                                  setActiveAlertPrefix(activeAlertPrefix === 'hvac' ? 'none' : 'hvac');
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#dbc2b2]/10 text-left rounded-xl transition-all cursor-pointer font-body text-xs font-bold ${
                                  activeAlertPrefix === 'hvac' ? 'text-red-600 bg-red-50' : 'text-[#6b5a4d]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">warning</span>
                                <span>Broadcast HVAC Alert</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAttachmentMenuOpen(false);
                                  setActiveAlertPrefix(activeAlertPrefix === 'dispatch' ? 'none' : 'dispatch');
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#dbc2b2]/10 text-left rounded-xl transition-all cursor-pointer font-body text-xs font-bold ${
                                  activeAlertPrefix === 'dispatch' ? 'text-[#006a63] bg-[#eafaf9]' : 'text-[#6b5a4d]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">emergency_share</span>
                                <span>Broadcast Dispatch</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Emoji Button */}
                    <button
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                      type="button"
                      title="Emojis & GIFs"
                      className={`h-8 w-8 rounded-full hover:bg-[#dbc2b2]/20 flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent shrink-0 ${isEmojiPickerOpen ? 'text-[#eb8424] bg-[#dbc2b2]/10' : 'text-[#6b5a4d]/60'}`}
                    >
                      <span className="material-symbols-outlined text-xl">sentiment_satisfied</span>
                    </button>

                    {/* Main Textarea */}
                    <textarea
                      ref={inputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        activeDMUser
                          ? `Message ${activeDMUser.display_name}...`
                          : activeChannel
                            ? `Type a message to ${activeChannel.name}...`
                            : 'Type a message...'
                      }
                      rows={1}
                      maxLength={2000}
                      disabled={isPending || isUploadingMedia}
                      className="flex-1 resize-none bg-transparent border-none outline-none font-body text-xs sm:text-sm text-[#5c4a3c] dark:text-[var(--text-primary)] placeholder-[#6b5a4d]/45 dark:placeholder-[var(--text-muted)] leading-normal py-1.5 px-1 min-h-[22px] max-h-[120px] disabled:opacity-50"
                      style={{ scrollbarWidth: 'none' }}
                    />
                    
                    {/* Round Send Button */}
                    <button
                      type="submit"
                      disabled={isPending || isUploadingMedia || (!text.trim() && !attachedFile)}
                      className="shrink-0 w-8.5 h-8.5 rounded-full bg-[#944a00] hover:bg-[#eb8424] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
                      title="Send Message"
                    >
                      {isPending || isUploadingMedia ? (
                        <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                      )}
                    </button>
                  </div>

                <div className="flex items-center justify-center px-1 select-none">
                  <span className="font-body text-[9px] text-[#6b5a4d]/40 font-bold uppercase tracking-wider">
                    Shift + Enter to add a new line
                  </span>
                </div>
              </form>
            )
          ) : (
            <div className="text-center py-2 text-xs font-body text-[#6b5a4d]/40 font-bold select-none">
              Select a channel or conversation to start chatting.
            </div>
          )
        ) : (
            <div className="flex items-center justify-between gap-3 bg-[#fdf9f3]/60 border border-[#dbc2b2]/45 rounded-2xl px-5 py-3.5 max-w-4xl mx-auto">
              <span className="material-symbols-outlined text-[#eb8424] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              <div className="flex-1 font-body text-xs text-[#5c4a3c]/60">
                <Link href="/auth/login" className="text-[#eb8424] font-extrabold no-underline hover:underline">Sign in</Link>
                {' '}or{' '}
                <Link href="/auth/signup" className="text-[#eb8424] font-extrabold no-underline hover:underline">create an account</Link>
                {' '}to join the conversation.
              </div>
              <Link
                href="/auth/signup"
                className="shrink-0 bg-[#eb8424] text-white text-xs font-bold px-4 py-2 rounded-xl no-underline hover:bg-[#d66c0e] transition-all shadow-sm"
              >
                Join Empire
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel 4: Members / Details Sidebar (240px wide) ────────────── */}
      <aside className="w-60 shrink-0 bg-[#f7f0e8]/30 border-l border-[#dbc2b2]/45 hidden xl:flex flex-col overflow-y-auto p-4 select-none">
        
        {/* Case 1: Active DM Recipient Profile Detail Card */}
        {activeDMUser ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#6b5a4d]/50 mb-1 border-b border-[#dbc2b2]/30 pb-2">
              User Profile
            </h3>
            
            {/* Detailed profile viewer */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#dbc2b2]/50 bg-white flex items-center justify-center shadow-md">
                {activeDMUser.avatar_url ? (
                  <img src={activeDMUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#eb8424]">
                    {activeDMUser.display_name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-display text-sm font-bold text-[#5c4a3c] truncate flex items-center justify-center gap-1">
                  {activeDMUser.display_name}
                  <RoleBadge role={activeDMUser.role} />
                </h4>
                <p className="font-body text-[10px] text-[#6b5a4d]/50 capitalize mt-0.5">{activeDMUser.role || 'Volunteer'}</p>
              </div>
            </div>

            {/* User ID block */}
            <div className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-[#dbc2b2]/30 shadow-sm">
              <span className="font-body text-[8px] font-bold text-[#6b5a4d]/40 uppercase tracking-wide">User ID</span>
              <div className="flex items-center justify-between text-[9px] font-mono text-[#5c4a3c]/60">
                <span className="truncate flex-1 pr-1">{activeDMUser.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeDMUser.id);
                    showToast('success', 'User ID copied!');
                  }}
                  className="material-symbols-outlined text-[10px] text-[#eb8424] hover:text-[#d66c0e] bg-transparent border-none cursor-pointer p-0"
                  title="Copy User ID"
                >
                  content_copy
                </button>
              </div>
            </div>

            {/* Inspect user additional profile info fetched dynamically from globalProfiles cache */}
            {(() => {
              const matchedProfile = globalProfiles.find(p => p.id === activeDMUser.id);
              if (!matchedProfile) return null;
              return (
                <div className="flex flex-col gap-3.5">
                  {matchedProfile.bio && (
                    <div className="bg-white p-2.5 rounded-xl border border-[#dbc2b2]/30 shadow-sm">
                      <span className="font-body text-[8px] font-bold text-[#6b5a4d]/40 uppercase tracking-wide">Bio</span>
                      <p className="font-body text-[11px] text-[#5c4a3c]/80 italic mt-1 leading-normal">
                        &quot;{matchedProfile.bio}&quot;
                      </p>
                    </div>
                  )}
                  {matchedProfile.preferred_role && (
                    <div>
                      <span className="font-body text-[8px] font-bold text-[#6b5a4d]/40 uppercase tracking-wide block">Rescue Focus</span>
                      <span className="font-body text-xs text-[#5c4a3c]/85 mt-0.5 block font-semibold">{matchedProfile.preferred_role}</span>
                    </div>
                  )}
                  {matchedProfile.location_neighborhood && (
                    <div>
                      <span className="font-body text-[8px] font-bold text-[#6b5a4d]/40 uppercase tracking-wide block">Neighborhood</span>
                      <span className="font-body text-xs text-[#5c4a3c]/85 mt-0.5 block font-semibold">{matchedProfile.location_neighborhood}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : activeChannel?.is_private ? (
          /* Case 2: Private Channel Member List */
          <div className="flex flex-col gap-4">
            {activeChannel.invite_code && (
              <div className="bg-[#fdfbf7] border border-[#dbc2b2]/45 rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm">
                <span className="font-body text-[9px] font-bold text-[#6b5a4d]/55 uppercase tracking-wider block">Invite Code</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#eb8424] tracking-wider select-all">
                    {activeChannel.invite_code}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeChannel.invite_code || '');
                      showToast('success', 'Invite code copied to clipboard!');
                    }}
                    className="w-7 h-7 rounded-full hover:bg-[#dbc2b2]/20 flex items-center justify-center text-[#6b5a4d] hover:text-[#eb8424] transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                    type="button"
                    title="Copy Invite Code"
                  >
                    <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
                </div>
                <p className="font-body text-[10px] text-[#6b5a4d]/60 leading-relaxed mt-0.5">
                  Share this code with volunteers to invite them to this private group.
                </p>
              </div>
            )}
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#6b5a4d]/50 border-b border-[#dbc2b2]/30 pb-2 flex items-center justify-between">
              <span>Group Members</span>
              <span className="bg-[#eb8424]/10 text-[#eb8424] text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {activeChannelMembers.length}
              </span>
            </h3>
            
            <div className="flex flex-col gap-2">
              {activeChannelMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedProfileId(member.id)}
                  className="w-full flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-white/50 text-left border-none bg-transparent cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-[#dbc2b2]/35 flex-shrink-0 flex items-center justify-center border border-[#dbc2b2]/50">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-[#eb8424]">
                        {member.display_name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-body text-xs font-bold text-[#5c4a3c] truncate flex items-center gap-1">
                      {member.display_name || 'Anonymous'}
                      <RoleBadge role={member.role} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Case 3: Public Channel Active Volunteers List */
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#6b5a4d]/50 border-b border-[#dbc2b2]/30 pb-2">
              Volunteers Online
            </h3>
            
            {/* Admins */}
            {globalProfiles.filter(p => p.role === 'admin').length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-body text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                  Administrators — {globalProfiles.filter(p => p.role === 'admin').length}
                </span>
                {globalProfiles.filter(p => p.role === 'admin').map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className="w-full flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-white/50 text-left border-none bg-transparent cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-[#dbc2b2]/35 flex-shrink-0 flex items-center justify-center border border-[#dbc2b2]/50">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-[#eb8424]">{p.display_name?.[0]?.toUpperCase() ?? '?'}</span>
                      )}
                    </div>
                    <span className="font-body text-xs font-bold text-amber-600 truncate">{p.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Mods */}
            {globalProfiles.filter(p => p.role === 'moderator').length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-body text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                  Moderators — {globalProfiles.filter(p => p.role === 'moderator').length}
                </span>
                {globalProfiles.filter(p => p.role === 'moderator').map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className="w-full flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-white/50 text-left border-none bg-transparent cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-[#dbc2b2]/35 flex-shrink-0 flex items-center justify-center border border-[#dbc2b2]/50">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-[#eb8424]">{p.display_name?.[0]?.toUpperCase() ?? '?'}</span>
                      )}
                    </div>
                    <span className="font-body text-xs font-bold text-rose-600 truncate">{p.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Volunteers */}
            <div className="flex flex-col gap-2">
              <span className="font-body text-[9px] font-bold text-[#6b5a4d]/40 uppercase tracking-wider">
                Volunteers — {globalProfiles.filter(p => p.role !== 'admin' && p.role !== 'moderator').length}
              </span>
              {globalProfiles.filter(p => p.role !== 'admin' && p.role !== 'moderator').map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className="w-full flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-white/50 text-left border-none bg-transparent cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-[#dbc2b2]/35 flex-shrink-0 flex items-center justify-center border border-[#dbc2b2]/50">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-[#eb8424]">{p.display_name?.[0]?.toUpperCase() ?? '?'}</span>
                    )}
                  </div>
                  <span className="font-body text-xs font-semibold text-[#5c4a3c] truncate">{p.display_name || 'Anonymous'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Create Poll Modal ── */}
      {isPollModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-fade-in text-left">
            <h3 className="font-display text-base font-bold text-[#5c4a3c] flex items-center gap-2 select-none">
              <span className="material-symbols-outlined text-[#eb8424]" style={{ fontVariationSettings: "'FILL' 1" }}>poll</span>
              Create Community Poll
            </h3>
            
            <div>
              <label className="block font-body text-[10px] font-bold text-[#6b5a4d]/50 uppercase tracking-wider mb-1">Question</label>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="What is your question?"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[#eb8424] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block font-body text-[10px] font-bold text-[#6b5a4d]/50 uppercase tracking-wider mb-1 flex justify-between items-center select-none">
                <span>Options</span>
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-[10px] text-[#eb8424] hover:underline font-bold flex items-center gap-0.5 border-none bg-transparent cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">add</span> Add Option
                </button>
              </label>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] focus:border-[#eb8424] outline-none transition-all"
                      required
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1 cursor-pointer border-none bg-transparent flex items-center"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-3 select-none">
              <button
                type="button"
                onClick={() => {
                  setIsPollModalOpen(false);
                  setPollQuestion('');
                  setPollOptions(['', '']);
                }}
                className="px-4 py-2 border border-[#dbc2b2] hover:bg-[#dbc2b2]/10 text-[#6b5a4d] rounded-xl text-xs font-bold transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePoll}
                className="px-4.5 py-2 bg-[#eb8424] hover:bg-[#d66c0e] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">done</span>
                <span>Create Poll</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Group Modal ── */}
      {isCreateChannelOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleCreateChannel} className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <h3 className="font-display text-base font-bold text-[#5c4a3c] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#eb8424]">group_add</span>
              Create {isNewChannelPrivate ? 'Private Group' : 'Public Channel'}
            </h3>
            <div>
              <label className="block font-body text-[10px] font-bold text-[#6b5a4d]/50 uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder={isNewChannelPrivate ? "e.g. TNR Midnight Shift" : "e.g. General Announcements"}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[#eb8424] outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block font-body text-[10px] font-bold text-[#6b5a4d]/50 uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={newChannelDesc}
                onChange={(e) => setNewChannelDesc(e.target.value)}
                placeholder="What is this channel about?"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[#eb8424] outline-none transition-all resize-none h-20"
              />
            </div>
            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-2 mt-2 bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/40 select-none">
                <input
                  type="checkbox"
                  id="is-private-checkbox"
                  checked={isNewChannelPrivate}
                  onChange={(e) => setIsNewChannelPrivate(e.target.checked)}
                  className="rounded text-[#eb8424] focus:ring-[#eb8424]"
                />
                <label htmlFor="is-private-checkbox" className="font-body text-xs font-semibold text-[#5c4a3c] cursor-pointer">
                  Private Group (Invite-only)
                </label>
              </div>
            )}
            {createChannelError && <div className="text-xs text-red-500 font-semibold">{createChannelError}</div>}
            <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/15 pt-3">
              <button
                type="button"
                onClick={() => { setIsCreateChannelOpen(false); setCreateChannelError(null); }}
                className="border border-[var(--bg-border)] text-[#6b5a4d]/75 hover:bg-[var(--bg-elevated)] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingChannel}
                className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                {isCreatingChannel ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Join Group Modal ── */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              handleJoinPrivateChannel(e).then(() => {
                setIsJoinModalOpen(false);
              });
            }}
            className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl"
          >
            <h3 className="font-display text-base font-bold text-[#5c4a3c] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#eb8424]">login</span>
              Join Private Group
            </h3>
            <p className="font-body text-xs text-[#6b5a4d] leading-relaxed">
              Enter the 8-character invite code shared by a group member to join their private channel.
            </p>
            <div>
              <label className="block font-body text-[10px] font-bold text-[#6b5a4d]/50 uppercase tracking-wider mb-1">Invite Code</label>
              <input
                type="text"
                value={inviteCodeText}
                onChange={(e) => setInviteCodeText(e.target.value)}
                placeholder="e.g. A1B2C3D4"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2 text-sm text-[var(--empire-cream)] focus:border-[#eb8424] outline-none transition-all uppercase font-mono tracking-widest text-center"
                required
                maxLength={8}
              />
            </div>
            <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/15 pt-3">
              <button
                type="button"
                onClick={() => { setIsJoinModalOpen(false); setInviteCodeText(''); }}
                className="border border-[var(--bg-border)] text-[#6b5a4d]/75 hover:bg-[var(--bg-elevated)] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isJoining}
                className="bg-[#eb8424] text-white hover:bg-[#d6721b] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile Detail Modal */}
      {selectedProfileId && (
        <ProfileDetailModal
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          onStartDM={(user) => {
            setServerContext('dms');
            setActiveDMUser(user);
            setSelectedProfileId(null);
          }}
          currentUser={currentUser}
        />
      )}

      {/* ── Report Message Rule Selection Modal ── */}
      {reportMsgId && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-fade-in text-left">
            <h3 className="font-display text-base font-bold text-[#5c4a3c] flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">flag</span>
              Report Message
            </h3>
            <p className="font-body text-xs text-[#6b5a4d]/75">
              Select which community rule or regulation this message violates. Flagged messages will be reviewed by colony moderators.
            </p>
            <div>
              <label className="block font-body text-[10px] font-bold text-[#6b5a4d]/50 uppercase tracking-wider mb-1">Violation Category</label>
              <select
                value={reportReasonRule}
                onChange={(e) => setReportReasonRule(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-xl px-3 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[#eb8424] outline-none transition-all"
              >
                <option value="Rule 1: Respect & Harassment (No abusive behavior or targeting others)">Rule 1: Respect & Harassment (Abusive behavior/harassment)</option>
                <option value="Rule 2: Colony Safety (No leaking precise colony locations without authorized TNR/rescue)">Rule 2: Colony Safety (Leaking precise colony locations)</option>
                <option value="Rule 3: Spam & Scams (No advertisements, promotions, or artificial point farming)">Rule 3: Spam & Scams (Advertisements, scams, point farming)</option>
                <option value="Rule 4: Truthful Reporting (No fake sightings, invalid status reports, or misleading info)">Rule 4: Truthful Reporting (Fake sightings/misleading details)</option>
                <option value="Rule 5: Sensitive Content (No PII, graphic photos, or inappropriate media)">Rule 5: Sensitive Content (PII, graphic, or inappropriate media)</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/15 pt-3">
              <button
                type="button"
                onClick={() => setReportMsgId(null)}
                className="border border-[var(--bg-border)] text-[#6b5a4d]/75 hover:bg-[var(--bg-elevated)] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionPending}
                onClick={async () => {
                  if (!reportMsgId) return;
                  setActionPending(true);
                  try {
                    const { reportCommunityMessage } = await import('@/lib/actions/community');
                    const res = await reportCommunityMessage(reportMsgId, reportReasonRule);
                    if (res.success) {
                      setMessages((prev) => prev.map((m) => m.id === reportMsgId ? { ...m, is_flagged: true } : m));
                      showToast('success', 'Message reported to moderators.');
                    } else {
                      showToast('error', res.error || 'Failed to report message.');
                    }
                  } catch {
                    showToast('error', 'Network error.');
                  } finally {
                    setActionPending(false);
                    setReportMsgId(null);
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Message Custom Confirmation Modal ── */}
      {deletingMessageId && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-fade-in text-left">
            <h3 className="font-display text-base font-bold text-[#5c4a3c] flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">delete</span>
              Delete Message
            </h3>
            <p className="font-body text-xs text-[#6b5a4d]/75">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/15 pt-3">
              <button
                type="button"
                onClick={() => setDeletingMessageId(null)}
                className="border border-[var(--bg-border)] text-[#6b5a4d]/75 hover:bg-[var(--bg-elevated)] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deletingMessageId) return;
                  if (activeDMUser) {
                    const res = await deleteDirectMessage(deletingMessageId);
                    if (res.success) {
                      setDmMessages((prev) => prev.filter((m) => m.id !== deletingMessageId));
                      showToast('success', 'Direct message deleted successfully.');
                    } else {
                      showToast('error', res.error || 'Failed to delete direct message.');
                    }
                  } else {
                    const res = await deleteCommunityMessage(deletingMessageId);
                    if (res.success) {
                      setMessages((prev) => prev.filter((m) => m.id !== deletingMessageId));
                      showToast('success', 'Message deleted/redacted successfully.');
                    } else {
                      showToast('error', res.error || 'Failed to delete message.');
                    }
                  }
                  setDeletingMessageId(null);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Modal Helper ──────────────────────────────────────────────────────

function ProfileDetailModal({ userId, onClose, onStartDM, currentUser }: {
  userId: string;
  onClose: () => void;
  onStartDM: (user: Profile) => void;
  currentUser: { id: string; role: string; displayName: string; avatarUrl: string | null } | null;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data } = (await supabase
        .from('profiles' as never)
        .select('id, display_name, avatar_url, role, bio, preferred_role, location_neighborhood')
        .eq('id', userId)
        .single()) as unknown as { data: Profile | null };
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)] animate-spin">progress_activity</span>
          <p className="font-body text-xs text-[var(--empire-cream)]/50 font-semibold">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-4xl text-red-500">error</span>
          <p className="font-body text-xs text-[var(--empire-cream)]/50">Profile not found.</p>
          <button onClick={onClose} className="px-4 py-1.5 bg-[var(--empire-gold)] text-white rounded-lg text-xs font-bold">Close</button>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.id === profile.id;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--empire-cream)]/40 hover:text-red-400 p-1 cursor-pointer bg-transparent border-none">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 rounded-2xl border border-[var(--bg-border)]/50 overflow-hidden flex items-center justify-center shadow-md bg-[var(--bg-elevated)] shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[var(--empire-gold)]">
                {profile.display_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-display text-lg font-bold text-[var(--empire-cream)] truncate flex items-center gap-1.5">
              {profile.display_name || 'Anonymous User'}
              <RoleBadge role={profile.role} />
            </h4>
            <p className="font-body text-xs text-[var(--empire-cream)]/40 capitalize">{profile.role || 'Volunteer'}</p>
          </div>
        </div>

        {profile.bio && (
          <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/15">
            <div className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider mb-1 flex items-center gap-0.5 select-none">
              <span className="material-symbols-outlined text-[10px]">format_quote</span>
              <span>Bio</span>
            </div>
            <p className="font-body text-xs text-[var(--empire-cream)]/80 italic leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider">Rescue Focus</div>
            <div className="font-body text-xs text-[var(--empire-cream)] mt-0.5 font-semibold">{profile.preferred_role || 'General Helper'}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase tracking-wider">Primary Neighborhood</div>
            <div className="font-body text-xs text-[var(--empire-cream)] mt-0.5 font-semibold">{profile.location_neighborhood || 'Not specified'}</div>
          </div>
        </div>

        <div className="flex gap-2 justify-end border-t border-[var(--bg-border)]/10 pt-4">
          {!isSelf && currentUser && (
            <button
              onClick={() => onStartDM({ id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url, role: profile.role })}
              className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              <span>Send Message</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="border border-[var(--bg-border)] text-[var(--empire-cream)]/75 hover:bg-[var(--bg-elevated)] px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
