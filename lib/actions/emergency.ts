'use server';
// lib/actions/emergency.ts — Server Actions for Emergency & Crisis Response
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { stripExifAndNormalize } from '@/lib/security/exif';
import { sanitizeText } from '@/lib/security/sanitize';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IncidentType = 'injury' | 'disaster' | 'abuse' | 'stray_emergency' | 'medical' | 'lost_cat';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
export type ContactType = 'emergency' | 'vet' | 'rescue';

export interface Incident {
  readonly id: string;
  readonly reporter_id: string;
  readonly incident_type: IncidentType;
  readonly severity: IncidentSeverity;
  readonly location: unknown | null;
  readonly description: string;
  readonly photo_urls: string[];
  readonly status: IncidentStatus;
  readonly assigned_to: string | null;
  readonly resolution_notes: string | null;
  readonly created_at: string;
  readonly resolved_at: string | null;
}

export interface EmergencyContact {
  readonly id: string;
  readonly user_id: string;
  readonly contact_type: ContactType;
  readonly name: string;
  readonly phone: string;
  readonly email: string | null;
  readonly relationship: string | null;
  readonly is_primary: boolean;
  readonly created_at: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ReportIncidentSchema = z.object({
  incident_type: z.enum(['injury', 'disaster', 'abuse', 'stray_emergency', 'medical', 'lost_cat']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  description: z.string().min(10).max(3000),
});

const EmergencyContactSchema = z.object({
  contact_type: z.enum(['emergency', 'vet', 'rescue']),
  name: z.string().min(1).max(200),
  phone: z.string().min(5).max(30),
  email: z.string().email().max(255).optional(),
  relationship: z.string().max(100).optional(),
  is_primary: z.coerce.boolean().default(false),
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

// ─── Incident Reporting ───────────────────────────────────────────────────────

export async function reportIncident(formData: FormData): Promise<ActionResponse & { incidentId?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = ReportIncidentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid incident data' };

    const { incident_type, severity, lat, lng, description } = parsed.data;

    // Build location point if provided (DB trigger will fuzz it)
    const locationStr = (lat !== undefined && lng !== undefined)
      ? `POINT(${lng} ${lat})`
      : null;

    // Handle photo uploads — EXIF strip every photo
    const photoUrls: string[] = [];
    const photos = formData.getAll('photos') as File[];
    for (const photo of photos.slice(0, 5)) {
      const buffer = await photo.arrayBuffer();
      const stripped = await stripExifAndNormalize(Buffer.from(buffer));
      const filename = `incidents/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      await supabase.storage.from('incident-photos').upload(filename, stripped.buffer, { contentType: 'image/jpeg' });
      const { data: urlData } = supabase.storage.from('incident-photos').getPublicUrl(filename);
      photoUrls.push(urlData.publicUrl);
    }

    const { data: incident } = await supabase
      .from('incidents' as never)
      .insert({
        reporter_id: user.id,
        incident_type,
        severity,
        location: locationStr,
        description: sanitizeText(description),
        photo_urls: photoUrls,
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null };

    revalidatePath('/emergency');
    revalidatePath('/moderator');
    return { success: true, incidentId: incident?.id };
  } catch {
    return { success: false, error: 'Failed to report incident' };
  }
}

export async function acknowledgeIncident(incidentId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(incidentId)) return { success: false, error: 'Invalid incident ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    await supabase
      .from('incidents' as never)
      .update({ status: 'acknowledged', assigned_to: user.id } as never)
      .eq('id', incidentId)
      .eq('status', 'open') as unknown as { error: unknown };

    revalidatePath('/emergency');
    revalidatePath('/moderator');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to acknowledge incident' };
  }
}

export async function resolveIncident(incidentId: string, resolutionNotes: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(incidentId)) return { success: false, error: 'Invalid incident ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    const sanitizedNotes = sanitizeText(resolutionNotes.slice(0, 2000));

    await supabase
      .from('incidents' as never)
      .update({
        status: 'resolved',
        resolution_notes: sanitizedNotes,
        resolved_at: new Date().toISOString(),
      } as never)
      .eq('id', incidentId) as unknown as { error: unknown };

    revalidatePath('/emergency');
    revalidatePath('/moderator');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to resolve incident' };
  }
}

export async function dispatchVolunteer(incidentId: string, volunteerId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(incidentId) || !isValidUUID(volunteerId)) {
      return { success: false, error: 'Invalid ID' };
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const role = await getCallerRole(supabase, user.id);
    if (role !== 'moderator' && role !== 'admin') return { success: false, error: 'Unauthorized' };

    await supabase
      .from('incidents' as never)
      .update({ assigned_to: volunteerId, status: 'in_progress' } as never)
      .eq('id', incidentId) as unknown as { error: unknown };

    revalidatePath('/emergency');
    revalidatePath('/moderator');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to dispatch volunteer' };
  }
}

// ─── Emergency Contacts ───────────────────────────────────────────────────────

export async function addEmergencyContact(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = EmergencyContactSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: 'Invalid contact data' };

    const { contact_type, name, phone, email, relationship, is_primary } = parsed.data;

    await supabase
      .from('emergency_contacts' as never)
      .insert({
        user_id: user.id,
        contact_type,
        name: sanitizeText(name),
        phone: sanitizeText(phone),
        email: email ?? null,
        relationship: relationship ? sanitizeText(relationship) : null,
        is_primary,
      } as never) as unknown as { error: unknown };

    revalidatePath('/profile');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add contact' };
  }
}

export async function deleteEmergencyContact(contactId: string): Promise<ActionResponse> {
  try {
    if (!isValidUUID(contactId)) return { success: false, error: 'Invalid contact ID' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await supabase
      .from('emergency_contacts' as never)
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id) as unknown as { error: unknown };

    revalidatePath('/profile');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete contact' };
  }
}
