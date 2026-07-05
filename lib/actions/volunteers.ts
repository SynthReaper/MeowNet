'use server';
// lib/actions/volunteers.ts — Server Actions for Volunteer Management System
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { stripExifAndNormalize } from '@/lib/security/exif';
import { sanitizeText } from '@/lib/security/sanitize';
import { makeActionKey } from '@/lib/gamification/points';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkillType =
  | 'tnr_assistant'
  | 'vet_liaison'
  | 'transporter'
  | 'photographer'
  | 'fundraiser'
  | 'educator'
  | 'medical_assistant';

export type TaskStatus = 'open' | 'claimed' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'feeding' | 'trapping' | 'vet_visit' | 'supply_run' | 'transport' | 'monitoring';
export type ActivityType = 'feeding' | 'trapping' | 'transport' | 'event' | 'education' | 'fundraising';

export interface VolunteerAvailability {
  readonly id: string;
  readonly user_id: string;
  readonly day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly start_time: string;
  readonly end_time: string;
  readonly is_active: boolean;
  readonly created_at: string;
}

export interface VolunteerSkill {
  readonly id: string;
  readonly user_id: string;
  readonly skill_type: SkillType;
  readonly verified: boolean;
  readonly verified_by: string | null;
  readonly verified_at: string | null;
  readonly created_at: string;
  readonly info?: string | null;
  readonly proof?: string | null;
  readonly status: 'pending' | 'query_raised' | 'verified' | 'rejected';
  readonly mod_query?: string | null;
  readonly volunteer_response?: string | null;
  readonly profiles?: { display_name: string | null } | null;
}

export interface VolunteerHours {
  readonly id: string;
  readonly user_id: string;
  readonly colony_id: string | null;
  readonly activity_type: ActivityType;
  readonly hours: number;
  readonly date: string;
  readonly notes: string | null;
  readonly verified_by: string | null;
  readonly verified_at: string | null;
  readonly created_at: string;
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly colony_id: string | null;
  readonly task_type: TaskType;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly required_skills: SkillType[];
  readonly claimed_by: string | null;
  readonly created_by: string;
  readonly due_date: string | null;
  readonly completed_at: string | null;
  readonly verification_photo_url: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AvailabilitySchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  is_active: z.coerce.boolean().default(true),
});

