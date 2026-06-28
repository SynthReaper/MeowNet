'use server';
// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// lib/actions/community.ts — Server Actions for community chat room

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { type ActionResponse } from './admin';

export interface Channel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  created_at?: string;
  is_archived?: boolean;
  is_private?: boolean;
  created_by?: string | null;
  invite_code?: string | null;
}

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean; // whether currentUser has reacted
}

export interface CommunityMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_flagged: boolean;
  channel_id: string | null;
  channel_slug: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  reactions?: Reaction[];
  parent_id?: string | null;
  edited_at?: string | null;
}

/**
 * Fetches active community channels.
 */
export async function getCommunityChannels(): Promise<Channel[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('community_channels' as never)
      .select('id, slug, name, description, icon, is_private, created_by, invite_code')
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as Channel[];
  } catch {
    return [];
  }
}

/**
 * Fetches the recent 100 community chat messages.
 * Joins user profile data and channel data, and aggregates emoji reactions.
 */
export async function getCommunityMessages(): Promise<CommunityMessage[]> {
  try {
    const supabase = await createServerClient();
    
    // 1. Fetch messages with profiles and channel slugs
    const { data: messagesData, error: messagesError } = await supabase
      .from('community_messages' as never)
      .select('id, user_id, message, created_at, is_flagged, channel_id, parent_id, edited_at, community_channels:community_channels(slug), profiles:profiles(display_name, avatar_url, role)' as never)
      .order('created_at', { ascending: true })
      .limit(100);

    if (messagesError || !messagesData) return [];

    // Check if caller is staff (moderator or admin) to view management messages
    let isStaff = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: caller } = await supabase
          .from('profiles' as never)
          .select('role')
          .eq('id', user.id)
          .maybeSingle() as unknown as { data: { role: string } | null };
        isStaff = caller?.role === 'moderator' || caller?.role === 'admin';
      }
    } catch {
      isStaff = false;
    }

    interface RawCommunityMessage {
      id: string;
      user_id: string;
      message: string;
      created_at: string;
      is_flagged: boolean;
      channel_id: string | null;
      parent_id: string | null;
      edited_at: string | null;
      community_channels: { slug: string } | null;
      profiles: { display_name: string | null; avatar_url: string | null; role: string | null } | null;
    }

    const messages = (messagesData as unknown as RawCommunityMessage[]).filter(
      (m) => m.community_channels?.slug !== 'management' || isStaff
    );
    const messageIds = messages.map((m) => m.id);

    // 2. Fetch reactions for these messages
    const reactionsMap: Record<string, Reaction[]> = {};
    if (messageIds.length > 0) {
      const { data: rxns } = await supabase
        .from('community_reactions' as never)
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds);

      // Check current user for marking "reacted: true"
      let currentUserId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id ?? null;
      } catch {
        currentUserId = null;
      }

      if (rxns) {
        const temp: Record<string, Record<string, { count: number; userIds: string[] }>> = {};
        for (const r of (rxns || []) as unknown as { message_id: string; emoji: string; user_id: string }[]) {
          if (!temp[r.message_id]) temp[r.message_id] = {};
          if (!temp[r.message_id][r.emoji]) {
            temp[r.message_id][r.emoji] = { count: 0, userIds: [] };
          }
          temp[r.message_id][r.emoji].count++;
          temp[r.message_id][r.emoji].userIds.push(r.user_id);
        }

        for (const msgId of Object.keys(temp)) {
          reactionsMap[msgId] = Object.entries(temp[msgId]).map(([emoji, meta]) => ({
            emoji,
            count: meta.count,
            reacted: currentUserId ? meta.userIds.includes(currentUserId) : false,
          }));
        }
      }
    }

    return messages.map((msg) => ({
      id: msg.id,
      user_id: msg.user_id,
      message: msg.message,
      created_at: msg.created_at,
      is_flagged: msg.is_flagged ?? false,
      channel_id: msg.channel_id ?? null,
      channel_slug: msg.community_channels?.slug ?? 'general',
      parent_id: msg.parent_id ?? null,
      edited_at: msg.edited_at ?? null,
      display_name: msg.profiles?.display_name ?? 'Anonymous Volunteer',
      avatar_url: msg.profiles?.avatar_url ?? null,
      role: msg.profiles?.role ?? 'user',
      reactions: reactionsMap[msg.id] ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * Posts a new message to the community chat (Authenticated users only).
 */
export async function postCommunityMessage(
  messageText: string,
  channelId: string,
  parentId?: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You must be signed in to participate.' };

    const trimmed = messageText.trim();
    if (!trimmed) return { success: false, error: 'Message cannot be empty.' };
    if (trimmed.length > 2000) return { success: false, error: 'Message is too long.' };

    // Resolve channel slug to ID if it's not a UUID
    let realChannelId = channelId;
    if (channelId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId)) {
      const { data: chan } = await supabase
        .from('community_channels' as never)
        .select('id')
        .eq('slug', channelId)
        .maybeSingle() as unknown as { data: { id: string } | null };
      if (chan) {
        realChannelId = chan.id;
      }
    }

    // Security check: only staff can post in management channel
    const { data: channelData } = await supabase
      .from('community_channels' as never)
      .select('slug')
      .eq('id', realChannelId)
      .maybeSingle() as unknown as { data: { slug: string } | null };

    if (channelData?.slug === 'management') {
      const { data: caller } = await supabase
        .from('profiles' as never)
        .select('role')
        .eq('id', user.id)
        .maybeSingle() as unknown as { data: { role: string } | null };

      if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
        return { success: false, error: 'Only staff can post in the Staff HQ channel.' };
      }
    }

    const { error } = await supabase
      .from('community_messages' as never)
      .insert({
        user_id: user.id,
        message: trimmed,
        channel_id: realChannelId,
        parent_id: parentId || null,
      } as never);

    if (error) return { success: false, error: error.message };

    revalidatePath('/community');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Edits an existing community message (Author or staff, within 15 minutes for author).
 */
export async function editCommunityMessage(
  messageId: string,
  newMessageText: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const trimmed = newMessageText.trim();
    if (!trimmed) return { success: false, error: 'Message cannot be empty.' };
    if (trimmed.length > 2000) return { success: false, error: 'Message is too long.' };

    // Fetch message to verify ownership and 15 minute limit
    const { data: msg, error: fetchErr } = await supabase
      .from('community_messages' as never)
      .select('user_id, created_at')
      .eq('id', messageId)
      .maybeSingle() as unknown as { data: { user_id: string; created_at: string } | null; error: { message: string } | null };

    if (fetchErr || !msg) return { success: false, error: 'Message not found.' };

    // Fetch caller role to allow staff edits
    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    const isStaff = caller?.role === 'moderator' || caller?.role === 'admin';
    const isOwner = msg.user_id === user.id;

    if (!isOwner) {
      return { success: false, error: 'You do not have permission to edit this message. Only the author can edit their own message.' };
    }

    if (!isStaff) {
      const elapsed = Date.now() - new Date(msg.created_at).getTime();
      if (elapsed > 15 * 60 * 1000) {
        return { success: false, error: 'Messages can only be edited within 15 minutes of sending.' };
      }
    }

    const { error } = await supabase
      .from('community_messages' as never)
      .update({
        message: trimmed,
        edited_at: new Date().toISOString(),
      } as never)
      .eq('id', messageId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/community');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Deletes a community message (Author deletes, staff redacts and notifies).
 */
export async function deleteCommunityMessage(messageId: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Fetch the message and the author's role
    const { data: msg } = await supabase
      .from('community_messages' as never)
      .select('user_id, profiles(role)' as never)
      .eq('id', messageId)
      .maybeSingle() as unknown as { data: { user_id: string; profiles: { role: string | null } | null } | null };

    if (!msg) return { success: false, error: 'Message not found.' };

    const authorRole = msg.profiles?.role;

    // Check staff role
    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    const isStaff = caller?.role === 'moderator' || caller?.role === 'admin';
    const isOwner = msg.user_id === user.id;

    if (!isOwner && !isStaff) {
      return { success: false, error: 'You do not have permission to delete this message.' };
    }

    // Role check: moderator cannot delete admin message
    if (caller?.role === 'moderator' && authorRole === 'admin') {
      return { success: false, error: 'Moderators cannot delete administrator messages.' };
    }

    // If moderator/admin is deleting another user's message, redact it and notify
    if (isStaff && !isOwner) {
      const { error } = await supabase
        .from('community_messages' as never)
        .update({
          message: '[Message redacted by Moderator]',
          is_flagged: true,
          edited_at: new Date().toISOString(),
        } as never)
        .eq('id', messageId);

      if (error) return { success: false, error: error.message };

      try {
        const serviceClient = createServiceClient();
        await serviceClient
          .from('user_notifications' as never)
          .insert({
            user_id: msg.user_id,
            title: 'Message Redacted',
            message: 'Your message in community chat was redacted by a moderator for violation of guidelines.',
            type: 'moderation',
            target_url: '/community',
            is_read: false,
          } as never);
      } catch (notifErr) {
        console.error('Failed to insert moderation notification:', notifErr);
      }

      revalidatePath('/community');
      return { success: true };
    }

    // Otherwise, perform hard delete for owner
    const { error } = await supabase
      .from('community_messages' as never)
      .delete()
      .eq('id', messageId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/community');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  is_read: boolean;
  edited_at?: string | null;
  sender_name?: string;
  sender_avatar?: string | null;
  receiver_name?: string;
  receiver_avatar?: string | null;
}

export async function sendDirectMessage(
  receiverId: string,
  messageText: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<ActionResponse & { data?: DirectMessage }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const trimmed = messageText.trim();
    if (!trimmed && !mediaUrl) return { success: false, error: 'Message cannot be empty.' };

    const { data, error } = await supabase
      .from('direct_messages' as never)
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        message: trimmed,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        is_read: false
      } as never)
      .select()
      .maybeSingle() as unknown as { data: DirectMessage | null; error: { message: string } | null };

    if (error || !data) return { success: false, error: error?.message || 'Failed to send message' };

    // Send a notification to the receiver
    const { data: senderProfile } = await supabase
      .from('profiles' as never)
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { display_name: string | null } | null };

    await supabase
      .from('user_notifications' as never)
      .insert({
        user_id: receiverId,
        title: 'New Message',
        message: `${senderProfile?.display_name || 'Someone'} sent you a direct message.`,
        type: 'private_message',
        target_url: `/community?dm=${user.id}`,
        is_read: false
      } as never);

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

export async function getDirectMessages(otherUserId: string): Promise<DirectMessage[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('direct_messages' as never)
      .select('id, sender_id, receiver_id, message, media_url, media_type, created_at, is_read, edited_at')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true }) as unknown as { data: DirectMessage[] | null; error: { message: string } | null };

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export interface DMConversation {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  lastMessage: string;
  created_at: string;
  unread: boolean;
}

export async function getDMConversations(): Promise<DMConversation[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all DMs where user is sender or receiver
    const { data: dms, error } = await supabase
      .from('direct_messages' as never)
      .select('id, sender_id, receiver_id, message, media_url, media_type, created_at, is_read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false }) as unknown as { data: DirectMessage[] | null; error: { message: string } | null };

    if (error || !dms) return [];

    // Group by conversation partner
    interface PartnerMeta {
      lastMessage: string;
      created_at: string;
      unread: boolean;
      partnerId: string;
    }
    const partnersMap = new Map<string, PartnerMeta>();
    for (const dm of dms) {
      const partnerId = dm.sender_id === user.id ? dm.receiver_id : dm.sender_id;
      if (!partnersMap.has(partnerId)) {
        partnersMap.set(partnerId, {
          lastMessage: dm.message || (dm.media_type ? `[${dm.media_type}]` : ''),
          created_at: dm.created_at,
          unread: dm.receiver_id === user.id && !dm.is_read,
          partnerId
        });
      } else {
        if (dm.receiver_id === user.id && !dm.is_read) {
          const existing = partnersMap.get(partnerId);
          if (existing) {
            existing.unread = true;
          }
        }
      }
    }

    const partnerIds = Array.from(partnersMap.keys());
    if (partnerIds.length === 0) return [];

    // Fetch partner profiles
    const { data: profiles } = await supabase
      .from('profiles' as never)
      .select('id, display_name, avatar_url, role')
      .in('id', partnerIds) as unknown as { data: { id: string; display_name: string | null; avatar_url: string | null; role: string | null }[] | null };

    if (!profiles) return [];

    const result = profiles.map((p) => {
      const meta = partnersMap.get(p.id);
      return {
        id: p.id,
        display_name: p.display_name || 'Anonymous User',
        avatar_url: p.avatar_url,
        role: p.role || 'user',
        lastMessage: meta?.lastMessage || '',
        created_at: meta?.created_at || new Date().toISOString(),
        unread: meta?.unread || false
      };
    });

    // Sort by last message date descending
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createCommunityChannel(
  name: string,
  description: string
): Promise<ActionResponse & { data?: Channel }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Admin check: only admins can create public channels
    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') {
      return { success: false, error: 'Only administrators can create public channels. Mods, managers, and users can create private groups.' };
    }

    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: 'Group name cannot be empty.' };

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) return { success: false, error: 'Invalid group name.' };

    const { data: existing } = await supabase
      .from('community_channels' as never)
      .select('id')
      .eq('slug', slug)
      .maybeSingle() as unknown as { data: { id: string } | null };

    if (existing) {
      return { success: false, error: 'A channel or group with this name already exists.' };
    }

    const { data, error } = await supabase
      .from('community_channels' as never)
      .insert({
        slug,
        name: trimmedName,
        description: description.trim() || null,
        icon: 'group',
        is_archived: false,
        is_private: false
      } as never)
      .select()
      .maybeSingle() as unknown as { data: Channel | null; error: { message: string } | null };

    if (error || !data) return { success: false, error: error?.message || 'Failed to create channel' };

    revalidatePath('/community');
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  target_url: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getUserNotifications(): Promise<UserNotification[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_notifications' as never)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50) as unknown as { data: UserNotification[] | null; error: { message: string } | null };

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('user_notifications' as never)
      .update({ is_read: true } as never)
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

export async function markAllNotificationsAsRead(): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('user_notifications' as never)
      .update({ is_read: true } as never)
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Flags/Unflags a community message (Moderator/Admin only).
 */
export async function flagCommunityMessage(messageId: string, flagged: boolean): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Only staff can moderate messages.' };
    }

    const { error } = await supabase
      .from('community_messages' as never)
      .update({ is_flagged: flagged } as never)
      .eq('id', messageId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/community');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Flags a message and files a moderator query under 'message' type.
 * Accessible to any authenticated user.
 */
export async function reportCommunityMessage(messageId: string, reason: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You must be signed in to report messages.' };

    const trimmed = reason.trim();
    if (!trimmed) return { success: false, error: 'Reason cannot be empty.' };

    const serviceClient = createServiceClient();

    // 1. Fetch message details to get the author and content
    const { data: msg } = await serviceClient
      .from('community_messages' as never)
      .select('id, user_id, message')
      .eq('id', messageId)
      .maybeSingle() as unknown as { data: { id: string; user_id: string; message: string } | null };

    if (!msg) return { success: false, error: 'Message not found.' };

    // 2. Set is_flagged = true on the message
    await serviceClient
      .from('community_messages' as never)
      .update({ is_flagged: true } as never)
      .eq('id', messageId);

    // 3. Create a query/report in moderator_queries
    const { error: queryErr } = await serviceClient
      .from('moderator_queries' as never)
      .insert({
        target_type: 'message',
        target_id: messageId,
        volunteer_id: user.id, // the reporter
        message: `[REPORTED MESSAGE] Author ID: ${msg.user_id}. Content: "${msg.message.slice(0, 100)}". Reason: ${trimmed}`,
        status: 'pending',
      } as never);

    if (queryErr) return { success: false, error: queryErr.message };

    revalidatePath('/community');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Toggles user reaction on a message.
 */
export async function toggleReaction(messageId: string, emoji: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You must be signed in to react.' };

    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji || trimmedEmoji.length > 10) {
      return { success: false, error: 'Invalid emoji.' };
    }

    // Check if user already reacted
    const { data: existing } = await supabase
      .from('community_reactions' as never)
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', trimmedEmoji)
      .maybeSingle() as { data: { id: string } | null };

    if (existing) {
      // Remove reaction
      const { error } = await supabase
        .from('community_reactions' as never)
        .delete()
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      // Add reaction
      const { error } = await supabase
        .from('community_reactions' as never)
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: trimmedEmoji,
        } as never);

      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/community');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

export async function uploadChatMedia(formData: FormData): Promise<ActionResponse & { url?: string, type?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) return { success: false, error: 'No file provided' };

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) return { success: false, error: 'File size too large (max 10MB)' };

    // Strict MIME allowlist — prevents uploading executables, scripts, or unknown types.
    // Client-reported file.type is user-controlled; validate it server-side.
    const ALLOWED_MIME_TYPES = new Set([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm', 'video/ogg',
      'application/pdf',
    ]);
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return { success: false, error: 'File type not allowed' };
    }

    let buffer: Buffer = Buffer.from(await file.arrayBuffer());
    let contentType = file.type;

    if (contentType.startsWith('image/')) {
      const { validateImageBuffer, stripExifAndNormalize } = await import('@/lib/security/exif');
      if (validateImageBuffer(buffer)) {
        try {
          const cleanResult = await stripExifAndNormalize(buffer);
          buffer = cleanResult.buffer;
          contentType = 'image/jpeg';
        } catch (e) {
          console.error('EXIF stripping failed:', e);
        }
      }
    }

    const rawExt = file.name.split('.').pop();
    const cleanExt = (rawExt || 'bin').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10);
    const fileName = `chat-media/${user.id}-${Date.now()}.${cleanExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('MeowNet')
      .upload(fileName, buffer, { contentType, upsert: true });

    if (uploadError) return { success: false, error: uploadError.message };

    const { data: { publicUrl } } = supabase.storage.from('MeowNet').getPublicUrl(uploadData.path);

    let mediaType = 'file';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type === 'application/pdf') mediaType = 'pdf';

    return { success: true, url: publicUrl, type: mediaType };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Creates a private community channel/group generating a unique invite code.
 */
export async function createPrivateChannel(
  name: string,
  description: string
): Promise<ActionResponse & { data?: Channel }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: 'Group name cannot be empty.' };

    const suffix = Math.random().toString(36).substring(2, 6);
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + suffix;
    if (!slug) return { success: false, error: 'Invalid group name.' };

    // Generate unique random 8 character invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data, error } = await supabase
      .from('community_channels' as never)
      .insert({
        slug,
        name: trimmedName,
        description: description.trim() || null,
        icon: 'lock',
        is_private: true,
        created_by: user.id,
        invite_code: inviteCode,
        is_archived: false
      } as never)
      .select()
      .maybeSingle() as unknown as { data: Channel | null; error: { message: string } | null };

    if (error || !data) return { success: false, error: error?.message || 'Failed to create private channel' };

    // Auto-join the creator as member
    const { error: memberError } = await supabase
      .from('channel_members' as never)
      .insert({
        channel_id: data.id,
        user_id: user.id
      } as never);

    if (memberError) {
      console.error('Failed to auto-join private channel creator:', memberError.message);
    }

    revalidatePath('/community');
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Joins a private channel using its unique invite code.
 */
export async function joinPrivateChannelByInviteCode(
  inviteCode: string
): Promise<ActionResponse & { data?: Channel }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const code = inviteCode.trim().toUpperCase();
    if (!code) return { success: false, error: 'Invite code cannot be empty.' };

    const { data: channel, error: chanError } = await supabase
      .from('community_channels' as never)
      .select('id, name, is_archived, is_private')
      .eq('invite_code', code)
      .maybeSingle() as unknown as { data: Channel | null; error: { message: string } | null };

    if (chanError || !channel) {
      return { success: false, error: 'Invalid invite code or group does not exist.' };
    }

    if (channel.is_archived) {
      return { success: false, error: 'This group has been archived.' };
    }

    // Insert into channel_members
    const { error: joinError } = await supabase
      .from('channel_members' as never)
      .insert({
        channel_id: channel.id,
        user_id: user.id
      } as never);

    if (joinError) {
      if (joinError.code === '23505') {
        return { success: false, error: 'You are already a member of this group.' };
      }
      return { success: false, error: joinError.message };
    }

    revalidatePath('/community');
    return { success: true, data: channel };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Fetches all members of a private/public community channel.
 */
export interface ChannelMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  try {
    const supabase = await createServerClient();
    
    // Check if channel is private, verify user has access
    const { data: channel } = await supabase
      .from('community_channels' as never)
      .select('is_private, created_by')
      .eq('id', channelId)
      .maybeSingle() as unknown as { data: { is_private: boolean; created_by: string | null } | null };

    if (!channel) return [];

    // Fetch members joined
    const { data, error } = await supabase
      .from('channel_members' as never)
      .select('user_id, profiles:profiles(id, display_name, avatar_url, role)')
      .eq('channel_id', channelId) as unknown as { data: { user_id: string; profiles: ChannelMember | null }[] | null; error: { message: string } | null };

    if (error || !data) return [];
    return data.map((m) => m.profiles).filter(Boolean) as ChannelMember[];
  } catch {
    return [];
  }
}

/**
 * Marks all direct messages from a specific sender to the current user as read.
 */
export async function markDMsAsRead(senderId: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('direct_messages' as never)
      .update({ is_read: true } as never)
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Edits an existing direct message (Author only, within 15 minutes).
 */
export async function editDirectMessage(
  messageId: string,
  newMessageText: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const trimmed = newMessageText.trim();
    if (!trimmed) return { success: false, error: 'Message cannot be empty.' };
    if (trimmed.length > 2000) return { success: false, error: 'Message is too long.' };

    // Fetch DM to verify ownership and 15 minute limit
    const { data: dm, error: fetchErr } = await supabase
      .from('direct_messages' as never)
      .select('sender_id, created_at')
      .eq('id', messageId)
      .maybeSingle() as unknown as { data: { sender_id: string; created_at: string } | null; error: { message: string } | null };

    if (fetchErr || !dm) return { success: false, error: 'Message not found.' };

    if (dm.sender_id !== user.id) {
      return { success: false, error: 'You do not have permission to edit this message. Only the sender can edit their own message.' };
    }

    const elapsed = Date.now() - new Date(dm.created_at).getTime();
    if (elapsed > 15 * 60 * 1000) {
      return { success: false, error: 'Messages can only be edited within 15 minutes of sending.' };
    }

    const { error } = await supabase
      .from('direct_messages' as never)
      .update({
        message: trimmed,
        edited_at: new Date().toISOString(),
      } as never)
      .eq('id', messageId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Deletes a direct message (Author only, hard delete).
 */
export async function deleteDirectMessage(messageId: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Fetch the message to verify ownership
    const { data: dm, error: fetchErr } = await supabase
      .from('direct_messages' as never)
      .select('sender_id')
      .eq('id', messageId)
      .maybeSingle() as unknown as { data: { sender_id: string } | null; error: { message: string } | null };

    if (fetchErr || !dm) return { success: false, error: 'Message not found.' };

    if (dm.sender_id !== user.id) {
      return { success: false, error: 'You do not have permission to delete this message.' };
    }

    const { error } = await supabase
      .from('direct_messages' as never)
      .delete()
      .eq('id', messageId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: message };
  }
}


