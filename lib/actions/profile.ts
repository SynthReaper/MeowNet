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

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const displayName = formData.get('displayName') as string | null;
    let avatarUrl = formData.get('avatarUrl') as string | null;

    const avatarFile = formData.get('avatarFile') as File | null;
    if (avatarFile && avatarFile.size > 0) {
      if (avatarFile.size > 5 * 1024 * 1024) return { success: false, error: 'photo_too_large' };
      const rawBuffer = Buffer.from(await avatarFile.arrayBuffer());
      const { validateImageBuffer, stripExifAndNormalize } = await import('@/lib/security/exif');
      if (!validateImageBuffer(rawBuffer)) return { success: false, error: 'invalid_image_format' };
      
      const { buffer: cleanBuffer } = await stripExifAndNormalize(rawBuffer);

      const fileName = `avatars/${user.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('MeowNet')
        .upload(fileName, cleanBuffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) return { success: false, error: 'upload_failed' };

      const { data: { publicUrl } } = supabase.storage.from('MeowNet').getPublicUrl(uploadData.path);
      avatarUrl = publicUrl;
    }

    const bio = formData.get('bio') as string | null;
    const preferredRole = formData.get('preferredRole') as string | null;
    const locationNeighborhood = formData.get('locationNeighborhood') as string | null;
    const contactPhone = formData.get('contactPhone') as string | null;

    const updates: Record<string, string | null> = {};
    if (displayName !== null) {
      updates.display_name = sanitizeText(displayName.trim(), 100);
    }
    if (avatarUrl !== null) {
      updates.avatar_url = sanitizeText(avatarUrl.trim(), 1000);
    }
    if (bio !== null) {
      updates.bio = bio.trim() ? sanitizeText(bio.trim(), 500) : null;
    }
    if (preferredRole !== null) {
      updates.preferred_role = preferredRole.trim() ? sanitizeText(preferredRole.trim(), 100) : null;
    }
    if (locationNeighborhood !== null) {
      updates.location_neighborhood = locationNeighborhood.trim() ? sanitizeText(locationNeighborhood.trim(), 100) : null;
    }
    if (contactPhone !== null) {
      updates.contact_phone = contactPhone.trim() ? sanitizeText(contactPhone.trim(), 20) : null;
    }

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
