// app/(app)/volunteers/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import VolunteerHubClient from './VolunteerHubClient';

export const metadata: Metadata = {
  title: 'Volunteer Hub',
  description: 'Manage your volunteer availability, credentials, field operations, and logged hours.',
};

export const dynamic = 'force-dynamic';

export default async function VolunteersPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query user profile role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  const role = profile?.role ?? 'user';

  // Query availability
  const { data: availability } = await supabase
    .from('volunteer_availability' as never)
    .select('*')
    .eq('user_id', user.id) as unknown as { data: unknown[] | null };

  // Query skills
  const { data: skills } = await supabase
    .from('volunteer_skills' as never)
    .select('*')
    .eq('user_id', user.id) as unknown as { data: unknown[] | null };

  // Query hours
  const { data: hours } = await supabase
    .from('volunteer_hours' as never)
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false }) as unknown as { data: unknown[] | null };

  // Query tasks
  const { data: tasks } = await supabase
    .from('tasks' as never)
    .select('*, profiles:profiles!tasks_created_by_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(50) as unknown as { data: unknown[] | null };

  return (
    <VolunteerHubClient
      currentUserId={user.id}
      userRole={role}
      initialAvailability={availability ?? []}
      initialSkills={skills ?? []}
      initialHours={hours ?? []}
      initialTasks={tasks ?? []}
    />
  );
}
// Version: v0.9.0
