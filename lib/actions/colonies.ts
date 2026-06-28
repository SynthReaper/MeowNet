'use server';
// lib/actions/colonies.ts — Server Actions for Colony Management

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import { z } from 'zod';

const ColonyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  population_estimate: z.coerce.number().min(0).default(0),
});

export async function createColony(formData: FormData) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'unauthorized' };

    const raw = Object.fromEntries(formData.entries());
    const parsed = ColonyCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: 'validation_failed' };
    }
    const data = parsed.data;

    const { data: colony, error } = await supabase
      .from('colonies' as never)
      .insert({
        name: sanitizeText(data.name, 100),
        description: data.description ? sanitizeText(data.description) : null,
        location: `POINT(${data.lng} ${data.lat})` as never,
        population_estimate: data.population_estimate,
        tnr_count: 0,
        created_by: user.id,
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null; error: { message: string } | null };

    if (error || !colony) {
      return { success: false, error: error?.message || 'failed_to_create' };
    }

    revalidatePath('/colonies');
    revalidatePath('/map');
    return { success: true, colonyId: colony.id };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function joinColonyAsCaretaker(colonyId: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase
      .from('colonies' as never)
      .update({ caretaker_id: user.id } as never)
      .eq('id', colonyId) as unknown as { error: { message: string } | null };

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/colonies/${colonyId}`);
    revalidatePath('/colonies');
    return { success: true };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function updateColonyStats(
  colonyId: string,
  populationEstimate: number,
  tnrCount: number
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase
      .from('colonies' as never)
      .update({
        population_estimate: populationEstimate,
        tnr_count: tnrCount,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', colonyId) as unknown as { error: { message: string } | null };

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/colonies/${colonyId}`);
    revalidatePath('/colonies');
    return { success: true };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function addWinterShelter(
  colonyId: string,
  material: string,
  capacityCats: number,
  insulationR: number
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase
      .from('winter_shelters' as never)
      .insert({
        colony_id: colonyId,
        material: sanitizeText(material, 100),
        capacity_cats: capacityCats,
        insulation_r: insulationR,
        last_inspected: new Date().toISOString()
      } as never) as unknown as { error: { message: string } | null };

    if (error) return { success: false, error: error.message };

    revalidatePath(`/colonies/${colonyId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}

export async function inspectWinterShelter(shelterId: string, colonyId: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'unauthorized' };

    const { error } = await supabase
      .from('winter_shelters' as never)
      .update({ last_inspected: new Date().toISOString() } as never)
      .eq('id', shelterId) as unknown as { error: { message: string } | null };

    if (error) return { success: false, error: error.message };

    revalidatePath(`/colonies/${colonyId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'internal_error' };
  }
}
