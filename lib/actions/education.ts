'use server';
// lib/actions/education.ts — Server Actions for Education, Courses, Stories
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { stripExifAndNormalize } from '@/lib/security/exif';
import { sanitizeText } from '@/lib/security/sanitize';
import { makeActionKey, POINT_VALUES } from '@/lib/gamification/points';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CourseCategory = 'basic_tnr' | 'advanced_tnr' | 'medical' | 'colony_management' | 'fundraising';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type StoryStatus = 'draft' | 'submitted' | 'approved' | 'published' | 'rejected';

export interface Course {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly category: CourseCategory;
  readonly difficulty: CourseDifficulty;
  readonly content: unknown;
  readonly duration_hours: number | null;
  readonly certification_eligible: boolean;
  readonly is_published: boolean;
  readonly created_by: string;
  readonly created_at: string;
}

export interface CourseEnrollment {
  readonly id: string;
  readonly user_id: string;
  readonly course_id: string;
  readonly progress: number;
  readonly completed_at: string | null;
  readonly certificate_url: string | null;
  readonly enrolled_at: string;
}

export interface StorySubmission {
  readonly id: string;
  readonly author_id: string;
  readonly title: string;
  readonly content: string;
  readonly hero_image_url: string | null;
  readonly tags: string[];
  readonly status: StoryStatus;
  readonly published_at: string | null;
  readonly view_count: number;
  readonly created_at: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const EnrollSchema = z.object({
  course_id: z.string().uuid(),
});

const ProgressSchema = z.object({
  enrollment_id: z.string().uuid(),
  progress: z.coerce.number().min(0).max(100),
});

const SubmitStorySchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(50).max(10000),
  tags: z.string().optional(), // JSON array string
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

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function enrollInCourse(courseId: string): Promise<ActionResponse & { enrollmentId?: string }> {
  try {
    if (!isValidUUID(courseId)) return { success: false, error: 'Invalid course ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Check course exists and is published
    const { data: course } = await supabase
      .from('courses' as never)
      .select('id, is_published')
      .eq('id', courseId)
      .maybeSingle() as unknown as { data: { id: string; is_published: boolean } | null };

    if (!course || !course.is_published) return { success: false, error: 'Course not available' };

    // Upsert enrollment (idempotent)
    const { data: enrollment } = await supabase
      .from('course_enrollments' as never)
      .upsert({ user_id: user.id, course_id: courseId } as never, { onConflict: 'user_id,course_id' })
      .select('id')
      .single() as unknown as { data: { id: string } | null };

    revalidatePath('/education');
    return { success: true, enrollmentId: enrollment?.id };
  } catch {
    return { success: false, error: 'Failed to enroll in course' };
  }
}

export async function updateCourseProgress(enrollmentId: string, progress: number): Promise<ActionResponse> {
  try {
    const parsed = ProgressSchema.safeParse({ enrollment_id: enrollmentId, progress });
    if (!parsed.success) return { success: false, error: 'Invalid progress data' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const updates: Record<string, unknown> = { progress: parsed.data.progress };
    if (parsed.data.progress >= 100) {
      return { success: false, error: 'Course completion is only allowed by passing the quiz.' };
    }

    await supabase
      .from('course_enrollments' as never)
      .update(updates as never)
      .eq('id', enrollmentId)
      .eq('user_id', user.id) as unknown as { error: unknown };

    revalidatePath('/education');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update progress' };
  }
}

export async function completeQuiz(
  enrollmentId: string,
  answers: Record<string, string>
): Promise<ActionResponse & { score?: number; passed?: boolean }> {
  try {
    if (!isValidUUID(enrollmentId)) return { success: false, error: 'Invalid enrollment ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify enrollment belongs to this user
    const { data: enrollment } = await supabase
      .from('course_enrollments' as never)
      .select('id, course_id')
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .maybeSingle() as unknown as { data: { id: string; course_id: string } | null };

    if (!enrollment) return { success: false, error: 'Enrollment not found' };

    // Fetch course quiz answers from content JSONB
    const { data: course } = await supabase
      .from('courses' as never)
      .select('content')
      .eq('id', enrollment.course_id)
      .maybeSingle() as unknown as { data: { content: { quizzes?: { id: string; correct_answer: string }[] } } | null };

    const quizzes = course?.content?.quizzes ?? [];
    let correct = 0;
    const total = quizzes.length;

    // Insert responses and score
    const responses = quizzes.map((q) => {
      const userAnswer = answers[q.id] ?? '';
      const isCorrect = sanitizeText(userAnswer).toLowerCase() === q.correct_answer.toLowerCase();
      if (isCorrect) correct++;
      return {
        enrollment_id: enrollmentId,
        question_id: q.id,
        answer: sanitizeText(userAnswer.slice(0, 2000)),
        is_correct: isCorrect,
      };
    });

    if (responses.length > 0) {
      await supabase
        .from('course_quiz_responses' as never)
        .insert(responses as never) as unknown as { error: unknown };
    }

    const score = total > 0 ? Math.round((correct / total) * 100) : 100;
    const passed = score >= 70;

    if (passed) {
      await supabase
        .from('course_enrollments' as never)
        .update({ progress: 100, completed_at: new Date().toISOString() } as never)
        .eq('id', enrollmentId)
        .eq('user_id', user.id);

      // Award points (idempotent via makeActionKey)
      try {
        const admin = createServiceClient();
        const actionKey = makeActionKey(user.id, 'QUIZ_PASSED', enrollmentId);
        await (admin as any).rpc('award_points', {
          p_user_id: user.id,
          p_activity: 'QUIZ_PASSED',
          p_points: POINT_VALUES.QUIZ_PASSED,
          p_related_id: enrollmentId,
          p_action_key: actionKey,
        });
      } catch (pointsErr) {
        console.error('Failed to award points for quiz pass:', pointsErr);
      }
    }

    revalidatePath('/education');
    return { success: true, score, passed };
  } catch {
    return { success: false, error: 'Failed to submit quiz' };
  }
}

export async function generateCertificate(enrollmentId: string): Promise<ActionResponse & { certificateUrl?: string }> {
  try {
    if (!isValidUUID(enrollmentId)) return { success: false, error: 'Invalid enrollment ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify enrollment is complete
    const { data: enrollment } = await supabase
      .from('course_enrollments' as never)
      .select('id, completed_at, course_id, courses:courses(title, certification_eligible)')
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .maybeSingle() as unknown as {
        data: {
          id: string;
          completed_at: string | null;
          course_id: string;
          courses: { title: string; certification_eligible: boolean } | null;
        } | null;
      };

    if (!enrollment) return { success: false, error: 'Enrollment not found' };
    if (!enrollment.completed_at) return { success: false, error: 'Course not completed' };
    if (!enrollment.courses?.certification_eligible) {
      return { success: false, error: 'Course is not certification eligible' };
    }

    // Generate a verification UUID and build the cert URL
    const certId = crypto.randomUUID();
    const certUrl = `/verify/cert/${certId}`;

    await supabase
      .from('course_enrollments' as never)
      .update({ certificate_url: certUrl } as never)
      .eq('id', enrollmentId) as unknown as { error: unknown };

    return { success: true, certificateUrl: certUrl };
  } catch {
    return { success: false, error: 'Failed to generate certificate' };
  }
}

// ─── Impact Stories ───────────────────────────────────────────────────────────

export async function submitStory(formData: FormData): Promise<ActionResponse & { storyId?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = SubmitStorySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid story data' };

    const { title, content, tags } = parsed.data;
    const parsedTags: string[] = tags ? JSON.parse(tags) : [];

    // Hero image — EXIF strip before upload
    let heroImageUrl: string | null = null;
    const heroImage = formData.get('hero_image') as File | null;
    if (heroImage && heroImage.size > 0) {
      const buffer = await heroImage.arrayBuffer();
      const stripped = await stripExifAndNormalize(Buffer.from(buffer));
      const filename = `stories/${user.id}/${Date.now()}.jpg`;
      await supabase.storage.from('story-images').upload(filename, stripped.buffer, { contentType: 'image/jpeg' });
      const { data: urlData } = supabase.storage.from('story-images').getPublicUrl(filename);
      heroImageUrl = urlData.publicUrl;
    }

    const { data: story } = await supabase
      .from('story_submissions' as never)
      .insert({
        author_id: user.id,
        title: sanitizeText(title),
        content: sanitizeText(content),
        hero_image_url: heroImageUrl,
        tags: parsedTags.map((t) => sanitizeText(t.slice(0, 50))),
        status: 'submitted',
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null };

    revalidatePath('/stories');
    return { success: true, storyId: story?.id };
  } catch {
    return { success: false, error: 'Failed to submit story' };
  }
}

export async function publishStory(storyId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(storyId)) return { success: false, error: 'Invalid story ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    await supabase
      .from('story_submissions' as never)
      .update({ status: 'published', published_at: new Date().toISOString() } as never)
      .eq('id', storyId) as unknown as { error: unknown };

    revalidatePath('/stories');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to publish story' };
  }
}

export async function rejectStory(storyId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(storyId)) return { success: false, error: 'Invalid story ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    await supabase
      .from('story_submissions' as never)
      .update({ status: 'rejected' } as never)
      .eq('id', storyId) as unknown as { error: unknown };

    revalidatePath('/stories');
    revalidatePath('/moderator');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to reject story' };
  }
}
