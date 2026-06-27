-- supabase/migrations/0006_impact.sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.impact_summary AS
SELECT
  COUNT(*)                                            AS total_cats,
  COUNT(*) FILTER (WHERE status = 'tnr_needed')       AS tnr_count,
  COUNT(*) FILTER (WHERE status = 'adopted')          AS adopted_count,
  (SELECT COUNT(DISTINCT owner_id) FROM public.cats
   WHERE created_at >= NOW() - INTERVAL '30 days')    AS active_volunteers,
  (SELECT COUNT(*) FROM public.tnr_events
   WHERE status = 'open')                             AS total_events
FROM public.cats;

CREATE UNIQUE INDEX IF NOT EXISTS impact_summary_idx ON public.impact_summary((1));
