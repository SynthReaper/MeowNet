// app/(app)/emergency/page.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EmergencyHubClient from './EmergencyHubClient';

export const metadata: Metadata = {
  title: 'Emergency Crisis Center',
  description: 'Report and coordinate responses to critical cat welfare incidents and regional disasters.',
};

export const dynamic = 'force-dynamic';

export default async function EmergencyPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Query profile role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { role: string | null } | null };

  const role = profile?.role ?? 'user';

  // Query incidents
  const { data: incidents } = await supabase
    .from('incidents' as never)
    .select('*, profiles:profiles!incidents_reporter_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(40) as unknown as { data: any[] | null };

  // Parse location points for client Leaflet maps
  const parsedIncidents = (incidents ?? []).map((inc) => {
    // Check if location is of form POINT(lng lat)
    const matches = typeof inc.location === 'string'
      ? inc.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/)
      : null;
    return {
      ...inc,
      lat: matches ? Number(matches[2]) : 20,
      lng: matches ? Number(matches[1]) : 0,
    };
  });

  // Query emergency contacts
  const { data: contacts } = await supabase
    .from('emergency_contacts' as never)
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false }) as unknown as { data: any[] | null };

  // Query nearby volunteers for dispatch (moderators/admins only)
  let volunteers: any[] = [];
  if (role === 'moderator' || role === 'admin') {
    const { data: vols } = await supabase
      .from('profiles' as never)
      .select('id, display_name, role')
      .in('role', ['moderator', 'admin', 'user'])
      .limit(20) as unknown as { data: any[] | null };
    volunteers = vols ?? [];
  }

  return (
    <EmergencyHubClient
      currentUserId={user.id}
      userRole={role}
      initialIncidents={parsedIncidents}
      initialContacts={contacts ?? []}
      volunteers={volunteers}
    />
  );
}
