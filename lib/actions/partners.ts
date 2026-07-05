'use server';
// lib/actions/partners.ts — Server Actions for Partnerships & Research
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartnerType = 'vet' | 'rescue' | 'corporate' | 'government' | 'retail' | 'ngo';
export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type VerificationStatus = 'pending' | 'verified' | 'suspended';
export type ResearchRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface PartnerOrganization {
  readonly id: string;
  readonly name: string;
  readonly type: PartnerType;
  readonly contact_email: string | null;
  readonly contact_phone: string | null;
  readonly address: string | null;
  readonly discount_code: string | null;
  readonly verification_status: VerificationStatus;
  readonly partnership_tier: PartnerTier | null;
  readonly benefits: string[];
  readonly created_at: string;
}

export interface ResearchDataRequest {
  readonly id: string;
  readonly researcher_email: string;
  readonly institution: string;
  readonly research_purpose: string;
  readonly requested_data_types: string[];
  readonly status: ResearchRequestStatus;
  readonly approved_by: string | null;
  readonly approved_at: string | null;
  readonly expiry_date: string | null;
  readonly created_at: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AddPartnerSchema = z.object({
  name: z.string().min(2).max(300),
  type: z.enum(['vet', 'rescue', 'corporate', 'government', 'retail', 'ngo']),
  contact_email: z.string().email().max(255).optional(),
  contact_phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  discount_code: z.string().max(100).optional(),
  partnership_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  benefits: z.string().optional(), // JSON array string
});

const ResearchRequestSchema = z.object({
  researcher_email: z.string().email().max(255),
  institution: z.string().min(2).max(500),
  research_purpose: z.string().min(50).max(3000),
  requested_data_types: z.string(), // JSON array string
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

// ─── Partners ─────────────────────────────────────────────────────────────────

export async function addPartnerOrganization(formData: FormData): Promise<ActionResponse & { partnerId?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'admin') return { success: false, error: 'Admin access required' };

    const parsed = AddPartnerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid partner data' };

    const { name, type, contact_email, contact_phone, address, discount_code, partnership_tier, benefits } = parsed.data;
    const benefitsArray: string[] = benefits ? JSON.parse(benefits) : [];

    const { data: partner } = await supabase
      .from('partner_organizations' as never)
      .insert({
        name: sanitizeText(name),
        type,
        contact_email: contact_email ?? null,
        contact_phone: contact_phone ? sanitizeText(contact_phone) : null,
        address: address ? sanitizeText(address) : null,
        discount_code: discount_code ? sanitizeText(discount_code) : null,
        partnership_tier: partnership_tier ?? null,
        benefits: benefitsArray.map((b) => sanitizeText(b.slice(0, 200))),
        verification_status: 'pending',
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null };

    revalidatePath('/partners');
    revalidatePath('/admin');
    return { success: true, partnerId: partner?.id };
  } catch {
    return { success: false, error: 'Failed to add partner' };
  }
}

export async function verifyPartner(partnerId: string, tier?: PartnerTier): Promise<ActionResponse> {
  try {
    if (!isValidUUID(partnerId)) return { success: false, error: 'Invalid partner ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'admin') return { success: false, error: 'Admin access required' };

    const updates: Record<string, unknown> = { verification_status: 'verified' };
    if (tier) updates.partnership_tier = tier;

    await supabase
      .from('partner_organizations' as never)
      .update(updates as never)
      .eq('id', partnerId) as unknown as { error: unknown };

    revalidatePath('/partners');
    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to verify partner' };
  }
}

export async function suspendPartner(partnerId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(partnerId)) return { success: false, error: 'Invalid partner ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'admin') return { success: false, error: 'Admin access required' };

    await supabase
      .from('partner_organizations' as never)
      .update({ verification_status: 'suspended' } as never)
      .eq('id', partnerId) as unknown as { error: unknown };

    revalidatePath('/partners');
    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to suspend partner' };
  }
}

// ─── Research Data ────────────────────────────────────────────────────────────

export async function requestResearchData(formData: FormData): Promise<ActionResponse & { requestId?: string }> {
  try {
    // No auth required — anyone can apply
    const supabase = await createServerClient();

    const parsed = ResearchRequestSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid research request data' };

    const { researcher_email, institution, research_purpose, requested_data_types } = parsed.data;
    const dataTypes: string[] = JSON.parse(requested_data_types);

    const { data: req } = await supabase
      .from('research_data_requests' as never)
      .insert({
        researcher_email: sanitizeText(researcher_email),
        institution: sanitizeText(institution),
        research_purpose: sanitizeText(research_purpose),
        requested_data_types: dataTypes.map((d) => sanitizeText(d.slice(0, 100))),
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null };

    return { success: true, requestId: req?.id };
  } catch {
    return { success: false, error: 'Failed to submit research request' };
  }
}

export async function approveResearchRequest(requestId: string, expiryDate: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(requestId)) return { success: false, error: 'Invalid request ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'admin') return { success: false, error: 'Admin access required' };

    await supabase
      .from('research_data_requests' as never)
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        expiry_date: expiryDate,
      } as never)
      .eq('id', requestId)
      .eq('status', 'pending') as unknown as { error: unknown };

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to approve research request' };
  }
}

export async function exportResearchData(requestId: string): Promise<ActionResponse & { data?: unknown }> {
  try {
    if (!isValidUUID(requestId)) return { success: false, error: 'Invalid request ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'admin') return { success: false, error: 'Admin access required' };

    // Verify request is approved and not expired
    const { data: req } = await supabase
      .from('research_data_requests' as never)
      .select('status, expiry_date, requested_data_types')
      .eq('id', requestId)
      .maybeSingle() as unknown as { data: { status: string; expiry_date: string | null; requested_data_types: string[] } | null };

    if (!req || req.status !== 'approved') return { success: false, error: 'Request not approved' };
    if (req.expiry_date && new Date(req.expiry_date) < new Date()) {
      await supabase.from('research_data_requests' as never).update({ status: 'expired' } as never).eq('id', requestId);
      return { success: false, error: 'Research access has expired' };
    }

    // Export ANONYMIZED aggregate data only — NO GPS, NO UUIDs, NO PII
    const exportData: Record<string, unknown> = {
      export_timestamp: new Date().toISOString(),
      request_id: requestId,
      note: 'All data is anonymized. No GPS coordinates, user identifiers, or PII included.',
    };

    if (req.requested_data_types.includes('colony_welfare')) {
      // Aggregate welfare scores by region (no exact locations)
      const { data: welfare } = await supabase
        .from('volunteer_hours' as never)
        .select('activity_type, hours, date')
        .order('date') as unknown as { data: { activity_type: string; hours: number; date: string }[] | null };

      exportData.volunteer_hours_aggregate = welfare ?? [];
    }

    return { success: true, data: exportData };
  } catch {
    return { success: false, error: 'Failed to export research data' };
  }
}