const LogHoursSchema = z.object({
  colony_id: z.string().uuid().optional(),
  activity_type: z.enum(['feeding', 'trapping', 'transport', 'event', 'education', 'fundraising']),
  hours: z.coerce.number().min(0.25).max(24),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

const CreateTaskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  colony_id: z.string().uuid().optional(),
  task_type: z.enum(['feeding', 'trapping', 'vet_visit', 'supply_run', 'transport', 'monitoring']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  required_skills: z.array(z.string()).default([]),
  due_date: z.string().datetime().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function getCallerRole(supabase: Awaited<ReturnType<typeof createServerClient>>, userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', userId)
    .maybeSingle() as unknown as { data: { role: string | null } | null };
  return data?.role ?? 'user';
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function setVolunteerAvailability(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = AvailabilitySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid availability data' };

    const { day_of_week, start_time, end_time, is_active } = parsed.data;

    await supabase
      .from('volunteer_availability' as never)
      .upsert({
        user_id: user.id,
        day_of_week,
        start_time,
        end_time,
        is_active,
      } as never, { onConflict: 'user_id,day_of_week,start_time' }) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to set availability' };
  }
}

export async function getVolunteerAvailability(userId?: string): Promise<VolunteerAvailability[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const targetId = userId ?? user.id;
    if (userId && userId !== user.id) {
      const role = await getCallerRole(supabase, user.id);
      if (role !== 'moderator' && role !== 'admin') return [];
    }

    const { data } = await supabase
      .from('volunteer_availability' as never)
      .select('*')
      .eq('user_id', targetId)
      .order('day_of_week')
      .order('start_time') as unknown as { data: VolunteerAvailability[] | null };

    return data ?? [];
  } catch {
    return [];
  }
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export async function claimSkill(
  skillType: SkillType,
  info: string,
  proof: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const sanitizedInfo = sanitizeText(info || '');
    const sanitizedProof = sanitizeText(proof || '');

    if (!sanitizedInfo) return { success: false, error: 'Experience details (info) is required.' };
    if (!sanitizedProof) return { success: false, error: 'Proof/references is required.' };

    await supabase
      .from('volunteer_skills' as never)
      .insert({
        user_id: user.id,
        skill_type: skillType,
        info: sanitizedInfo,
        proof: sanitizedProof,
        status: 'pending',
        verified: false,
      } as never) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to claim skill' };
  }
}

export async function verifySkill(userId: string, skillType: SkillType): Promise<ActionResponse> {
  try {
    if (!isValidUUID(userId)) return { success: false, error: 'Invalid user ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    await supabase
      .from('volunteer_skills' as never)
      .update({
        verified: true,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        status: 'verified',
      } as never)
      .eq('user_id', userId)
      .eq('skill_type', skillType) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to verify skill' };
  }
}

export async function rejectSkill(userId: string, skillType: SkillType): Promise<ActionResponse> {
  try {
    if (!isValidUUID(userId)) return { success: false, error: 'Invalid user ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    await supabase
      .from('volunteer_skills' as never)
      .update({
        status: 'rejected',
        verified: false,
      } as never)
      .eq('user_id', userId)
      .eq('skill_type', skillType) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to reject skill' };
  }
}

export async function raiseQueryOnSkill(
  userId: string,
  skillType: SkillType,
  queryText: string
): Promise<ActionResponse> {
  try {
    if (!isValidUUID(userId)) return { success: false, error: 'Invalid user ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    const sanitizedQuery = sanitizeText(queryText || '');
    if (!sanitizedQuery) return { success: false, error: 'Query text is required.' };

    await supabase
      .from('volunteer_skills' as never)
      .update({
        status: 'query_raised',
        mod_query: sanitizedQuery,
      } as never)
      .eq('user_id', userId)
      .eq('skill_type', skillType) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to raise query on skill' };
  }
}

export async function respondToSkillQuery(
  skillType: SkillType,
  responseText: string
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const sanitizedResponse = sanitizeText(responseText || '');
    if (!sanitizedResponse) return { success: false, error: 'Response text is required.' };

    await supabase
      .from('volunteer_skills' as never)
      .update({
        status: 'pending',
        volunteer_response: sanitizedResponse,
      } as never)
      .eq('user_id', user.id)
      .eq('skill_type', skillType) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to respond to query' };
  }
}

export async function getPendingSkills(): Promise<any[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return [];

    const { data } = await supabase
      .from('volunteer_skills' as never)
      .select('*, profiles:profiles(display_name)')
      .in('status', ['pending', 'query_raised', 'rejected']) as unknown as { data: any[] | null };

    return data ?? [];
  } catch {
    return [];
  }
}

// ─── Hours ────────────────────────────────────────────────────────────────────

export async function logVolunteerHours(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = LogHoursSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid hours data' };

    const { colony_id, activity_type, hours, date, notes } = parsed.data;

    if (colony_id && !isValidUUID(colony_id)) return { success: false, error: 'Invalid colony ID' };

    await supabase
      .from('volunteer_hours' as never)
      .insert({
        user_id: user.id,
        colony_id: colony_id ?? null,
        activity_type,
        hours,
        date,
        notes: notes ? sanitizeText(notes) : null,
      } as never) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to log hours' };
  }
}

export async function verifyHours(hoursId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(hoursId)) return { success: false, error: 'Invalid hours ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    // Query details before update to calculate points
    const { data: hoursEntry } = await supabase
      .from('volunteer_hours' as never)
      .select('user_id, hours')
      .eq('id', hoursId)
      .maybeSingle() as unknown as { data: { user_id: string; hours: number } | null };

    if (!hoursEntry) return { success: false, error: 'Hours log entry not found' };

    await supabase
      .from('volunteer_hours' as never)
      .update({ verified_by: user.id, verified_at: new Date().toISOString() } as never)
      .eq('id', hoursId) as unknown as { error: unknown };

    // Award points (idempotent via makeActionKey)
    const admin = createServiceClient();
    const actionKey = makeActionKey(hoursEntry.user_id, 'HOURS_LOGGED', hoursId);
    const calculatedPoints = Math.round(Number(hoursEntry.hours) * 10);
    await (admin as any).rpc('award_points', {
      p_user_id: hoursEntry.user_id,
      p_activity: 'HOURS_LOGGED',
      p_points: calculatedPoints,
      p_related_id: hoursId,
      p_action_key: actionKey,
    });

    revalidatePath('/admin/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to verify hours' };
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    const rawSkills = formData.get('required_skills');
    const skillsArray = rawSkills ? JSON.parse(rawSkills as string) : [];

    const parsed = CreateTaskSchema.safeParse({
      ...Object.fromEntries(formData),
      required_skills: skillsArray,
    });
    if (!parsed.success) return { success: false, error: 'Invalid task data' };

    const { title, description, colony_id, task_type, priority, required_skills, due_date } = parsed.data;

    if (colony_id && !isValidUUID(colony_id)) return { success: false, error: 'Invalid colony ID' };

    await supabase
      .from('tasks' as never)
      .insert({
        title: sanitizeText(title),
        description: description ? sanitizeText(description) : null,
        colony_id: colony_id ?? null,
        task_type,
        priority,
        required_skills,
        due_date: due_date ?? null,
        created_by: user.id,
      } as never) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to create task' };
  }
}

export async function claimTask(taskId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(taskId)) return { success: false, error: 'Invalid task ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Check task is still open
    const { data: task } = await supabase
      .from('tasks' as never)
      .select('status')
      .eq('id', taskId)
      .maybeSingle() as unknown as { data: { status: string } | null };

    if (!task || task.status !== 'open') return { success: false, error: 'Task is not available' };

    await supabase
      .from('tasks' as never)
      .update({ claimed_by: user.id, status: 'claimed' } as never)
      .eq('id', taskId)
      .eq('status', 'open') as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to claim task' };
  }
}

