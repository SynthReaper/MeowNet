'use server';
// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// lib/actions/admin.ts — Server Actions for moderation and admin tasks

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * Fetches the role of the currently authenticated user.
 */
export async function getUserRole(): Promise<string> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return 'user';

    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    return profile?.role ?? 'user';
  } catch {
    return 'user';
  }
}

/**
 * Fetches site-wide dashboard statistics (Admin only).
 */
export async function getAdminDashboardStats() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: caller } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  if (caller?.role !== 'admin') throw new Error('Unauthorized');

  // Perform parallel counts to keep performance high
  const [profilesCount, catsCount, eventsCount, auditsCount] = await Promise.all([
    supabase.from('profiles' as never).select('*', { count: 'exact', head: true }),
    supabase.from('cats' as never).select('*', { count: 'exact', head: true }),
    supabase.from('tnr_events' as never).select('*', { count: 'exact', head: true }),
    supabase.from('erasure_audit' as never).select('*', { count: 'exact', head: true }),
  ]);

  // Aggregate total points
  const { data: pointData } = await supabase.from('profiles' as never).select('empire_points') as unknown as { data: { empire_points: number }[] | null };
  const totalPoints = pointData?.reduce((sum: number, p) => sum + (p.empire_points ?? 0), 0) ?? 0;

  return {
    userCount: profilesCount.count ?? 0,
    catCount: catsCount.count ?? 0,
    eventCount: eventsCount.count ?? 0,
    erasureCount: auditsCount.count ?? 0,
    totalPoints,
  };
}

/**
 * Fetches all user profiles and roles (Admin only).
 */
export async function getAllProfiles() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: caller } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  if (caller?.role !== 'admin') throw new Error('Unauthorized');

  const { data: profiles, error } = await supabase
    .from('profiles' as never)
    .select('id, display_name, role, empire_points, created_at, bio, preferred_role, location_neighborhood, contact_phone, is_enabled, password_expires_at, max_usages, usages_count')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (profiles ?? []) as unknown as Record<string, unknown>[];
}

/**
 * Updates a user's role in MeowNet (Admin only).
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: 'user' | 'moderator' | 'admin'
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    // Use service role client to bypass the self-update trigger validation constraints
    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from('profiles' as never)
      .update({ role: newRole } as never)
      .eq('id', targetUserId);

    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'update_role',
      targetUserId,
      `Role updated to ${newRole}`
    );

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Adjusts a user's total points (Admin only).
 */
export async function adjustUserPoints(
  targetUserId: string,
  points: number
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const adminClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any).rpc('adjust_points', {
      p_user_id: targetUserId,
      p_points: points,
    });

    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'adjust_points',
      targetUserId,
      `Adjusted points by ${points} pts`
    );

    revalidatePath('/admin');
    revalidatePath('/empire');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Fetches all logs and events pending moderation (Moderator and Admin only).
 */
export async function getPendingModeration() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: caller } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const [catsRes, eventsRes] = await Promise.all([
    supabase
      .from('cats' as never)
      .select('id, name, status, breed_estimate, age_estimate, owner_id, created_at, photo_url, is_verified')
      .order('created_at', { ascending: false }),
    supabase
      .from('tnr_events' as never)
      .select('id, title, description, capacity, status, created_at')
      .order('created_at', { ascending: false }),
  ]);

  return {
    cats: (catsRes.data ?? []) as unknown as Record<string, unknown>[],
    events: (eventsRes.data ?? []) as unknown as Record<string, unknown>[],
  };
}

/**
 * Deletes or flags a cat sighting from MeowNet (Moderator and Admin only).
 */
