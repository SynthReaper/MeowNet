-- supabase/migrations/0012_realtime_views_and_caregivers.sql
-- ═══════════════════════════════════════════════════════════════
-- Realtime Leaderboard & Impact Views + Caregivers Pledges
-- ═══════════════════════════════════════════════════════════════

-- 1. Unschedule cron jobs for materialized view refreshing (not needed for standard views)
-- We wrap in an anonymous block to handle cases where pg_cron extension or jobs don't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('refresh-leaderboard');
    PERFORM cron.unschedule('refresh-impact');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not unschedule cron jobs: %', SQLERRM;
END $$;

-- 2. Drop the materialized views
DROP MATERIALIZED VIEW IF EXISTS public.leaderboard_weekly;
DROP MATERIALIZED VIEW IF EXISTS public.impact_summary;

-- 3. Recreate public.leaderboard_weekly as a standard VIEW for real-time calculations
CREATE OR REPLACE VIEW public.leaderboard_weekly AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  p.weekly_points,
  COUNT(pl.id) AS actions_taken,
  ARRAY_AGG(DISTINCT ub.badge_id) FILTER (WHERE ub.badge_id IS NOT NULL) AS badge_ids
FROM public.profiles p
LEFT JOIN public.point_log pl ON pl.user_id = p.id
  AND pl.created_at >= DATE_TRUNC('week', NOW())
LEFT JOIN public.user_badges ub ON ub.user_id = p.id
WHERE p.weekly_points > 0
GROUP BY p.id, p.display_name, p.avatar_url, p.weekly_points;

-- Grant permissions for authenticated/anon roles
GRANT SELECT ON public.leaderboard_weekly TO authenticated, anon;

-- 4. Recreate public.impact_summary as a standard VIEW for real-time dashboard statistics
CREATE OR REPLACE VIEW public.impact_summary AS
SELECT
  COUNT(*)::INTEGER                                   AS total_cats,
  COUNT(*) FILTER (WHERE status = 'tnr_needed')::INTEGER AS tnr_count,
  COUNT(*) FILTER (WHERE status = 'adopted')::INTEGER    AS adopted_count,
  (SELECT COUNT(DISTINCT owner_id)::INTEGER FROM public.cats
   WHERE created_at >= NOW() - INTERVAL '30 days')    AS active_volunteers,
  (SELECT COUNT(*)::INTEGER FROM public.tnr_events
   WHERE status = 'open')                             AS total_events
FROM public.cats;

-- Grant permissions
GRANT SELECT ON public.impact_summary TO authenticated, anon;

-- 5. Create caregivers/pledges table for the "Lend a Paw" action
CREATE TABLE IF NOT EXISTS public.cat_caregivers (
  cat_id     UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pledge     TEXT NOT NULL CHECK (pledge IN ('food', 'tnr', 'foster', 'vet')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cat_id, user_id, pledge)
);

-- Enable RLS
ALTER TABLE public.cat_caregivers ENABLE ROW LEVEL SECURITY;

-- 6. Add policies for public.cat_caregivers
CREATE POLICY "caregivers_select_all" ON public.cat_caregivers
  FOR SELECT USING (true);

CREATE POLICY "caregivers_insert_own" ON public.cat_caregivers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "caregivers_delete_own" ON public.cat_caregivers
  FOR DELETE USING (auth.uid() = user_id);

-- Grant select/insert/delete permissions to authenticated/anon roles
GRANT SELECT, INSERT, DELETE ON public.cat_caregivers TO authenticated;
GRANT SELECT ON public.cat_caregivers TO anon;
