'use server';
// lib/actions/supplies.ts — Server Actions for Supply Management
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupplyCategory = 'food' | 'medical' | 'trapping' | 'shelter' | 'other';
export type SupplyRequestStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected';

export interface Supply {
  readonly id: string;
  readonly name: string;
  readonly category: SupplyCategory;
  readonly quantity: number;
  readonly unit: string;
  readonly expiration_date: string | null;
  readonly location: unknown | null;
  readonly donated_by: string | null;
  readonly notes: string | null;
  readonly created_at: string;
}

export interface SupplyRequest {
  readonly id: string;
  readonly requester_id: string;
  readonly supply_id: string;
  readonly quantity_requested: number;
  readonly purpose: string;
  readonly status: SupplyRequestStatus;
  readonly approved_by: string | null;
  readonly approved_at: string | null;
  readonly created_at: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AddSupplySchema = z.object({
  name: z.string().min(2).max(200),
  category: z.enum(['food', 'medical', 'trapping', 'shelter', 'other']),
  quantity: z.coerce.number().int().min(0),
  unit: z.string().min(1).max(50),
  expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
});

const SupplyRequestSchema = z.object({
  supply_id: z.string().uuid(),
  quantity_requested: z.coerce.number().int().min(1),
  purpose: z.string().min(5).max(1000),
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

// ─── Supply CRUD ──────────────────────────────────────────────────────────────

export async function addSupply(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = AddSupplySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid supply data' };

    const { name, category, quantity, unit, expiration_date, lat, lng, notes } = parsed.data;

    const locationStr = (lat !== undefined && lng !== undefined)
      ? `POINT(${lng} ${lat})`
      : null;

    await supabase
      .from('supplies' as never)
      .insert({
        name: sanitizeText(name),
        category,
        quantity,
        unit: sanitizeText(unit),
        expiration_date: expiration_date ?? null,
        location: locationStr,
        donated_by: user.id,
        notes: notes ? sanitizeText(notes) : null,
      } as never) as unknown as { error: unknown };

    revalidatePath('/supplies');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add supply' };
  }
}

export async function requestSupply(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = SupplyRequestSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid request data' };

    const { supply_id, quantity_requested, purpose } = parsed.data;

    // Verify supply exists and has enough quantity
    const { data: supply } = await supabase
      .from('supplies' as never)
      .select('quantity')
      .eq('id', supply_id)
      .maybeSingle() as unknown as { data: { quantity: number } | null };

    if (!supply) return { success: false, error: 'Supply not found' };
    if (supply.quantity < quantity_requested) {
      return { success: false, error: 'Insufficient quantity available' };
    }

    await supabase
      .from('supply_requests' as never)
      .insert({
        requester_id: user.id,
        supply_id,
        quantity_requested,
        purpose: sanitizeText(purpose),
      } as never) as unknown as { error: unknown };

    revalidatePath('/supplies');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to submit supply request' };
  }
}

export async function approveSupplyRequest(requestId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(requestId)) return { success: false, error: 'Invalid request ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    await supabase
      .from('supply_requests' as never)
      .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() } as never)
      .eq('id', requestId)
      .eq('status', 'pending') as unknown as { error: unknown };

    revalidatePath('/supplies');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to approve request' };
  }
}

export async function fulfillSupplyRequest(requestId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(requestId)) return { success: false, error: 'Invalid request ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    // Get the request details to decrement supply quantity
    const { data: req } = await supabase
      .from('supply_requests' as never)
      .select('supply_id, quantity_requested, status')
      .eq('id', requestId)
      .maybeSingle() as unknown as { data: { supply_id: string; quantity_requested: number; status: string } | null };

    if (!req || req.status !== 'approved') return { success: false, error: 'Request not approved' };

    // Decrement supply quantity
    await (supabase as any).rpc('decrement_supply_quantity', {
      p_supply_id: req.supply_id,
      p_quantity: req.quantity_requested,
    });

    await supabase
      .from('supply_requests' as never)
      .update({ status: 'fulfilled' } as never)
      .eq('id', requestId) as unknown as { error: unknown };

    revalidatePath('/supplies');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to fulfill request' };
  }
}
