'use server';
// lib/actions/profile.ts — Server Actions for profile updates

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeText } from '@/lib/security/sanitize';

export interface UpdateProfileResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

async function handleAvatarUpload(
  supabase: any,
  userId: string,
  avatarFile: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (avatarFile.size > 5 * 1024 * 1024) return { success: false, error: 'photo_too_large' };
  const rawBuffer = Buffer.from(await avatarFile.arrayBuffer());
  const { validateImageBuffer, stripExifAndNormalize } = await import('@/lib/security/exif');
  if (!validateImageBuffer(rawBuffer)) return { success: false, error: 'invalid_image_format' };
  
  const { buffer: cleanBuffer } = await stripExifAndNormalize(rawBuffer);

  const fileName = `avatars/${userId}-${Date.now()}.jpg`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('MeowNet')
    .upload(fileName, new Blob([new Uint8Array(cleanBuffer)], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: true });
  if (uploadError) return { success: false, error: 'upload_failed' };

  const { data: { publicUrl } } = supabase.storage.from('MeowNet').getPublicUrl(fileName);
  return { success: true, url: publicUrl };
}

function buildProfileUpdates(formData: FormData, avatarUrl: string | null): Record<string, string | null> {
  const textFields = ['displayName', 'bio', 'preferredRole', 'locationNeighborhood', 'contactPhone'] as const;
  const dbFieldNames: Record<string, string> = {
    displayName: 'display_name',
    bio: 'bio',
    preferredRole: 'preferred_role',
    locationNeighborhood: 'location_neighborhood',
    contactPhone: 'contact_phone'
  };
  const maxLengths: Record<string, number> = {
    displayName: 100,
    bio: 500,
    preferredRole: 100,
    locationNeighborhood: 100,
    contactPhone: 20
  };

  const updates: Record<string, string | null> = {};
  if (avatarUrl !== null) {
    updates.avatar_url = sanitizeText(avatarUrl.trim(), 1000);
  }

  for (const f of textFields) {
    const val = formData.get(f) as string | null;
    if (val !== null) {
      const trimmed = val.trim();
      const dbField = dbFieldNames[f];
      const maxLen = maxLengths[f];
      updates[dbField] = trimmed ? sanitizeText(trimmed, maxLen) : null;
    }
  }
  return updates;
}

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    let avatarUrl = formData.get('avatarUrl') as string | null;

    const avatarFile = formData.get('avatarFile') as File | null;
    if (avatarFile && avatarFile.size > 0) {
      const uploadRes = await handleAvatarUpload(supabase, user.id, avatarFile);
      if (!uploadRes.success) return { success: false, error: uploadRes.error };
      avatarUrl = uploadRes.url || null;
    }

    const updates = buildProfileUpdates(formData, avatarUrl);

    const { error } = await supabase
      .from('profiles' as never)
      .update(updates as never)
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/profile');
    revalidatePath('/empire');

    return { success: true, avatarUrl: updates.avatar_url ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    return { success: false, error: message };
  }
}
