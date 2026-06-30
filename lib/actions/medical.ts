'use server';

// lib/actions/medical.ts — Server Actions for Veterinary Medical Logs & Colony Funds
import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { makeActionKey } from '@/lib/gamification/points';

// Helper to check user session
async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createMedicalLog(colonyId: string, logType: 'vaccine' | 'parasite_treatment' | 'injury' | 'checkup', notes: string) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  if (!notes || notes.trim().length < 3) {
    return { success: false, error: 'Notes must be at least 3 characters.' };
  }

  try {
    const { data, error } = await supabase
      .from('colony_medical_logs' as never)
      .insert({
        colony_id: colonyId,
        recorded_by: user.id,
        log_type: logType,
        notes: notes.trim(),
      } as never)
      .select()
      .single();

    if (error) throw error;

    // Award volunteer points for registering a medical action (+15 XP)
    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'MEDICAL_LOG', `${colonyId}:${logType}:${Date.now()}`);
    await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'MEDICAL_LOG',
      p_points: 15,
      p_related_id: colonyId,
      p_action_key: actionKey,
    });

    // Log to system audit trail
    await (supabase as any).rpc('log_system_activity', {
      p_action: 'MEDICAL_LOG_CREATED',
      p_target_id: colonyId,
      p_details: `Logged ${logType} record: "${notes.trim().substring(0, 40)}${notes.trim().length > 40 ? '...' : ''}" (+15 XP)`
    });

    revalidatePath(`/colonies/${colonyId}`);
    return { success: true, log: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMedicalLogs(colonyId: string) {
  const supabase = await createServerClient();
  try {
    const { data, error } = await supabase
      .from('colony_medical_logs' as never)
      .select('id, log_type, notes, created_at, profiles:recorded_by(display_name)')
      .eq('colony_id', colonyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedLogs = (data ?? []).map((row: any) => ({
      id: row.id,
      log_type: row.log_type,
      notes: row.notes,
      created_at: row.created_at,
      recorded_by: row.profiles?.display_name || 'Anonymous Rescuer'
    }));

    return { success: true, logs: formattedLogs };
  } catch (err: any) {
    return { success: false, error: err.message, logs: [] };
  }
}

export async function transferEmpirePointsToColonyFund(colonyId: string, amountPoints: number) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  if (amountPoints <= 0) return { success: false, error: 'Invalid amount' };

  try {
    // 1. Check user points
    const { data: dbProfile } = await supabase
      .from('profiles' as never)
      .select('empire_points')
      .eq('id', user.id)
      .single();

    const userPoints = (dbProfile as any)?.empire_points ?? 0;
    if (userPoints < amountPoints) {
      return { success: false, error: 'insufficient_points' };
    }

    // 2. Deduct points via award_points (negative points)
    const admin = createServiceClient();
    const deductKey = makeActionKey(user.id, 'COLONY_DONATION', `deduct:${colonyId}:${Date.now()}`);
    const { error: deductError } = await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'COLONY_DONATION',
      p_points: -amountPoints,
      p_related_id: colonyId,
      p_action_key: deductKey,
    });

    if (deductError) throw deductError;

    // 3. Increment colony community fund
    // Check if fund row exists
    let { data: fund } = await supabase
      .from('community_fund' as never)
      .select('*')
      .eq('colony_id', colonyId)
      .maybeSingle();

    if (!fund) {
      const { data: newFund, error: insertError } = await supabase
        .from('community_fund' as never)
        .insert({
          colony_id: colonyId,
          balance: amountPoints,
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;
      fund = newFund;
    } else {
      const { error: updateError } = await supabase
        .from('community_fund' as never)
        .update({
          balance: ((fund as any).balance || 0) + amountPoints,
        } as never)
        .eq('colony_id', colonyId);

      if (updateError) throw updateError;
    }

    // Log to system audit trail
    await (supabase as any).rpc('log_system_activity', {
      p_action: 'COLONY_FUND_DONATION',
      p_target_id: colonyId,
      p_details: `Donated ${amountPoints} Empire Points to colony community care fund`
    });

    // Log in point_log for fund audit
    revalidatePath(`/colonies/${colonyId}`);
    return { success: true, newBalance: ((fund as any).balance || 0) + amountPoints };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
