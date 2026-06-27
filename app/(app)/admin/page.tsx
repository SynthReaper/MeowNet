// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  getAdminDashboardStats,
  getAllProfiles,
  getErasureAudits,
  getModeratorApplications,
  getAuditLogs,
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

  // Fetch initial dashboard stats, profiles, compliance audits, applications, and logs
  const [stats, profiles, audits, applications, auditLogs] = await Promise.all([
    getAdminDashboardStats(),
    getAllProfiles(),
    getErasureAudits(),
    getModeratorApplications(),
    getAuditLogs(),
  ]);

  return (
    <AdminDashboardClient
      initialStats={stats}
      initialProfiles={profiles as unknown as Profile[]}
      initialAudits={audits as unknown as AuditLog[]}
      initialApplications={applications as unknown as ModeratorApplication[]}
      initialAuditLogs={auditLogs as unknown as StaffAuditLog[]}
    />
  );
}