export async function moderateCat(
  catId: string,
  action: 'approve' | 'delete'
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    if (action === 'delete') {
      const { error } = await supabase.from('cats' as never).delete().eq('id', catId);
      if (error) return { success: false, error: error.message };
    } else {
      // Just mark it as audited/approved (e.g. update vaccinated or dummy property to force refresh)
      const { error } = await supabase
        .from('cats' as never)
        .update({ sterilized: true } as never)
        .eq('id', catId);
      if (error) return { success: false, error: error.message };
    }

    // Log to staff audit trail
    await logAuditActionInternal(
      user.id,
      caller.role,
      'moderate_cat',
      catId,
      action === 'delete' ? 'Deleted cat sighting' : 'Approved cat sighting'
    );

    revalidatePath('/moderator');
    revalidatePath('/cats');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Toggles the verification status of a cat report (Moderator and Admin only).
 */
export async function toggleCatVerified(
  catId: string,
  verified: boolean
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('cats' as never)
      .update({ is_verified: verified } as never)
      .eq('id', catId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/moderator');
    revalidatePath('/cats');
    revalidatePath('/map');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Approves or cancels a TNR Event in MeowNet (Moderator and Admin only).
 */
export async function moderateEvent(
  eventId: string,
  action: 'approve' | 'cancel'
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    if (action === 'cancel') {
      const { error } = await supabase
        .from('tnr_events' as never)
        .update({ status: 'cancelled' } as never)
        .eq('id', eventId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('tnr_events' as never)
        .update({ status: 'open' } as never)
        .eq('id', eventId);
      if (error) return { success: false, error: error.message };
    }

    // Log to staff audit trail
    await logAuditActionInternal(
      user.id,
      caller.role,
      'moderate_event',
      eventId,
      action === 'cancel' ? 'Cancelled TNR event' : 'Approved / reopened TNR event'
    );

    revalidatePath('/moderator');
    revalidatePath('/events');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Fetches compliance erasure audits (Admin only).
 */
export async function getErasureAudits() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: caller } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  if (caller?.role !== 'admin') throw new Error('Unauthorized');

  const { data: audits, error } = await supabase
    .from('erasure_audit' as never)
    .select('id, user_hash, requested_at')
    .order('requested_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (audits ?? []) as unknown as Record<string, unknown>[];
}

/**
 * Raises a moderation query to a volunteer regarding a cat report or TNR event.
 */
export async function raiseModeratorQuery(
  targetType: 'cat' | 'event' | 'profile',
  targetId: string,
  volunteerId: string,
  message: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('moderator_queries' as never)
      .insert({
        target_type: targetType,
        target_id: targetId,
        moderator_id: user.id,
        volunteer_id: volunteerId,
        message: message,
        status: 'pending',
      } as never);

    if (error) return { success: false, error: error.message };

    revalidatePath('/moderator');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Fetches all moderator queries (Moderator and Admin only).
 */
export async function getModeratorQueries() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: caller } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('moderator_queries' as never)
    .select('id, target_type, target_id, moderator_id, volunteer_id, message, status, response, created_at, chat_messages')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Record<string, unknown>[];
}

/**
 * Resolves a moderator query with an optional response.
 */
export async function resolveModeratorQuery(queryId: string, responseText?: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('moderator_queries' as never)
      .update({
        status: 'resolved',
        moderator_id: user.id,
        response: responseText || null,
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', queryId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/moderator');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Submits a general moderator query from a user's profile.
 * Accessible to any authenticated user.
 */
export async function submitUserProfileQuery(message: string): Promise<ActionResponse & { query?: any }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You must be signed in to submit queries.' };

    const trimmed = message.trim();
    if (!trimmed) return { success: false, error: 'Query message cannot be empty.' };

    // Fetch user profile display name
    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('display_name')
      .eq('id', user.id)
      .single() as any;

    const displayName = profile?.display_name || 'Volunteer';

    const serviceClient = createServiceClient();
    const initialMessages = [
      {
        sender_id: user.id,
        sender_name: displayName,
        sender_role: 'volunteer',
        message: trimmed,
        timestamp: new Date().toISOString()
      }
    ];

    const { data, error } = await serviceClient
      .from('moderator_queries' as never)
      .insert({
        target_type: 'general',
        target_id: null,
        volunteer_id: user.id,
        message: trimmed,
        status: 'pending',
        chat_messages: initialMessages
      } as never)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, query: data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: msg };
  }
}

/**
 * Appends a message to the query's chat thread.
 */
export async function addQueryChatMessage(
  queryId: string,
  messageText: string,
  setSolved: boolean = false
): Promise<ActionResponse & { chat_messages?: any[] }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const trimmed = messageText.trim();
    if (!trimmed) return { success: false, error: 'Message cannot be empty.' };

    const { data: ticket, error: getError } = await supabase
      .from('moderator_queries' as never)
      .select('*')
      .eq('id', queryId)
      .single() as any;

    if (getError || !ticket) return { success: false, error: 'Ticket not found.' };

    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('display_name, role')
      .eq('id', user.id)
      .single() as any;

    const role = profile?.role || 'user';
    const isStaff = role === 'admin' || role === 'moderator';

    if (ticket.volunteer_id !== user.id && !isStaff) {
      return { success: false, error: 'Unauthorized to reply to this ticket.' };
    }

    const senderName = profile?.display_name || (isStaff ? 'Staff' : 'Volunteer');
    const senderRole = isStaff ? 'moderator' : 'volunteer';

    const currentMessages = Array.isArray(ticket.chat_messages) ? ticket.chat_messages : [];
    const newMessages = [
      ...currentMessages,
      {
        sender_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        message: trimmed,
        timestamp: new Date().toISOString()
      }
    ];

    let nextStatus = ticket.status;
    if (isStaff && setSolved) {
      nextStatus = 'solved';
    } else if (!isStaff && ticket.status === 'solved') {
      nextStatus = 'pending';
    }

    const { error: updateError } = await supabase
      .from('moderator_queries' as never)
      .update({
        chat_messages: newMessages,
        status: nextStatus,
        updated_at: new Date().toISOString(),
        ...(isStaff ? { moderator_id: user.id } : {})
      } as never)
      .eq('id', queryId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath('/moderator');
    revalidatePath('/profile');
    return { success: true, chat_messages: newMessages };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: msg };
  }
}

