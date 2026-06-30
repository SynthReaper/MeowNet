-- supabase/migrations/0005_gamification.sql
CREATE TABLE IF NOT EXISTS public.point_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity    TEXT NOT NULL,
  points      INTEGER NOT NULL CHECK (points > 0),
  related_id  UUID,
  action_key  TEXT UNIQUE,         -- Idempotency — ON CONFLICT DO NOTHING
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS point_log_user_idx ON public.point_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS point_log_action_key ON public.point_log(action_key) WHERE action_key IS NOT NULL;
ALTER TABLE public.point_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.badges (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL,
  rarity      TEXT NOT NULL CHECK (rarity IN ('common','rare','legendary'))
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id   TEXT REFERENCES public.badges(id),
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Seed badges
INSERT INTO public.badges(id, name, description, icon, rarity) VALUES
  ('first_sighting', 'First Sighting',    'Logged your first cat',              'Eye',     'common'),
  ('cartographer',   'Cartographer',      'Logged 25 cats',                     'Map',     'rare'),
  ('tnr_warrior',    'TNR Warrior',       'Attended 5 TNR events',              'Swords',  'rare'),
  ('adoption_angel', 'Adoption Angel',    'Marked 3 cats as adopted',           'Heart',   'rare'),
  ('empire_founder', 'Empire Founder',    'Earned 500 total Empire Points',     'Crown',   'legendary'),
  ('grand_overlord', 'Grand Overlord',    'Earned 1000 total Empire Points',    'Star',    'legendary')
ON CONFLICT (id) DO NOTHING;

-- Weekly leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard_weekly AS
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
GROUP BY p.id, p.display_name, p.avatar_url, p.weekly_points
ORDER BY p.weekly_points DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_weekly_id ON public.leaderboard_weekly(id);
