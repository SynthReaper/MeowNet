'use server';

// lib/actions/neuter.ts — Cryptographic Proof of Neuter Server Actions
import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// Generate secure signature
function generateCryptoSignature(userId: string, catId: string, clinic: string, date: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'meownet-salt-2026';
  const data = `${userId}:${catId}:${clinic}:${date}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export async function requestNeuterVerification(catId: string, clinicName: string, dateStr: string) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  if (!clinicName || clinicName.trim().length < 3) {
    return { success: false, error: 'Clinic name must be at least 3 characters.' };
  }

  try {
    // Check if proof already exists
    const { data: existing } = await supabase
      .from('proof_of_neuter' as never)
      .select('id, status')
      .eq('cat_id', catId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Verification request is already ${(existing as any).status}.` };
    }

    const signature = generateCryptoSignature(user.id, catId, clinicName.trim(), dateStr);

    const { data, error } = await supabase
      .from('proof_of_neuter' as never)
      .insert({
        cat_id: catId,
        user_id: user.id,
        clinic_name: clinicName.trim(),
        neuter_date: dateStr,
        signature: signature,
        status: 'pending'
      } as never)
      .select()
      .single();

    if (error) throw error;

    // Log to system audit trail
    await (supabase as any).rpc('log_system_activity', {
      p_action: 'NEUTER_VERIFICATION_REQUEST',
      p_target_id: catId,
      p_details: `Requested spay/neuter verification for clinic "${clinicName.trim()}" on surgery date: ${dateStr}`
    });

    revalidatePath(`/cats/${catId}`);
    return { success: true, proof: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function verifyNeuterRequest(proofId: string, approve: boolean) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  // Verify staff role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (profile as any)?.role;
  if (userRole !== 'admin' && userRole !== 'moderator') {
    return { success: false, error: 'forbidden' };
  }

  try {
    const { data: proof, error: fetchError } = await supabase
      .from('proof_of_neuter' as never)
      .select('*')
      .eq('id', proofId)
      .single();

    if (fetchError || !proof) return { success: false, error: 'Request not found' };

    const status = approve ? 'verified' : 'rejected';
    const { error: updateError } = await supabase
      .from('proof_of_neuter' as never)
      .update({
        status,
        verified_by: user.id
      } as never)
      .eq('id', proofId);

    if (updateError) throw updateError;

    // If verified, reward volunteer with a "TNR Champion" badge or Empire Points (+50 XP)
    if (approve) {
      const admin = createServiceClient();
      const actionKey = `neuter-verify:${(proof as any).cat_id}:${Date.now()}`;
      await (admin as any).rpc('award_points', {
        p_user_id: (proof as any).user_id,
        p_activity: 'NEUTER_PROOF',
        p_points: 50,
        p_related_id: (proof as any).cat_id,
        p_action_key: actionKey
      });

      // Update cat status in DB to adoption-ready/sterilized
      await supabase
        .from('cats' as never)
        .update({ status: 'adoptable' } as never)
        .eq('id', (proof as any).cat_id);
    }

    // Log to system audit trail
    await (supabase as any).rpc('log_system_activity', {
      p_action: approve ? 'NEUTER_VERIFICATION_APPROVED' : 'NEUTER_VERIFICATION_REJECTED',
      p_target_id: (proof as any).cat_id,
      p_details: `Reviewed clinic verification request: ${approve ? 'APPROVED' : 'REJECTED'} (Clinic: "${(proof as any).clinic_name}", Rescuer ID: ${(proof as any).user_id})`
    });

    revalidatePath(`/cats/${(proof as any).cat_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getNeuterProof(catId: string) {
  const supabase = await createServerClient();
  try {
    const { data, error } = await supabase
      .from('proof_of_neuter' as never)
      .select('id, clinic_name, neuter_date, signature, status, user_id, verified_by, profiles:user_id(display_name), verifier:verified_by(display_name)')
      .eq('cat_id', catId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: true, proof: null };

    return {
      success: true,
      proof: {
        id: (data as any).id,
        clinic_name: (data as any).clinic_name,
        neuter_date: (data as any).neuter_date,
        signature: (data as any).signature,
        status: (data as any).status,
        user_id: (data as any).user_id,
        volunteer_name: (data as any).profiles?.display_name || 'Anonymous Rescuer',
        verifier_name: (data as any).verifier?.display_name || 'Staff'
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message, proof: null };
  }
}

export async function getPendingNeuterRequests() {
  const supabase = await createServerClient();
  try {
    const { data, error } = await supabase
      .from('proof_of_neuter' as never)
      .select('id, clinic_name, neuter_date, status, cat_id, cats:cat_id(name), profiles:user_id(display_name)')
      .eq('status', 'pending');

    if (error) throw error;
    return { success: true, requests: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, requests: [] };
  }
}
