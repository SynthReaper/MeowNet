-- supabase/migrations/0050_system_settings.sql
-- ═══════════════════════════════════════════════════════════════
-- System Settings Table with Realtime Sync
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System settings select for everyone" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "System settings write for admin" ON public.system_settings FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Add to Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'system_settings' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
  END IF;
END $$;

-- Seed default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('TNR_POINTS_AWARDED', '50'::jsonb, 'XP points awarded to a volunteer for signing up and completing a TNR event.'),
  ('CAT_LOG_POINTS_AWARDED', '15'::jsonb, 'XP points awarded to a volunteer for registering a new cat sighting.'),
  ('MAINTENANCE_MODE', 'false'::jsonb, 'Puts the site into maintenance mode if set to true.'),
  ('WEATHER_WARNING_THRESHOLD', '5'::jsonb, 'Celsius temperature below which cold weather alerts are flagged for community cats.'),
  ('MAX_EMPIRE_LEADERBOARD_ENTRIES', '10'::jsonb, 'Maximum number of top users displayed on the global empire leaderboard.')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
