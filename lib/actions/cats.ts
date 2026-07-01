'use server';
// lib/actions/cats.ts — Server Actions for cat mutations

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { stripExifAndNormalize, validateImageBuffer } from '@/lib/security/exif';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import { makeActionKey, POINT_VALUES } from '@/lib/gamification/points';
import { getSystemSetting } from '@/lib/supabase/settings';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const CatCreateSchema = z.object({
  name: z.string().max(100).optional(),
  status: z.enum(['stray', 'tnr_needed', 'adoptable', 'adopted', 'fostered']),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  location_privacy: z.enum(['exact', 'area']).default('area'),
  breed_estimate: z.string().max(100).optional(),
  age_estimate: z.enum(['kitten', 'juvenile', 'adult', 'senior']).optional(),
  color: z.string().max(100).optional(),
  health_notes: z.string().max(2000).optional(),
  health_flags: z.array(z.string()).default([]),
  sterilized: z.coerce.boolean().default(false),
  vaccinated: z.coerce.boolean().default(false),
  microchipped: z.coerce.boolean().default(false),
  contact_info: z.string().max(500).optional(),
  shelter_url: z.string().url().optional().or(z.literal('')),
  consent_recorded: z.coerce.boolean().default(false),
});

export type LogCatResult =
  | { success: true; catId: string; pointsAwarded: number }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function logCat(formData: FormData): Promise<LogCatResult> {
  try {
    // 1. Auth validation
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // 2. Parse + validate input
    const raw = Object.fromEntries(formData.entries());
    const parsed = CatCreateSchema.safeParse({
      ...raw,
      health_flags: formData.getAll('health_flags'),
    });
    if (!parsed.success) {
      return { success: false, error: 'validation_failed', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }
    const data = parsed.data;

    // 3. Process photo
    const photoFile = formData.get('photo') as File | null;
    if (!photoFile || photoFile.size === 0) return { success: false, error: 'photo_required' };
    if (photoFile.size > 5 * 1024 * 1024) return { success: false, error: 'photo_too_large' };

    const rawBuffer = Buffer.from(await photoFile.arrayBuffer());
    if (!validateImageBuffer(rawBuffer)) return { success: false, error: 'invalid_image_format' };

    const { buffer: cleanBuffer } = await stripExifAndNormalize(rawBuffer);

    // 4. Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('MeowNet')
      .upload(fileName, cleanBuffer, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) return { success: false, error: 'upload_failed' };

    const { data: { publicUrl } } = supabase.storage.from('MeowNet').getPublicUrl(uploadData.path);

    // 5. Insert cat record using PostGIS point
    const { data: cat, error: insertError } = await supabase
      .from('cats')
      .insert({
        owner_id: user.id,
        photo_url: publicUrl,
        status: data.status,
        location: `POINT(${data.lng} ${data.lat})` as never, // PostGIS WKT
        location_privacy: data.location_privacy,
        name: data.name ? sanitizeText(data.name, 100) : null,
        breed_estimate: data.breed_estimate ?? null,
        health_notes: data.health_notes ? sanitizeText(data.health_notes) : null,
        health_flags: data.health_flags,
        age_estimate: data.age_estimate ?? null,
        color: data.color ? sanitizeText(data.color, 100) : null,
        sterilized: data.sterilized,
        vaccinated: data.vaccinated,
        microchipped: data.microchipped,
        contact_info: data.contact_info ? sanitizeText(data.contact_info, 500) : null,
        shelter_url: data.shelter_url ? sanitizeUrl(data.shelter_url) : null,
        consent_recorded: data.consent_recorded,
      } as never)
      .select('id')
      .single();
    if (insertError || !cat) return { success: false, error: 'insert_failed' };

    // 6. Award points via service_role (RLS bypass required)
    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'CAT_LOGGED', (cat as { id: string }).id);
    const customPoints = await getSystemSetting<number>('CAT_LOG_POINTS_AWARDED', POINT_VALUES.CAT_LOGGED);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'CAT_LOGGED',
      p_points: customPoints,
      p_related_id: (cat as { id: string }).id,
      p_action_key: actionKey,
    });

    revalidatePath('/map');
    revalidatePath('/cats');
    revalidatePath('/empire');

    return { success: true, catId: (cat as { id: string }).id, pointsAwarded: customPoints };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function markCatAdopted(catId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase.from('cats').update({ status: 'adopted' } as never).eq('id', catId).eq('owner_id', user.id);
    if (error) return { success: false, error: 'update_failed' };

    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'CAT_MARKED_ADOPTED', catId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'CAT_MARKED_ADOPTED',
      p_points: POINT_VALUES.CAT_MARKED_ADOPTED,
      p_related_id: catId,
      p_action_key: actionKey,
    });

    revalidatePath(`/cats/${catId}`);
    revalidatePath('/empire');
    return { success: true };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function deleteCat(catId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Verify ownership
    const { data: existingCat } = await supabase.from('cats' as never).select('owner_id').eq('id', catId).single() as { data: { owner_id: string } | null };
    if (!existingCat || existingCat.owner_id !== user.id) {
      return { success: false, error: 'unauthorized' };
    }

    const { error } = await supabase.from('cats').delete().eq('id', catId);
    if (error) return { success: false, error: 'delete_failed' };

    revalidatePath('/map');
    revalidatePath('/cats');
    revalidatePath('/empire');

    return { success: true };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

async function handleCatPhotoUpload(
  supabase: SupabaseClient<Database>,
  userId: string,
  photoFile: File
): Promise<{ photoUrl?: string; error?: string }> {
  if (photoFile.size > 5 * 1024 * 1024) return { error: 'photo_too_large' };
  const rawBuffer = Buffer.from(await photoFile.arrayBuffer());
  if (!validateImageBuffer(rawBuffer)) return { error: 'invalid_image_format' };
  const { buffer: cleanBuffer } = await stripExifAndNormalize(rawBuffer);

  const fileName = `${userId}/${Date.now()}.jpg`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('MeowNet')
    .upload(fileName, cleanBuffer, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) return { error: 'upload_failed' };

  const { data: { publicUrl } } = supabase.storage.from('MeowNet').getPublicUrl(uploadData.path);
  return { photoUrl: publicUrl };
}

export async function updateCat(catId: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Verify ownership
    const { data: existingCat } = await supabase.from('cats' as never).select('owner_id, photo_url').eq('id', catId).single() as { data: { owner_id: string; photo_url: string } | null };
    if (!existingCat || existingCat.owner_id !== user.id) {
      return { success: false, error: 'unauthorized' };
    }

    // Parse input
    const raw = Object.fromEntries(formData.entries());
    const parsed = CatCreateSchema.omit({ consent_recorded: true }).safeParse({
      ...raw,
      health_flags: formData.getAll('health_flags'),
    });
    if (!parsed.success) {
      return { success: false, error: 'validation_failed' };
    }
    const data = parsed.data;

    let photoUrl = existingCat.photo_url;
    const photoFile = formData.get('photo') as File | null;
    if (photoFile && photoFile.size > 0) {
      const uploadRes = await handleCatPhotoUpload(supabase, user.id, photoFile);
      if (uploadRes.error) return { success: false, error: uploadRes.error };
      photoUrl = uploadRes.photoUrl!;
    }

    const { error: updateError } = await supabase
      .from('cats')
      .update({
        photo_url: photoUrl,
        status: data.status,
        location: `POINT(${data.lng} ${data.lat})` as never,
        location_privacy: data.location_privacy,
        name: data.name ? sanitizeText(data.name, 100) : null,
        breed_estimate: data.breed_estimate ?? null,
        health_notes: data.health_notes ? sanitizeText(data.health_notes) : null,
        health_flags: data.health_flags,
        age_estimate: data.age_estimate ?? null,
        color: data.color ? sanitizeText(data.color, 100) : null,
        sterilized: data.sterilized,
        vaccinated: data.vaccinated,
        microchipped: data.microchipped,
        contact_info: data.contact_info ? sanitizeText(data.contact_info, 500) : null,
        shelter_url: data.shelter_url ? sanitizeUrl(data.shelter_url) : null,
      } as never)
      .eq('id', catId);

    if (updateError) return { success: false, error: 'update_failed' };

    revalidatePath(`/cats/${catId}`);
    revalidatePath('/map');
    revalidatePath('/cats');
    revalidatePath('/empire');

    return { success: true };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function lendAPaw(catId: string, pledges: string[], isAnonymous: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Insert pledges
    const insertRows = pledges.map((pledge) => ({
      cat_id: catId,
      user_id: user.id,
      pledge: pledge,
      is_anonymous: isAnonymous
    }));

    const { error } = await supabase.from('cat_caregivers' as never).insert(insertRows as never);
    if (error) {
      console.error('lendAPaw insert error:', error.message);
      return { success: false, error: 'failed_to_save_pledge' };
    }

    // Award points
    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'LEND_A_PAW', catId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'LEND_A_PAW',
      p_points: POINT_VALUES.LEND_A_PAW,
      p_related_id: catId,
      p_action_key: actionKey,
    });

    revalidatePath(`/cats/${catId}`);
    revalidatePath('/empire');
    revalidatePath('/profile');

    return { success: true };
  } catch (err) {
    console.error('lendAPaw exception:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function withdrawPledges(catId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase
      .from('cat_caregivers' as never)
      .delete()
      .eq('cat_id', catId)
      .eq('user_id', user.id);

    if (error) {
      console.error('withdrawPledges delete error:', error.message);
      return { success: false, error: 'failed_to_remove_pledges' };
    }

    // Deduct points via forfeit_points RPC
    const admin = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('forfeit_points', {
      p_user_id: user.id,
      p_activity: 'LEND_A_PAW',
      p_points: POINT_VALUES.LEND_A_PAW,
      p_related_id: catId,
    });

    revalidatePath(`/cats/${catId}`);
    revalidatePath('/empire');
    revalidatePath('/profile');

    return { success: true };
  } catch (err) {
    console.error('withdrawPledges exception:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function createCommunityFund(
  name: string,
  category: string,
  targetPoints: number,
  description?: string,
  isAnonymous: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase.from('community_funds' as never).insert({
      creator_id: user.id,
      name,
      category,
      target_points: targetPoints,
      description,
      is_anonymous: isAnonymous
    } as never);

    if (error) {
      console.error('createCommunityFund error:', error.message);
      return { success: false, error: 'failed_to_create_fund' };
    }

    revalidatePath('/empire');
    return { success: true };
  } catch (err) {
    console.error('createCommunityFund exception:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function donateToFund(
  fundId: string,
  amountPoints: number,
  isAnonymous: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Check if donor has enough points in profiles
    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('empire_points')
      .eq('id', user.id)
      .maybeSingle() as unknown as { data: { empire_points: number } | null };

    if (!profile || profile.empire_points < amountPoints) {
      return { success: false, error: 'insufficient_points' };
    }

    // Insert donation
    const { error: donationError } = await supabase.from('fund_donations' as never).insert({
      fund_id: fundId,
      donor_id: user.id,
      amount_points: amountPoints,
      is_anonymous: isAnonymous
    } as never);

    if (donationError) {
      console.error('donateToFund insert error:', donationError.message);
      return { success: false, error: 'failed_to_donate' };
    }

    // Deduct points from donor's profile
    const { error: deductError } = await supabase.from('profiles' as never).update({
      empire_points: profile.empire_points - amountPoints
    } as never).eq('id', user.id);

    if (deductError) {
      console.error('donateToFund deduct error:', deductError.message);
      return { success: false, error: 'failed_to_deduct_points' };
    }

    revalidatePath('/empire');
    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    console.error('donateToFund exception:', err);
    return { success: false, error: 'internal_error' };
  }
}

