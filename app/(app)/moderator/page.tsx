// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ModeratorDashboardClient from '@/app/(app)/moderator/ModeratorDashboardClient';
import { getAuditLogs } from '@/lib/actions/admin';

export const metadata: Metadata = {
  title: 'Moderator Dashboard | MeowNet',
  description: 'Moderate stray cat reports, colony logs, and TNR event signups.',
};

export const dynamic = 'force-dynamic';

export default async function ModeratorPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user role and limits
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('id, role, sub_role, edits_count, max_edits')
    .eq('id', user.id)
    .single() as { data: { id: string; role: string | null; sub_role: string | null; edits_count: number; max_edits: number } | null };

  if (!profile || (profile.role !== 'moderator' && profile.role !== 'admin')) {
    redirect('/cats');
  }

  // Build profiles query
  let profilesQuery = supabase
    .from('profiles' as never)
    .select('id, display_name, role, empire_points, created_at, bio, preferred_role, location_neighborhood, contact_phone, is_enabled, password_expires_at')
    .order('created_at', { ascending: false });

  if (profile.role === 'moderator') {
    profilesQuery = profilesQuery.eq('role', 'user');
  }

  // Fetch initial moderation data
  const [catsRes, eventsRes, queriesRes, profilesRes, auditLogs] = await Promise.all([
    supabase
      .from('cats' as never)
      .select('id, name, status, breed_estimate, age_estimate, owner_id, created_at, photo_url, is_verified, health_flags, health_notes, sterilized, vaccinated, microchipped, contact_info, bcs_estimate, color, shelter_url, breed_confidence, location')
      .order('created_at', { ascending: false }),
    supabase
      .from('tnr_events' as never)
      .select('id, title, description, capacity, status, created_at, cats_tnrd_count, event_time, organizer_id, location')
      .order('created_at', { ascending: false }),
    supabase
      .from('moderator_queries' as never)
      .select('id, target_type, target_id, moderator_id, volunteer_id, message, status, response, created_at')
      .order('created_at', { ascending: false })
      .then(res => res, () => ({ data: [], error: null })),
    profilesQuery,
    getAuditLogs()
  ]);

  return (
    <ModeratorDashboardClient
      initialCats={(catsRes.data ?? []) as any[]}
      initialEvents={(eventsRes.data ?? []) as any[]}
      initialQueries={(queriesRes?.data ?? []) as any[]}
      initialProfiles={(profilesRes.data ?? []) as any[]}
      initialAuditLogs={auditLogs as any[]}
      currentUser={profile ? {
        id: profile.id,
        role: profile.role ?? 'user',
        sub_role: profile.sub_role ?? null,
        edits_count: profile.edits_count ?? 0,
        max_edits: profile.max_edits ?? 20
      } : null}
    />
  );
}
