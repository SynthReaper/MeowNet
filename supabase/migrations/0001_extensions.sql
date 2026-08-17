-- supabase/migrations/0001_extensions.sql
-- Enable all required extensions before any tables
-- Enable all required extensions before any tables
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable Row-Level Security on PostGIS spatial_ref_sys table in public schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys'
  ) THEN
    BEGIN
      ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "allow_read_spatial_ref_sys" ON public.spatial_ref_sys;
      CREATE POLICY "allow_read_spatial_ref_sys" ON public.spatial_ref_sys
        FOR SELECT USING (true);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;
