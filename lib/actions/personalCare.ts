'use server';
// lib/actions/personalCare.ts — Server Actions for client-side encrypted Personal Care and AI keys

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64_REGEX = /^[a-zA-Z0-9+/=]+$/;

// Size limits: config 50KB, cat data 2MB (to allow for a compressed base64 photo)
const CONFIG_LIMIT = 50 * 1024;
const CAT_DATA_LIMIT = 2 * 1024 * 1024;

interface PersonalActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function savePrivateConfig(encryptedKeys: string): Promise<PersonalActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    if (!encryptedKeys || encryptedKeys.length > CONFIG_LIMIT || !BASE64_REGEX.test(encryptedKeys)) {
      return { success: false, error: 'invalid_data' };
    }

    const { error } = await supabase
      .from('user_private_config' as never)
      .upsert({
        user_id: user.id,
        encrypted_keys: encryptedKeys,
        updated_at: new Date().toISOString(),
      } as never);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'internal_error' };
  }
}

export async function getPrivateConfig(): Promise<PersonalActionResponse<{ encrypted_keys: string } | null>> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const { data, error } = await supabase
      .from('user_private_config' as never)
      .select('encrypted_keys')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as { encrypted_keys: string } | null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'internal_error' };
  }
}

export async function listPrivateCats(): Promise<PersonalActionResponse<Array<{ id: string; encrypted_data: string; updated_at: string }>>> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    const { data, error } = await supabase
      .from('personal_cats' as never)
      .select('id, encrypted_data, updated_at')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = (data ?? []) as Array<{ id: string; encrypted_data: string; updated_at: string }>;
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'internal_error' };
  }
}

export async function upsertPrivateCat(
  catId: string | undefined,
  encryptedData: string
): Promise<PersonalActionResponse<{ id: string }>> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    if (catId && !UUID_REGEX.test(catId)) {
      return { success: false, error: 'invalid_id' };
    }

    if (!encryptedData || encryptedData.length > CAT_DATA_LIMIT || !BASE64_REGEX.test(encryptedData)) {
      return { success: false, error: 'invalid_data' };
    }

    const row = {
      owner_id: user.id,
      encrypted_data: encryptedData,
      updated_at: new Date().toISOString(),
    } as { owner_id: string; encrypted_data: string; updated_at: string; id?: string };

    if (catId) {
      row.id = catId;
    }

    const { data, error } = await supabase
      .from('personal_cats' as never)
      .upsert(row as never)
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const castedData = data as { id: string } | null;
    if (!castedData) {
      return { success: false, error: 'save_failed' };
    }

    revalidatePath('/profile/care-center');
    return { success: true, data: { id: castedData.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'internal_error' };
  }
}

export async function deletePrivateCat(catId: string): Promise<PersonalActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'unauthorized' };

    if (!catId || !UUID_REGEX.test(catId)) {
      return { success: false, error: 'invalid_id' };
    }

    const { error } = await supabase
      .from('personal_cats' as never)
      .delete()
      .eq('id', catId)
      .eq('owner_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/profile/care-center');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'internal_error' };
  }
}