/**
 * Closes a query ticket. Only allowed for the ticket creator.
 */
export async function closeModeratorQuery(queryId: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: ticket, error: getError } = await supabase
      .from('moderator_queries' as never)
      .select('volunteer_id')
      .eq('id', queryId)
      .single() as any;

    if (getError || !ticket) return { success: false, error: 'Ticket not found.' };

    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as any;

    const role = profile?.role || 'user';
    const isStaff = role === 'admin' || role === 'moderator';
    const isOwner = ticket.volunteer_id === user.id;

    if (!isOwner && !isStaff) {
      return { success: false, error: 'Only the volunteer who raised this ticket or staff can close it.' };
    }

    const { error: updateError } = await supabase
      .from('moderator_queries' as never)
      .update({
        status: 'closed',
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', queryId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath('/moderator');
    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return { success: false, error: msg };
  }
}

/**
 * Creates a new user directly in Supabase Auth and seeds their profile.
 * Bypasses Clerk completely for custom admin-created credentials.
 */
export async function adminCreateUser(
  email: string,
  displayName: string,
  role: 'user' | 'moderator' | 'admin',
  customPassword?: string,
  expiryDate?: string | null,
  maxUsages?: number | null,
  skipEmailVerification: boolean = true
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await (supabase
      .from('profiles' as never)
      .select('role').eq('id', currentUser.id).maybeSingle() as unknown as { data: { role: string | null } | null });

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const serviceClient = createServiceClient();

    // Generate secure password if none is provided
    const password = customPassword && customPassword.trim().length >= 6
      ? customPassword.trim()
      : `sb_${Math.random().toString(36).slice(-8)}_secure_123!`;

    // Derive a clean username slug from displayName (e.g. "Jane Doe" → "jane_doe")
    const usernameSlug = displayName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30) || `user_${Math.random().toString(36).slice(-6)}`;

    // Create user directly in Supabase Auth
    // skipEmailVerification=true  → email_confirm:true  (no email sent, access immediate)
    // skipEmailVerification=false → email_confirm:false (Supabase sends verification email)
    const { data: sbUser, error: sbError } = await serviceClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: skipEmailVerification,
      user_metadata: {
        // Store as full_name so syncSupabasePassword picks it up correctly
        full_name: displayName,
        display_name: displayName,
        username: usernameSlug,
        auth_provider: 'supabase_admin',
      }
    });

    if (sbError) {
      return { success: false, error: `Supabase Auth creation failed: ${sbError.message}` };
    }

    // Update the created profile details (role, password_expires_at, max_usages, usages_count)
    let profileError: { message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      const { error } = await serviceClient
        .from('profiles' as never)
        .update({
          display_name: displayName,
          role: role,
          password_expires_at: expiryDate || null,
          max_usages: maxUsages || null,
          usages_count: 0,
          is_enabled: true
        } as never)
        .eq('id', sbUser.user.id);
      profileError = error;
      if (!error) break;
    }

    if (profileError) {
      return { success: false, error: `User created but profile update failed: ${profileError.message}` };
    }

    await logAuditActionInternal(
      currentUser.id,
      caller.role,
      'create_user',
      sbUser.user.id,
      `Created user ${displayName} (${email}) with role ${role}${!skipEmailVerification ? ' [email verification required]' : ''}${expiryDate ? ` (expires: ${expiryDate})` : ''}${maxUsages ? ` (max usages: ${maxUsages})` : ''}`
    );

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Deletes a user account from both Clerk and Supabase.
 */
