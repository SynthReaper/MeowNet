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
  name: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['stray', 'tnr_needed', 'adoptable', 'adopted', 'fostered']),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  location_privacy: z.enum(['exact', 'area']).default('area'),
  breed_estimate: z.string().max(100).optional().or(z.literal('')),
  breed_confidence: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).max(1).nullable().optional()),
  age_estimate: z.enum(['kitten', 'juvenile', 'adult', 'senior']).optional().or(z.literal('')),
  color: z.string().max(100).optional().or(z.literal('')),
  health_notes: z.string().max(2000).optional().or(z.literal('')),
  health_flags: z.array(z.string()).default([]),
  sterilized: z.coerce.boolean().default(false),
  vaccinated: z.coerce.boolean().default(false),
  microchipped: z.coerce.boolean().default(false),
  contact_info: z.string().max(500).optional().or(z.literal('')),
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
    const fileName = `${user.id.replace(/[\\/.]/g, '_')}/${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('MeowNet')
      .upload(fileName, new Blob([new Uint8Array(cleanBuffer)], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: false });
    if (uploadError) return { success: false, error: 'upload_failed' };

    const { data: { publicUrl } } = supabase.storage.from('MeowNet').getPublicUrl(fileName);

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
        breed_estimate: data.breed_estimate ? sanitizeText(data.breed_estimate, 100) : null,
        breed_confidence: typeof data.breed_confidence === 'number' ? data.breed_confidence : null,
        health_notes: data.health_notes ? sanitizeText(data.health_notes) : null,
        health_flags: data.health_flags,
        age_estimate: data.age_estimate || null,
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
    let customPoints: number = POINT_VALUES.CAT_LOGGED;
    try {
      const admin = createServiceClient();
      const actionKey = makeActionKey(user.id, 'CAT_LOGGED', (cat as { id: string }).id);
      customPoints = await getSystemSetting<number>('CAT_LOG_POINTS_AWARDED', POINT_VALUES.CAT_LOGGED);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).rpc('award_points', {
        p_user_id: user.id,
        p_activity: 'CAT_LOGGED',
        p_points: customPoints,
        p_related_id: (cat as { id: string }).id,
        p_action_key: actionKey,
      });
    } catch (pointsErr) {
      console.error('Failed to award points for logging cat:', pointsErr);
    }

    revalidatePath(`/cats/${(cat as { id: string }).id}`);
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

    try {
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
    } catch (pointsErr) {
      console.error('Failed to award points for marking cat adopted:', pointsErr);
    }

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

    // Verify ownership or staff permissions
    const { data: existingCat } = await supabase.from('cats' as never).select('owner_id').eq('id', catId).single() as { data: { owner_id: string } | null };
    if (!existingCat) return { success: false, error: 'not_found' };

    let isAuthorized = existingCat.owner_id === user.id;
    if (!isAuthorized) {
      const { data: profile } = await supabase
        .from('profiles' as never)
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string | null } | null };
      if (profile?.role === 'admin' || profile?.role === 'moderator') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
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

  const fileName = `${userId.replace(/[\\/.]/g, '_')}/${Date.now()}.jpg`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('MeowNet')
    .upload(fileName, new Blob([new Uint8Array(cleanBuffer)], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: false });
  if (uploadError) return { error: 'upload_failed' };

  const { data: { publicUrl } } = supabase.storage.from('MeowNet').getPublicUrl(fileName);
  return { photoUrl: publicUrl };
}

export async function updateCat(catId: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    // Verify ownership or staff permissions
    const { data: existingCat } = await supabase.from('cats' as never).select('owner_id, photo_url').eq('id', catId).single() as { data: { owner_id: string; photo_url: string } | null };
    if (!existingCat) return { success: false, error: 'not_found' };

    let isAuthorized = existingCat.owner_id === user.id;
    if (!isAuthorized) {
      const { data: profile } = await supabase
        .from('profiles' as never)
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string | null } | null };
      if (profile?.role === 'admin' || profile?.role === 'moderator') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
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
        breed_estimate: data.breed_estimate ? sanitizeText(data.breed_estimate, 100) : null,
        breed_confidence: typeof data.breed_confidence === 'number' ? data.breed_confidence : null,
        health_notes: data.health_notes ? sanitizeText(data.health_notes) : null,
        health_flags: data.health_flags,
        age_estimate: data.age_estimate || null,
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

    try {
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
    } catch (pointsErr) {
      console.error('Failed to award points for lending a paw:', pointsErr);
    }

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

    // Execute atomic donation RPC in DB
    const { error: rpcError } = await (supabase as any).rpc('donate_to_fund', {
      p_fund_id: fundId,
      p_amount_points: amountPoints,
      p_is_anonymous: isAnonymous,
      p_donor_id: user.id
    });

    if (rpcError) {
      console.error('donateToFund RPC error:', rpcError.message);
      if (rpcError.message.includes('Insufficient points')) {
        return { success: false, error: 'insufficient_points' };
      }
      return { success: false, error: 'failed_to_donate' };
    }

    revalidatePath('/empire');
    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    console.error('donateToFund exception:', err);
    return { success: false, error: 'internal_error' };
  }
}

export async function getLocalMappers(lat: number, lng: number): Promise<string[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const serviceClient = createServiceClient();
    const { data: catsData, error } = await serviceClient
      .from('cats' as never)
      .select('owner_id, location')
      .limit(1000);

    if (error || !catsData) return [];

    // Helper to calculate distance
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const localOwners = new Set<string>();
    catsData.forEach((row: any) => {
      let catLat = 0;
      let catLng = 0;
      const loc = row.location;

      if (loc && typeof loc === 'object') {
        const geojson = loc as { type?: string; coordinates?: number[] };
        if (geojson.type === 'Point' && Array.isArray(geojson.coordinates) && geojson.coordinates.length >= 2) {
          catLng = geojson.coordinates[0];
          catLat = geojson.coordinates[1];
        }
      } else if (typeof loc === 'string') {
        const match = /POINT\(([^ ]+) ([^ )]+)\)/.exec(loc);
        if (match) {
          catLng = parseFloat(match[1]);
          catLat = parseFloat(match[2]);
        }
      }

      if (catLat !== 0 && catLng !== 0) {
        const dist = getDistance(lat, lng, catLat, catLng);
        if (dist <= 100) {
          localOwners.add(row.owner_id);
        }
      }
    });

    return Array.from(localOwners);
  } catch (err) {
    console.error('getLocalMappers error:', err);
    return [];
  }
}

