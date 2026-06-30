// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  getAdminDashboardStats,
  getAllProfiles,
  getErasureAudits,
  getModeratorApplications,
  getAuditLogs,
  getSystemSettings,
  type SystemSetting,
} from '@/lib/actions/admin';
import AdminDashboardClient, {
  type Profile,
  type AuditLog,
  type ModeratorApplication,
  type StaffAuditLog,
} from '@/app/(app)/admin/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin Control Center | MeowNet',
  description: 'Manage users, view GDPR compliance logs, and monitor site-wide metrics.',
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string | null } | null };

  if (!profile || profile.role !== 'admin') {
    redirect('/cats');
  }

  // Fetch initial dashboard stats, profiles, compliance audits, applications, logs, settings, and moderator/gamification data
  const [
    stats,
    profiles,
    audits,
    applications,
    auditLogs,
    systemSettings,
    catsRes,
    eventsRes,
    queriesRes,
    triviaRes,
    bingoRes,
    guildsRes,
  ] = await Promise.all([
    getAdminDashboardStats(),
    getAllProfiles(),
    getErasureAudits(),
    getModeratorApplications(),
    getAuditLogs(),
    getSystemSettings(),
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
    supabase.from('trivia_questions' as never).select('*').order('created_at', { ascending: true }),
    supabase.from('bingo_task_templates' as never).select('*').order('created_at', { ascending: true }),
    supabase.from('guilds' as never).select('*').order('points', { ascending: false })
  ]);

  return (
    <AdminDashboardClient
      initialStats={stats}
      initialProfiles={profiles as unknown as Profile[]}
      initialAudits={audits as unknown as AuditLog[]}
      initialApplications={applications as unknown as ModeratorApplication[]}
      initialAuditLogs={auditLogs as unknown as StaffAuditLog[]}
      initialSystemSettings={systemSettings as unknown as SystemSetting[]}
      initialCats={(catsRes.data ?? []) as any[]}
      initialEvents={(eventsRes.data ?? []) as any[]}
      initialQueries={(queriesRes?.data ?? []) as any[]}
      initialTrivia={(triviaRes.data ?? []) as any[]}
      initialBingo={(bingoRes.data ?? []) as any[]}
      initialGuilds={(guildsRes.data ?? []) as any[]}
      currentUser={{
        id: user.id,
        role: 'admin',
        sub_role: null,
        edits_count: 0,
        max_edits: 999999
      }}
    />
  );
}
