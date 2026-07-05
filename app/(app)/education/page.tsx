// app/(app)/education/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EducationHubClient from '@/components/education/EducationHubClient';

export const metadata: Metadata = {
  title: 'Academy & Education | MeowNet',
  description: 'Study trap-neuter-return workflows and earn volunteer training badges.',
};

export const dynamic = 'force-dynamic';

export default async function EducationPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query educational courses
  const { data: courses } = await supabase
    .from('courses' as never)
    .select('*')
    .order('title') as unknown as { data: any[] | null };

  // Query my progress
  const { data: enrollments } = await supabase
    .from('course_enrollments' as never)
    .select('*')
    .eq('user_id', user.id) as unknown as { data: any[] | null };

  return (
    <EducationHubClient
      courses={(courses ?? []) as any[]}
      initialEnrollments={(enrollments ?? []) as any[]}
    />
  );
}
