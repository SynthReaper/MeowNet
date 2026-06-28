'use server';

// lib/actions/audit.ts — Unified System Activity & Audit Logs Server Actions
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Logs an activity to the system audit trail.
 * Uses the database-level log_system_activity function which automatically
 * infers and enforces the correct actor_id and actor_role.
 */
export async function logActivity(action: string, targetId?: string, details?: string) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const { error } = await (supabase as any).rpc('log_system_activity', {
      p_action: action,
      p_target_id: targetId || null,
      p_details: details || null
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to log system activity:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches the audit trail for the currently logged-in volunteer.
 * Due to database RLS, the user can only fetch their own logs.
 */
export async function getUserActivities() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized', logs: [] };

  try {
    const { data, error } = await supabase
      .from('staff_audit_logs' as never)
      .select('id, action, target_id, details, created_at')
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, logs: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, logs: [] };
  }
}

/**
 * Fetches the audit trail for moderators.
 * Due to database RLS, this automatically excludes all admin operations.
 */
export async function getModeratorAuditLogs() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized', logs: [] };

  try {
    const { data, error } = await supabase
      .from('staff_audit_logs' as never)
      .select('id, actor_id, actor_role, action, target_id, details, created_at, profiles:actor_id(display_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, logs: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, logs: [] };
  }
}
