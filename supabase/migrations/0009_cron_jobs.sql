-- supabase/migrations/0009_cron_jobs.sql
-- pg_cron background jobs

-- Refresh materialized views hourly
SELECT cron.schedule('refresh-leaderboard', '0 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard_weekly;
$$);

SELECT cron.schedule('refresh-impact', '*/15 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.impact_summary;
$$);

-- Reset weekly points every Monday at 00:00 UTC
SELECT cron.schedule('reset-weekly-points', '0 0 * * 1', $$
  UPDATE public.profiles SET weekly_points = 0, updated_at = NOW();
$$);

-- Purge audio uploads older than 24h (GDPR Article 5(1)(e) — storage limitation)
-- Audio files are stored in a temp bucket; this deletes old records
SELECT cron.schedule('purge-old-audio', '0 2 * * *', $$
  DELETE FROM storage.objects
  WHERE bucket_id = 'cat-audio'
  AND created_at < NOW() - INTERVAL '24 hours';
$$);
