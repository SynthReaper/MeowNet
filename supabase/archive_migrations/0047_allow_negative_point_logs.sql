-- supabase/migrations/0047_allow_negative_point_logs.sql
ALTER TABLE public.point_log DROP CONSTRAINT IF EXISTS point_log_points_check;
ALTER TABLE public.point_log ADD CONSTRAINT point_log_points_check CHECK (points <> 0);