export async function completeTask(taskId: string, verificationPhoto?: File): Promise<ActionResponse> {
  try {
    if (!isValidUUID(taskId)) return { success: false, error: 'Invalid task ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify task is claimed by this user
    const { data: task } = await supabase
      .from('tasks' as never)
      .select('claimed_by, status')
      .eq('id', taskId)
      .maybeSingle() as unknown as { data: { claimed_by: string; status: string } | null };

    if (!task || task.claimed_by !== user.id) return { success: false, error: 'Unauthorized' };
    if (task.status === 'completed') return { success: false, error: 'Task already completed' };

    let verificationPhotoUrl: string | null = null;

    if (verificationPhoto) {
      // EXIF strip before upload
      const buffer = await verificationPhoto.arrayBuffer();
      const stripped = await stripExifAndNormalize(Buffer.from(buffer));
      const filename = `tasks/${taskId}/${Date.now()}.jpg`;
      await supabase.storage.from('task-verification').upload(filename, stripped.buffer, { contentType: 'image/jpeg' });
      const { data: urlData } = supabase.storage.from('task-verification').getPublicUrl(filename);
      verificationPhotoUrl = urlData.publicUrl;
    }

    await supabase
      .from('tasks' as never)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        verification_photo_url: verificationPhotoUrl,
      } as never)
      .eq('id', taskId) as unknown as { error: unknown };

    revalidatePath('/volunteers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to complete task' };
  }
}

export async function getVolunteerMatches(colonyId: string): Promise<ActionResponse & { matches?: unknown[] }> {
  try {
    if (!isValidUUID(colonyId)) return { success: false, error: 'Invalid colony ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown[] | null }> })
      .rpc('get_volunteer_matches', { p_colony_id: colonyId, p_limit: 10 });

    return { success: true, matches: data ?? [] };
  } catch {
    return { success: false, error: 'Failed to get matches' };
  }
}
