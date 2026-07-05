'use server';
// lib/actions/chapters.ts — Server Actions for Chapter / Regional System
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChapterMemberRole = 'member' | 'coordinator' | 'assistant';

export interface Chapter {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly coordinator_id: string | null;
  readonly description: string | null;
  readonly meeting_schedule: string | null;
  readonly member_count: number;
  readonly created_at: string;
}

export interface ChapterMember {
  readonly id: string;
  readonly chapter_id: string;
  readonly user_id: string;
  readonly role: ChapterMemberRole;
  readonly joined_at: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateChapterSchema = z.object({
  name: z.string().min(3).max(200),
  region: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  meeting_schedule: z.string().max(500).optional(),
  coordinator_id: z.string().uuid().optional(),
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

// ─── Chapter CRUD ─────────────────────────────────────────────────────────────

export async function createChapter(formData: FormData): Promise<ActionResponse & { chapterId?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'admin') return { success: false, error: 'Admin access required' };

    const parsed = CreateChapterSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid chapter data' };

    const { name, region, description, meeting_schedule, coordinator_id } = parsed.data;

    if (coordinator_id && !isValidUUID(coordinator_id)) {
      return { success: false, error: 'Invalid coordinator ID' };
    }

    const { data: chapter } = await supabase
      .from('chapters' as never)
      .insert({
        name: sanitizeText(name),
        region: sanitizeText(region),
        description: description ? sanitizeText(description) : null,
        meeting_schedule: meeting_schedule ? sanitizeText(meeting_schedule) : null,
        coordinator_id: coordinator_id ?? null,
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null };

    revalidatePath('/chapters');
    revalidatePath('/admin/chapters');
    return { success: true, chapterId: chapter?.id };
  } catch {
    return { success: false, error: 'Failed to create chapter' };
  }
}

export async function joinChapter(chapterId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(chapterId)) return { success: false, error: 'Invalid chapter ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Check user is not already a member
    const { data: existing } = await supabase
      .from('chapter_members' as never)
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('user_id', user.id)
      .maybeSingle() as unknown as { data: { id: string } | null };

    if (existing) return { success: false, error: 'Already a member of this chapter' };

    await supabase
      .from('chapter_members' as never)
      .insert({ chapter_id: chapterId, user_id: user.id, role: 'member' } as never) as unknown as { error: unknown };

    revalidatePath('/chapters');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to join chapter' };
  }
}

export async function leaveChapter(chapterId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(chapterId)) return { success: false, error: 'Invalid chapter ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await supabase
      .from('chapter_members' as never)
      .delete()
      .eq('chapter_id', chapterId)
      .eq('user_id', user.id) as unknown as { error: unknown };

    revalidatePath('/chapters');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to leave chapter' };
  }
}

export async function listChapters(): Promise<Chapter[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('chapters' as never)
      .select('*')
      .order('name') as unknown as { data: Chapter[] | null };

    return data ?? [];
  } catch {
    return [];
  }
}

export async function getChapterMembers(chapterId: string): Promise<ChapterMember[]> {
  try {
    if (!isValidUUID(chapterId)) return [];

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('chapter_members' as never)
      .select('*, profiles:profiles(display_name, avatar_url)')
      .eq('chapter_id', chapterId)
      .order('joined_at') as unknown as { data: ChapterMember[] | null };

    return data ?? [];
  } catch {
    return [];
  }
}