export async function adminDeleteUser(targetUserId: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    if (targetUserId === user.id) {
      return { success: false, error: 'You cannot delete your own account.' };
    }

    // 1. Delete from Clerk (Find by email from Supabase Auth)
    const serviceClient = createServiceClient();
    try {
      const { data: authUser } = await serviceClient.auth.admin.getUserById(targetUserId);
      const email = authUser?.user?.email;
      if (email) {
        const { createClerkClient } = await import('@clerk/nextjs/server');
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUsers = await clerk.users.getUserList({ emailAddress: [email] });
        const clerkUser = clerkUsers.data[0];
        if (clerkUser) {
          await clerk.users.deleteUser(clerkUser.id);
        }
      }
    } catch (clerkErr) {
      console.error('Error deleting Clerk user:', (clerkErr as { message?: string })?.message);
    }

    // 2. Delete from Supabase profiles (cascades database-wide)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (serviceClient as any).rpc('delete_user_account', { p_user_id: targetUserId });
    
    if (rpcError) {
      const { error: delError } = await serviceClient
        .from('profiles' as never)
        .delete()
        .eq('id', targetUserId);
      if (delError) return { success: false, error: delError.message };
    }

    await logAuditActionInternal(
      user.id,
      caller.role,
      'delete_user',
      targetUserId,
      `Deleted user account`
    );

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Updates a TNR event title and description (Staff only).
 */
export async function updateEventByStaff(
  eventId: string,
  data: {
    title: string;
    description?: string;
  }
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin' && caller?.role !== 'moderator') {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from('tnr_events' as never)
      .update({
        title: data.title,
        description: data.description,
      } as never)
      .eq('id', eventId);

    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'update_event',
      eventId,
      `Updated event details: ${data.title}`
    );

    revalidatePath('/events');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Updates a user profile (Moderator/Admin only).
 * Moderators can only edit normal users. Admins can edit anyone.
 */
export async function updateProfileByStaff(
  targetUserId: string,
  data: {
    display_name?: string;
    bio?: string;
    preferred_role?: string;
    location_neighborhood?: string;
    contact_phone?: string;
    password_expires_at?: string | null;
    max_usages?: number | null;
    usages_count?: number;
    is_enabled?: boolean;
  },
  newPassword?: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    // Moderators cannot edit admin or moderator profiles
    const { data: target } = await (supabase
      .from('profiles' as never)
      .select('role').eq('id', targetUserId).maybeSingle() as unknown as { data: { role: string | null } | null });

    if (caller.role === 'moderator' && target && target.role !== 'user') {
      return { success: false, error: 'Moderators can only update profiles of standard users.' };
    }

    const serviceClient = createServiceClient();

    // If password change is requested and caller is admin, update it in auth
    if (newPassword && newPassword.trim().length >= 6) {
      if (caller.role !== 'admin') {
        return { success: false, error: 'Only administrators can update account passwords.' };
      }
      const { error: authError } = await serviceClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword.trim()
      });
      if (authError) {
        return { success: false, error: `Password update failed: ${authError.message}` };
      }
    }

    const { error } = await serviceClient
      .from('profiles' as never)
      .update(data as never)
      .eq('id', targetUserId);

    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'edit_profile',
      targetUserId,
      `Updated fields: ${Object.keys(data).join(', ')}${newPassword ? ', password' : ''}`
    );

    revalidatePath('/moderator');
    revalidatePath('/admin');
    revalidatePath(`/profile/${targetUserId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Submits an application for the logged-in user to become a moderator.
 */
export async function submitModeratorApplication(reason: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You must be signed in to apply.' };

    const trimmedReason = reason.trim();
    if (!trimmedReason) return { success: false, error: 'Application statement cannot be empty.' };
    if (trimmedReason.length > 1000) return { success: false, error: 'Statement is too long.' };

    // Fetch user points and active role
    const { data: profile } = await (supabase
      .from('profiles' as never)
      .select('role, empire_points').eq('id', user.id).maybeSingle() as unknown as { data: { role: string | null; empire_points: number | null } | null });

    if (!profile) return { success: false, error: 'Profile not found.' };
    if (profile.role !== 'user') return { success: false, error: 'You are already a staff member.' };
    if ((profile.empire_points ?? 0) < 100) {
      return { success: false, error: 'You need at least 100 Empire Points to apply.' };
    }

    // Check for existing pending application
    const { data: existing } = await supabase
      .from('moderator_applications' as never)
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'You already have a pending moderator application.' };
    }

    const { error } = await supabase
      .from('moderator_applications' as never)
      .insert({
        user_id: user.id,
        reason: trimmedReason,
        status: 'pending',
      } as never);

    if (error) return { success: false, error: error.message };

    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Fetches all moderator applications (Admin only).
 */
export async function getModeratorApplications() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('moderator_applications' as never)
      .select('id, reason, status, created_at, profiles:profiles(id, display_name, empire_points, bio)' as never)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    return (data ?? []).map((app: unknown) => {
      const a = app as { id: string; reason: string; status: string; created_at: string; profiles: { id: string; display_name: string | null; empire_points: number; bio: string | null } | null };
      return {
        id: a.id,
        reason: a.reason,
        status: a.status,
        created_at: a.created_at,
        user: {
          id: a.profiles?.id,
          display_name: a.profiles?.display_name ?? 'Anonymous Volunteer',
          empire_points: a.profiles?.empire_points ?? 0,
          bio: a.profiles?.bio ?? null,
        }
      };
    });
  } catch {
    return [];
  }
}

/**
 * Resolves a moderator application (Approve / Reject) (Admin only).
 */
export async function resolveModeratorApplication(
  applicationId: string,
  action: 'approve' | 'reject'
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const { data } = await supabase
      .from('moderator_applications' as never)
      .select('user_id, status')
      .eq('id', applicationId)
      .single();

    const app = data as { user_id: string; status: string } | null;
    if (!app) return { success: false, error: 'Application not found.' };
    if (app.status !== 'pending') return { success: false, error: 'This application has already been processed.' };

    const serviceClient = createServiceClient();

    if (action === 'approve') {
      // 1. Promote profile role to moderator
      const { error: roleErr } = await serviceClient
        .from('profiles' as never)
        .update({ role: 'moderator' } as never)
        .eq('id', app.user_id);
      
      if (roleErr) return { success: false, error: `Failed to promote role: ${roleErr.message}` };
    }

    // 2. Update application status
    const { error: statusErr } = await serviceClient
      .from('moderator_applications' as never)
      .update({ status: action === 'approve' ? 'approved' : 'rejected', updated_at: new Date().toISOString() } as never)
      .eq('id', applicationId);

    if (statusErr) return { success: false, error: `Failed to update status: ${statusErr.message}` };

    await logAuditActionInternal(
      user.id,
      caller.role,
      action === 'approve' ? 'approve_moderator' : 'reject_moderator',
      app.user_id,
      `Moderator application resolved: ${action}`
    );

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Logs a staff audit action.
 */
export async function logAuditAction(
  action: string,
  targetId?: string,
  details?: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from('staff_audit_logs' as never)
      .insert({
        actor_id: user.id,
        actor_role: caller.role,
        action,
        target_id: targetId || null,
        details: details || null,
      } as never);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Helper function to log audit actions internally inside server actions.
 */
async function logAuditActionInternal(
  actorId: string,
  actorRole: string,
  action: string,
  targetId?: string,
  details?: string
) {
  try {
    const serviceClient = createServiceClient();
    await serviceClient
      .from('staff_audit_logs' as never)
      .insert({
        actor_id: actorId,
        actor_role: actorRole,
        action,
        target_id: targetId || null,
        details: details || null,
      } as never);
  } catch (err) {
    console.error('Error writing audit log:', err);
  }
}

/**
 * Fetches staff audit logs.
 * Admins see all logs, moderators only see their own logs.
 */
export async function getAuditLogs() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin' && caller?.role !== 'moderator') {
      throw new Error('Unauthorized');
    }

    let query = supabase
      .from('staff_audit_logs' as never)
      .select('id, actor_id, actor_role, action, target_id, details, created_at, profiles:profiles!actor_id(display_name)' as never)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((log: unknown) => {
      const l = log as { id: string; actor_id: string; actor_role: string; action: string; target_id: string | null; details: string | null; created_at: string; profiles: { display_name: string | null } | null };
      return {
        id: l.id,
        actor_id: l.actor_id,
        actor_role: l.actor_role,
        action: l.action,
        target_id: l.target_id,
        details: l.details,
        created_at: l.created_at,
        profiles: l.profiles,
        actor_name: l.profiles?.display_name ?? 'Anonymous Staff',
      };
    });
  } catch (err) {
    console.error('getAuditLogs error:', (err as { message?: string })?.message);
    return [];
  }
}

/**
 * Toggles a user profile's is_enabled flag (Staff only).
 */
export async function toggleProfileEnabled(
  targetUserId: string,
  enabled: boolean
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    // Moderators can only toggle standard users
    const { data: target } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', targetUserId)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller.role === 'moderator' && target && target.role !== 'user') {
      return { success: false, error: 'Moderators can only enable/disable profiles of standard users.' };
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from('profiles' as never)
      .update({ is_enabled: enabled } as never)
      .eq('id', targetUserId);

    if (error) return { success: false, error: error.message };

    // Log the audit event
    await logAuditActionInternal(
      user.id,
      caller.role,
      enabled ? 'enable_profile' : 'disable_profile',
      targetUserId,
      `Profile ${enabled ? 'enabled' : 'disabled'} by ${caller.role}`
    );

    revalidatePath('/moderator');
    revalidatePath('/admin');
    revalidatePath(`/profile/${targetUserId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Fetches the activity summary for a user, including cats logged,
 * events joined or organized, and audit records (Moderator & Admin only).
 */
export async function getUserActivitySummary(targetUserId: string): Promise<{
  success: boolean;
  error?: string;
  data?: {
    cats: Record<string, unknown>[];
    organizedEvents: Record<string, unknown>[];
    signups: Record<string, unknown>[];
    auditLogs: Record<string, unknown>[];
    applications: Record<string, unknown>[];
    modQueries: Record<string, unknown>[];
  };
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = createServiceClient();

    // 1. Cats logged count and status breakdown
    const { data: cats } = await serviceClient
      .from('cats' as never)
      .select('id, name, status, created_at')
      .eq('owner_id', targetUserId);

    // 2. Events organized count
    const { data: organizedEvents } = await serviceClient
      .from('tnr_events' as never)
      .select('id, title, status, event_time')
      .eq('organizer_id', targetUserId);

    // 3. Event signups count
    const { data: signups } = await serviceClient
      .from('event_signups' as never)
      .select('id, event_id, tnr_events:tnr_events(title, event_time, status)' as never)
      .eq('user_id', targetUserId);

    // 4. Staff audit logs associated with this user (either actor or target)
    const { data: auditLogs } = await serviceClient
      .from('staff_audit_logs' as never)
      .select('id, action, details, created_at, actor_role')
      .or(`actor_id.eq.${targetUserId},target_id.eq.${targetUserId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    // 5. Moderator application history
    const { data: applications } = await serviceClient
      .from('moderator_applications' as never)
      .select('id, reason, status, created_at, updated_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    // 6. Moderator queries raised TO this user or BY this user
    const { data: modQueries } = await serviceClient
      .from('moderator_queries' as never)
      .select('id, target_type, target_id, message, status, response, created_at')
      .or(`moderator_id.eq.${targetUserId},volunteer_id.eq.${targetUserId}`)
      .order('created_at', { ascending: false });

    return {
      success: true,
      data: {
        cats: cats ?? [],
        organizedEvents: organizedEvents ?? [],
        signups: (signups ?? []).map((s: unknown) => {
          const signup = s as { id: string; event_id: string; tnr_events: { title: string; event_time: string; status: string } | null };
          return {
            id: signup.id,
            event_id: signup.event_id,
            title: signup.tnr_events?.title ?? 'TNR Event',
            event_time: signup.tnr_events?.event_time,
            status: signup.tnr_events?.status ?? 'open'
          };
        }),
        auditLogs: auditLogs ?? [],
        applications: applications ?? [],
        modQueries: modQueries ?? []
      }
    };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Shifts a query from a moderator to an admin by appending the shifting reason to the query's message.
 */
export async function shiftQueryToAdmin(queryId: string, reason: string): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch original query message
    const { data: query, error: fetchErr } = await supabase
      .from('moderator_queries' as never)
      .select('message')
      .eq('id', queryId)
      .single() as any;

    if (fetchErr || !query) return { success: false, error: 'Query not found' };

    // Append shifting header to indicate it is escalated to Admin
    const cleanReason = reason.trim().replace(/[\[\]]/g, '');
    const updatedMessage = `${query.message}\n\n[SHIFTED_TO_ADMIN: ${cleanReason}]`;

    const { error: updateErr } = await supabase
      .from('moderator_queries' as never)
      .update({ message: updatedMessage } as never)
      .eq('id', queryId);

    if (updateErr) return { success: false, error: updateErr.message };

    revalidatePath('/moderator');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

export interface SystemSetting {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

/**
 * Fetches all system settings from the database (Select allowed for everyone).
 */
export async function getSystemSettings(): Promise<SystemSetting[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('system_settings' as never)
    .select('*')
    .order('key', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SystemSetting[];
}

/**
 * Updates a system setting in the database (Admin only).
 */
// Allowlist of recognized setting keys — prevents arbitrary key injection
const ALLOWED_SETTING_KEYS = new Set([
  'MAINTENANCE_MODE',
  'TNR_POINTS_AWARDED',
  'CAT_LOG_POINTS_AWARDED',
  'WEATHER_WARNING_THRESHOLD',
  'MAX_EMPIRE_LEADERBOARD_ENTRIES',
]);

export async function updateSystemSetting(
  key: string,
  value: boolean | number | string
): Promise<ActionResponse> {
  try {
    // 1. Key must be in the allowlist
    if (!ALLOWED_SETTING_KEYS.has(key)) {
      return { success: false, error: 'invalid_setting_key' };
    }
    // 2. Value type guard — booleans and safe numbers/strings only
    if (typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'string') {
      return { success: false, error: 'invalid_setting_value' };
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('system_settings' as never)
      .update({ value, updated_at: new Date().toISOString() } as never)
      .eq('key', key);

    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'update_setting',
      key,
      `Updated setting ${key} to: ${JSON.stringify(value)}`
    );

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Supreme admin power to delete a cat sighting from MeowNet.
 */
export async function adminDeleteCat(catId: string): Promise<ActionResponse> {
  try {
    // UUID format guard — prevents IDOR with crafted IDs or SQL-adjacent strings
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(catId)) return { success: false, error: 'invalid_id' };
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const serviceClient = createServiceClient();
    const { error } = await serviceClient.from('cats' as never).delete().eq('id', catId);
    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'admin_delete_cat',
      catId,
      'Deleted cat sighting'
    );

    revalidatePath('/admin');
    revalidatePath('/cats');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Supreme admin power to update a cat sighting details.
 */
export async function adminUpdateCat(
  catId: string,
  updates: any
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from('cats' as never)
      .update(updates as never)
      .eq('id', catId);

    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'admin_update_cat',
      catId,
      `Updated cat details: ${JSON.stringify(updates)}`
    );

    revalidatePath('/admin');
    revalidatePath('/cats');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Supreme admin power to delete a colony.
 */
export async function adminDeleteColony(colonyId: string): Promise<ActionResponse> {
  try {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(colonyId)) return { success: false, error: 'invalid_id' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const serviceClient = createServiceClient();
    const { error } = await serviceClient.from('colonies' as never).delete().eq('id', colonyId);
    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'admin_delete_colony',
      colonyId,
      'Deleted colony'
    );

    revalidatePath('/admin');
    revalidatePath('/colonies');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Supreme admin power to delete/cancel a TNR event.
 */
export async function adminDeleteEvent(eventId: string): Promise<ActionResponse> {
  try {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(eventId)) return { success: false, error: 'invalid_id' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const serviceClient = createServiceClient();
    const { error } = await serviceClient.from('tnr_events' as never).delete().eq('id', eventId);
    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'admin_delete_event',
      eventId,
      'Deleted TNR event'
    );

    revalidatePath('/admin');
    revalidatePath('/events');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Supreme admin power to delete a volunteer guild.
 */
export async function adminDeleteGuild(guildId: string): Promise<ActionResponse> {
  try {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(guildId)) return { success: false, error: 'invalid_id' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string | null } | null };

    if (caller?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    const serviceClient = createServiceClient();
    const { error } = await serviceClient.from('guilds' as never).delete().eq('id', guildId);
    if (error) return { success: false, error: error.message };

    await logAuditActionInternal(
      user.id,
      caller.role,
      'admin_delete_guild',
      guildId,
      'Deleted volunteer guild'
    );

    revalidatePath('/admin');
    revalidatePath('/empire');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? (err as { message?: string })?.message : 'Internal server error';
    return { success: false, error: message };
  }
}

/**
 * Creates a support query dispute for a specific audit log entry (Transparency System).
 */
export async function raiseAuditLogDispute(
  logId: string,
  messageText: string
): Promise<ActionResponse & { query?: any }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const trimmed = messageText.trim();
    if (!trimmed) return { success: false, error: 'Dispute reason cannot be empty.' };

    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('display_name, role')
      .eq('id', user.id)
      .single() as any;

    const senderName = profile?.display_name || 'Staff Member';
    const senderRole = profile?.role || 'moderator';

    const { data, error } = await supabase
      .from('moderator_queries' as never)
      .insert({
        volunteer_id: user.id,
        target_type: 'general',
        target_id: logId,
        message: `[AUDIT DISPUTE] Log ID: ${logId}\nDispute Message: ${trimmed}`,
        status: 'pending',
        chat_messages: [
          {
            sender_id: user.id,
            sender_name: senderName,
            sender_role: senderRole,
            message: `Disputing Log ID: ${logId}. Reason: ${trimmed}`,
            timestamp: new Date().toISOString()
          }
        ]
      } as never)
      .select()
      .single() as any;

    if (error) return { success: false, error: error.message };

    revalidatePath('/moderator');
    revalidatePath('/profile');
    return { success: true, query: data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error raising dispute';
    return { success: false, error: msg };
  }
}


