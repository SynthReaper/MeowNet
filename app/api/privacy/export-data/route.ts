// app/api/privacy/export-data/route.ts — GDPR Article 20 Data Portability Export
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // Query all user-centric tables
    const [profileRes, pointsRes, catsRes, pledgesRes, queriesRes] = await Promise.all([
      supabase.from('profiles' as never).select('*').eq('id', user.id).maybeSingle(),
      supabase.from('point_log' as never).select('*').eq('user_id', user.id),
      supabase.from('cats' as never).select('*').eq('owner_id', user.id),
      supabase.from('cat_caregivers' as never).select('*').eq('user_id', user.id),
      supabase.from('moderator_queries' as never).select('*').eq('volunteer_id', user.id),
    ]);

    const exportPayload = {
      export_metadata: {
        platform: 'MeowNet',
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
        clerk_id: user.id, // Clerk social or DB direct ID
      },
      profile: profileRes.data || null,
      points_history: pointsRes.data || [],
      logged_cats: catsRes.data || [],
      caregiver_pledges: pledgesRes.data || [],
      support_queries: queriesRes.data || [],
    };

    return NextResponse.json(exportPayload);
  } catch (err: any) {
    return NextResponse.json({ error: 'failed_to_export', detail: err.message }, { status: 500 });
  }
}
