'use server';
// lib/actions/events.ts — Server Actions for TNR event mutations

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import { makeActionKey, POINT_VALUES } from '@/lib/gamification/points';
import { z } from 'zod';

const EventCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  event_time: z.string().datetime(),
  capacity: z.coerce.number().min(1).max(500),
});

export async function createEvent(formData: FormData) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const parsed = EventCreateSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false, error: 'validation_failed', fieldErrors: parsed.error.flatten().fieldErrors };

    const d = parsed.data;
    const { data: event, error } = await supabase
      .from('tnr_events')
      .insert({
        organizer_id: user.id,
        title: sanitizeText(d.title, 200),
        description: d.description ? sanitizeText(d.description, 1000) : null,
        location: `POINT(${d.lng} ${d.lat})` as never,
        event_time: d.event_time,
        capacity: d.capacity,
      } as never)
      .select('id')
      .single();
    if (error || !event) return { success: false, error: 'insert_failed' };

    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'EVENT_CREATED', (event as { id: string }).id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('award_points', {
      p_user_id: user.id, p_activity: 'EVENT_CREATED',
      p_points: POINT_VALUES.EVENT_CREATED, p_related_id: (event as { id: string }).id, p_action_key: actionKey,
    });

    revalidatePath('/events');
    revalidatePath('/map');
    revalidatePath('/empire');
    return { success: true, eventId: (event as { id: string }).id };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function signUpForEvent(eventId: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase.from('event_signups').insert({ event_id: eventId, user_id: user.id } as never);
    if (error) {
      if (error.code === '23505') return { success: false, error: 'already_signed_up' };
      return { success: false, error: 'signup_failed' };
    }

    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'EVENT_SIGNUP', eventId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('award_points', {
      p_user_id: user.id, p_activity: 'EVENT_SIGNUP',
      p_points: POINT_VALUES.EVENT_SIGNUP, p_related_id: eventId, p_action_key: actionKey,
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/empire');
    return { success: true, pointsAwarded: POINT_VALUES.EVENT_SIGNUP };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function markEventAttended(eventId: string, attendeeId: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const admin = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = await (admin as any).rpc('can_manage_event', { p_event_id: eventId, p_user_id: user.id });
    if (!canManage.data) return { success: false, error: 'not_organizer' };

    await supabase.from('event_signups').update({ attended: true } as never).eq('event_id', eventId).eq('user_id', attendeeId);

    const actionKey = makeActionKey(attendeeId, 'EVENT_ATTENDED', eventId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('award_points', {
      p_user_id: attendeeId, p_activity: 'EVENT_ATTENDED',
      p_points: POINT_VALUES.EVENT_ATTENDED, p_related_id: eventId, p_action_key: actionKey,
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/empire');
    return { success: true, pointsAwarded: POINT_VALUES.EVENT_ATTENDED };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}
