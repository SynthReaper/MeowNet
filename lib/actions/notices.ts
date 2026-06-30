'use server';
// lib/actions/notices.ts — Server Actions for Notice Board & Broadcasts

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import { z } from 'zod';

const NoticeCreateSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(3).max(2000),
  is_broadcast: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  broadcast_type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  is_popup: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  expires_at: z.string().optional().nullable().transform((val) => val ? new Date(val).toISOString() : null),
  target_page: z.string().default('all'),
  pinned: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

const NoticeUpdateSchema = NoticeCreateSchema.extend({
  active: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
});

export interface Notice {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_broadcast: boolean;
  broadcast_type: 'info' | 'warning' | 'error' | 'success';
  is_popup: boolean;
  expires_at: string | null;
  active: boolean;
  target_page: string;
  pinned: boolean;
}

/**
 * Helper to log staff notice operations to the audit trail logs.
 */
async function logNoticeAudit(
  actorId: string,
  actorRole: string,
  action: string,
  targetId: string,
  details: string
) {
  try {
    const serviceClient = createServiceClient();
    await serviceClient
      .from('staff_audit_logs' as never)
      .insert({
        actor_id: actorId,
        actor_role: actorRole,
        action,
        target_id: targetId,
        details,
      } as never);
  } catch (err) {
    console.error('Error writing notice audit log:', err);
  }
}

export async function getNotices() {
  try {
    const supabase = await createServerClient();
    
    // Select active and unexpired notices, joined with author profile, sorted by pinned first, then created_at
    const { data, error } = await supabase
      .from('notices' as never)
      .select('id, title, content, created_by, created_at, updated_at, is_broadcast, broadcast_type, is_popup, expires_at, active, target_page, pinned, profiles(display_name)')
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices:', error);
      return { success: false, error: 'fetch_failed' };
    }
    return { success: true, data: (data || []) as unknown as Notice[] };
  } catch (err) {
    console.error('getNotices internal error:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function getPinnedNotice() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('notices' as never)
      .select('id, title, content, is_broadcast, broadcast_type, target_page, pinned')
      .eq('active', true)
      .eq('pinned', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching pinned notice:', error);
      return { success: false, error: 'fetch_failed' };
    }
    return { success: true, data: data as unknown as Notice | null };
  } catch (err) {
    console.error('getPinnedNotice internal error:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function createNotice(formData: FormData) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Fetch the role of the caller
    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'forbidden' };
    }

    const rawData = Object.fromEntries(formData.entries());
    const parsed = NoticeCreateSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: 'validation_failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const d = parsed.data;

    // Enforce role check: only admins can create broadcasts or popups
    if ((d.is_broadcast || d.is_popup) && caller.role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can create site-wide broadcasts or popup notices.',
      };
    }

    const { data, error } = await supabase
      .from('notices' as never)
      .insert({
        title: sanitizeText(d.title, 200),
        content: sanitizeText(d.content, 2000),
        created_by: user.id,
        is_broadcast: d.is_broadcast,
        broadcast_type: d.broadcast_type,
        is_popup: d.is_popup,
        expires_at: d.expires_at,
        target_page: d.target_page,
        pinned: d.pinned,
        active: true,
      } as never)
      .select('id')
      .maybeSingle() as unknown as { data: { id: string } | null; error: unknown };

    if (error) {
      console.error('Error inserting notice:', error);
      return { success: false, error: 'insert_failed' };
    }

    if (data?.id) {
      await logNoticeAudit(
        user.id,
        caller.role,
        'create_notice',
        data.id,
        `Created notice "${d.title}"`
      );
    }

    revalidatePath('/notices');
    if (d.is_broadcast || d.is_popup) {
      revalidatePath('/', 'layout');
    }

    return { success: true, noticeId: data?.id };
  } catch (err) {
    console.error('createNotice internal error:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function updateNotice(id: string, formData: FormData) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Fetch the role of the caller
    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'forbidden' };
    }

    // Fetch the existing notice to verify permissions
    const { data: existingNotice } = await supabase
      .from('notices' as never)
      .select('is_broadcast, is_popup')
      .eq('id', id)
      .maybeSingle() as unknown as { data: { is_broadcast: boolean; is_popup: boolean } | null };

    if (existingNotice && (existingNotice.is_broadcast || existingNotice.is_popup) && caller.role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can modify site-wide broadcasts or popup notices.',
      };
    }

    const rawData = Object.fromEntries(formData.entries());
    const parsed = NoticeUpdateSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: 'validation_failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const d = parsed.data;

    // Enforce role check: only admins can toggle broadcasts or popups
    if ((d.is_broadcast || d.is_popup) && caller.role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can create site-wide broadcasts or popup notices.',
      };
    }

    const { error } = await supabase
      .from('notices' as never)
      .update({
        title: sanitizeText(d.title, 200),
        content: sanitizeText(d.content, 2000),
        is_broadcast: d.is_broadcast,
        broadcast_type: d.broadcast_type,
        is_popup: d.is_popup,
        expires_at: d.expires_at,
        target_page: d.target_page,
        pinned: d.pinned,
        active: d.active,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id);

    if (error) {
      console.error('Error updating notice:', error);
      return { success: false, error: 'update_failed' };
    }

    await logNoticeAudit(
      user.id,
      caller.role,
      'update_notice',
      id,
      `Updated notice "${d.title}"`
    );

    revalidatePath('/notices');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err) {
    console.error('updateNotice internal error:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function deleteNotice(id: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Fetch the role of the caller
    const { data: caller } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { role: string } | null };

    if (caller?.role !== 'moderator' && caller?.role !== 'admin') {
      return { success: false, error: 'forbidden' };
    }

    // Fetch the existing notice to verify permissions
    const { data: existingNotice } = await supabase
      .from('notices' as never)
      .select('is_broadcast, is_popup')
      .eq('id', id)
      .maybeSingle() as unknown as { data: { is_broadcast: boolean; is_popup: boolean } | null };

    if (existingNotice && (existingNotice.is_broadcast || existingNotice.is_popup) && caller.role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can delete site-wide broadcasts or popup notices.',
      };
    }

    const { error } = await supabase
      .from('notices' as never)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notice:', error);
      return { success: false, error: 'delete_failed' };
    }

    await logNoticeAudit(
      user.id,
      caller.role,
      'delete_notice',
      id,
      `Deleted notice with ID: ${id}`
    );

    revalidatePath('/notices');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err) {
    console.error('deleteNotice internal error:', err);
    return { success: false, error: 'internal_error' };
  }
}
