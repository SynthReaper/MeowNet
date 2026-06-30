-- supabase/migrations/0002_production_schema.sql
-- Consolidated MeowNet production schema


-- ──────────────────────────────────────────────────────────
-- Source: 0002_auth_profiles.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0002_auth_profiles.sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT CHECK (char_length(display_name) <= 100),
  avatar_url      TEXT,
  empire_points   INTEGER NOT NULL DEFAULT 0 CHECK (empire_points >= 0),
  weekly_points   INTEGER NOT NULL DEFAULT 0 CHECK (weekly_points >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- User consents table (GDPR Article 6(1)(a))
CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, consent_type)
);
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────
-- Source: 0003_cats.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0003_cats.sql
CREATE TABLE IF NOT EXISTS public.cats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  name             TEXT CHECK (char_length(name) <= 100),
  photo_url        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'stray'
                   CHECK (status IN ('stray','tnr_needed','adoptable','adopted','fostered')),
  location         GEOMETRY(POINT, 4326) NOT NULL,
  location_privacy TEXT NOT NULL DEFAULT 'area' CHECK (location_privacy IN ('exact','area')),
  breed_estimate   TEXT CHECK (char_length(breed_estimate) <= 100),
  breed_confidence NUMERIC(4,3) CHECK (breed_confidence BETWEEN 0 AND 1),
  bcs_estimate     INTEGER CHECK (bcs_estimate BETWEEN 1 AND 9),
  health_flags     TEXT[] NOT NULL DEFAULT '{}',
  health_notes     TEXT CHECK (char_length(health_notes) <= 2000),
  age_estimate     TEXT CHECK (age_estimate IN ('kitten','juvenile','adult','senior')),
  color            TEXT CHECK (char_length(color) <= 100),
  sterilized       BOOLEAN NOT NULL DEFAULT false,
  vaccinated       BOOLEAN NOT NULL DEFAULT false,
  microchipped     BOOLEAN NOT NULL DEFAULT false,
  contact_info     TEXT CHECK (char_length(contact_info) <= 500),
  shelter_url      TEXT CHECK (char_length(shelter_url) <= 500),
  consent_recorded BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GIST spatial index — required for PostGIS range queries
CREATE INDEX IF NOT EXISTS cats_location_idx ON public.cats USING GIST(location);
CREATE INDEX IF NOT EXISTS cats_status_idx ON public.cats(status);
CREATE INDEX IF NOT EXISTS cats_owner_idx ON public.cats(owner_id);
CREATE INDEX IF NOT EXISTS cats_created_idx ON public.cats(created_at DESC);

ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;

-- Privacy-preserving location function
-- ST_SnapToGrid(0.005) ≈ 500m grid cell snap
CREATE OR REPLACE FUNCTION public.get_displayable_location(
  p_location GEOMETRY,
  p_privacy  TEXT
) RETURNS GEOMETRY LANGUAGE SQL IMMUTABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN p_privacy = 'exact' THEN p_location
    ELSE ST_SnapToGrid(p_location, 0.005)
  END;
$$;


-- ──────────────────────────────────────────────────────────
-- Source: 0004_events.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0004_events.sql
CREATE TABLE IF NOT EXISTS public.tnr_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (char_length(title) <= 200),
  description       TEXT CHECK (char_length(description) <= 1000),
  location          GEOMETRY(POINT, 4326) NOT NULL,
  event_time        TIMESTAMPTZ NOT NULL,
  capacity          INTEGER NOT NULL DEFAULT 10 CHECK (capacity BETWEEN 1 AND 500),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  cats_tnrd_count   INTEGER NOT NULL DEFAULT 0 CHECK (cats_tnrd_count >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tnr_events_location_idx ON public.tnr_events USING GIST(location);
CREATE INDEX IF NOT EXISTS tnr_events_time_idx ON public.tnr_events(event_time);
ALTER TABLE public.tnr_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.event_signups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.tnr_events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_up_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attended      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY;

-- Capacity guard trigger — prevents over-booking
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_capacity INTEGER;
  v_signups  INTEGER;
BEGIN
  SELECT capacity INTO v_capacity FROM public.tnr_events WHERE id = NEW.event_id;
  SELECT COUNT(*) INTO v_signups FROM public.event_signups WHERE event_id = NEW.event_id;
  IF v_signups >= v_capacity THEN
    RAISE EXCEPTION 'Event is at full capacity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_capacity ON public.event_signups;
CREATE TRIGGER enforce_capacity
  BEFORE INSERT ON public.event_signups
  FOR EACH ROW EXECUTE PROCEDURE public.check_event_capacity();


-- ──────────────────────────────────────────────────────────
-- Source: 0005_gamification.sql
-- ──────────────────────────────────────────────────────────

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


-- ──────────────────────────────────────────────────────────
-- Source: 0006_impact.sql
-- ──────────────────────────────────────────────────────────

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


-- ──────────────────────────────────────────────────────────
-- Source: 0007_rls_policies.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0007_rls_policies.sql
-- ═══════════════════════════════════════════════════════════════
-- RLS Policies — Principle of Least Privilege
-- ═══════════════════════════════════════════════════════════════

-- PROFILES
CREATE POLICY "profiles_select_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER_CONSENTS
CREATE POLICY "consents_select_own"   ON public.user_consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consents_insert_own"   ON public.user_consents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CATS — Read all, write own only
CREATE POLICY "cats_select_all"       ON public.cats FOR SELECT USING (true);
CREATE POLICY "cats_insert_own"       ON public.cats FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "cats_update_own"       ON public.cats FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "cats_delete_own"       ON public.cats FOR DELETE USING (auth.uid() = owner_id);

-- TNR_EVENTS
CREATE POLICY "events_select_all"     ON public.tnr_events FOR SELECT USING (true);
CREATE POLICY "events_insert_auth"    ON public.tnr_events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "events_update_own"     ON public.tnr_events FOR UPDATE USING (auth.uid() = organizer_id);

-- EVENT_SIGNUPS
CREATE POLICY "signups_select_auth"   ON public.event_signups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "signups_insert_auth"   ON public.event_signups FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POINT_LOG — No user-facing write access (service_role only via award_points function)
CREATE POLICY "pointlog_select_own"   ON public.point_log FOR SELECT USING (auth.uid() = user_id);
-- Deliberately NO INSERT/UPDATE/DELETE policy — service_role bypasses RLS

-- USER_BADGES
CREATE POLICY "badges_select_all"     ON public.badges FOR SELECT USING (true);
CREATE POLICY "userbadges_select_own" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────
-- Source: 0008_security_definer.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0008_security_definer.sql
-- SECURITY DEFINER functions run as the function owner (postgres), not the calling role.
-- This allows controlled bypass of RLS for trusted server-side operations.

-- award_points: can only be called server-side (service_role).
-- action_key prevents double-award on network retry.
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id    UUID,
  p_activity   TEXT,
  p_points     INTEGER,
  p_related_id UUID    DEFAULT NULL,
  p_action_key TEXT    DEFAULT NULL
) RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.point_log(user_id, activity, points, related_id, action_key)
  VALUES (p_user_id, p_activity, p_points, p_related_id, p_action_key)
  ON CONFLICT (action_key) DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles
    SET empire_points = empire_points + p_points,
        weekly_points = weekly_points + p_points,
        updated_at    = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- can_manage_event: checks organizer status safely
CREATE OR REPLACE FUNCTION public.can_manage_event(
  p_event_id UUID,
  p_user_id  UUID
) RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.tnr_events
    WHERE id = p_event_id AND organizer_id = p_user_id
  );
$$ LANGUAGE sql;

-- delete_user_account: GDPR right to erasure — cascades all user data
CREATE OR REPLACE FUNCTION public.delete_user_account(
  p_user_id UUID
) RETURNS VOID SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  -- Log erasure (anonymized — no PII retained)
  INSERT INTO public.erasure_audit(user_hash)
  VALUES (encode(digest(p_user_id::TEXT, 'sha256'), 'hex'));
  -- Cascade deletes all user data via FK ON DELETE CASCADE
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ──────────────────────────────────────────────────────────
-- Source: 0009_cron_jobs.sql
-- ──────────────────────────────────────────────────────────

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


-- ──────────────────────────────────────────────────────────
-- Source: 0010_gdpr.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0010_gdpr.sql
-- GDPR compliance infrastructure

-- Erasure audit — stores SHA-256 hash of user ID (not PII) for legal record
CREATE TABLE IF NOT EXISTS public.erasure_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash     TEXT NOT NULL,   -- SHA-256 of user_id; not reversible to PII
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data retention tracking (informational — actual deletion handled by cron/cascade)
CREATE TABLE IF NOT EXISTS public.data_retention_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   TEXT NOT NULL,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Soft-delete for cats to allow 30-day undelete window (optional compliance feature)
ALTER TABLE public.cats ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS cats_deleted_idx ON public.cats(deleted_at) WHERE deleted_at IS NOT NULL;

-- GDPR metadata comment on profiles table
COMMENT ON TABLE public.profiles IS
  'User profiles. Retention: until account deletion. GDPR basis: contract performance (Art 6(1)(b)).';
COMMENT ON TABLE public.cats IS
  'Cat sightings. Location fuzzed to 500m grid. GDPR basis: legitimate interests (Art 6(1)(f)) + consent (Art 6(1)(a)).';
COMMENT ON TABLE public.point_log IS
  'Immutable points ledger. Retention: 2 years. GDPR basis: contract performance.';


-- ──────────────────────────────────────────────────────────
-- Source: 0011_meownet_bucket.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0011_meownet_bucket.sql
-- ═══════════════════════════════════════════════════════════════
-- Storage Bucket: MeowNet
-- ═══════════════════════════════════════════════════════════════

-- 1. Insert bucket record into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'MeowNet',
  'MeowNet',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
) ON CONFLICT (id) DO NOTHING;

-- 2. Prevent updates or deletions of the MeowNet bucket to enforce immutability
CREATE OR REPLACE FUNCTION public.prevent_meownet_bucket_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.id = 'MeowNet' OR NEW.id = 'MeowNet') THEN
    RAISE EXCEPTION 'The MeowNet bucket configuration cannot be changed after creation.';
  ELSIF TG_OP = 'DELETE' AND OLD.id = 'MeowNet' THEN
    RAISE EXCEPTION 'The MeowNet bucket cannot be deleted.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_meownet_bucket_modification ON storage.buckets;
CREATE TRIGGER trigger_prevent_meownet_bucket_modification
  BEFORE UPDATE OR DELETE ON storage.buckets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_meownet_bucket_modification();

-- 3. Define policies for MeowNet bucket objects
-- Allow public SELECT (anyone can read objects without authorization)
DROP POLICY IF EXISTS "Allow public read access to MeowNet objects" ON storage.objects;
CREATE POLICY "Allow public read access to MeowNet objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'MeowNet');

-- Allow authenticated INSERT (only logged in users can upload)
DROP POLICY IF EXISTS "Allow authenticated uploads to MeowNet" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to MeowNet"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'MeowNet' 
    AND (SELECT auth.uid()) IS NOT NULL
  );

-- Allow owner UPDATE (only owner can modify their uploads)
DROP POLICY IF EXISTS "Allow owners to update their MeowNet objects" ON storage.objects;
CREATE POLICY "Allow owners to update their MeowNet objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'MeowNet' AND (SELECT auth.uid()) = owner);

-- Allow owner DELETE (only owner can delete their uploads)
DROP POLICY IF EXISTS "Allow owners to delete their MeowNet objects" ON storage.objects;
CREATE POLICY "Allow owners to delete their MeowNet objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'MeowNet' AND (SELECT auth.uid()) = owner);


-- ──────────────────────────────────────────────────────────
-- Source: 0012_realtime_views_and_caregivers.sql
-- ──────────────────────────────────────────────────────────

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


-- ──────────────────────────────────────────────────────────
-- Source: 0013_caregivers_user_id_fkey_and_funds.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0013_caregivers_user_id_fkey_and_funds.sql

-- 1. Alter public.cat_caregivers user_id constraint to reference public.profiles
ALTER TABLE public.cat_caregivers
  DROP CONSTRAINT IF EXISTS cat_caregivers_user_id_fkey,
  ADD CONSTRAINT cat_caregivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Add is_anonymous column to public.cat_caregivers
ALTER TABLE public.cat_caregivers
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- 3. Create public.community_funds table
CREATE TABLE IF NOT EXISTS public.community_funds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) <= 150),
  category      TEXT NOT NULL CHECK (category IN ('general', 'tnr', 'medical', 'food')),
  target_points INTEGER NOT NULL CHECK (target_points > 0),
  raised_points INTEGER NOT NULL DEFAULT 0 CHECK (raised_points >= 0),
  description   TEXT CHECK (char_length(description) <= 1000),
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_funds ENABLE ROW LEVEL SECURITY;

-- Policies for public.community_funds
CREATE POLICY "funds_select_all" ON public.community_funds
  FOR SELECT USING (true);

CREATE POLICY "funds_insert_own" ON public.community_funds
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

GRANT SELECT, INSERT ON public.community_funds TO authenticated;
GRANT SELECT ON public.community_funds TO anon;

-- 4. Create public.fund_donations table
CREATE TABLE IF NOT EXISTS public.fund_donations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id       UUID NOT NULL REFERENCES public.community_funds(id) ON DELETE CASCADE,
  donor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_points INTEGER NOT NULL CHECK (amount_points > 0),
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fund_donations ENABLE ROW LEVEL SECURITY;

-- Policies for public.fund_donations
CREATE POLICY "donations_select_all" ON public.fund_donations
  FOR SELECT USING (true);

CREATE POLICY "donations_insert_own" ON public.fund_donations
  FOR INSERT WITH CHECK (auth.uid() = donor_id);

GRANT SELECT, INSERT ON public.fund_donations TO authenticated;
GRANT SELECT ON public.fund_donations TO anon;

-- 5. Trigger or function to automatically update raised_points on new donation
CREATE OR REPLACE FUNCTION public.handle_new_donation()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.community_funds
  SET raised_points = raised_points + NEW.amount_points
  WHERE id = NEW.fund_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_fund_donation_created ON public.fund_donations;
CREATE TRIGGER on_fund_donation_created
  AFTER INSERT ON public.fund_donations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_donation();


-- ──────────────────────────────────────────────────────────
-- Source: 0014_forfeit_points.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0014_forfeit_points.sql

CREATE OR REPLACE FUNCTION public.forfeit_points(
  p_user_id    UUID,
  p_activity   TEXT,
  p_points     INTEGER,
  p_related_id UUID
) RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete the point log entry
  DELETE FROM public.point_log
  WHERE user_id = p_user_id 
    AND activity = p_activity 
    AND related_id = p_related_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- If entries were deleted, deduct the points
  IF v_deleted_count > 0 THEN
    UPDATE public.profiles
    SET empire_points = GREATEST(0, empire_points - (p_points * v_deleted_count)),
        weekly_points = GREATEST(0, weekly_points - (p_points * v_deleted_count)),
        updated_at    = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ──────────────────────────────────────────────────────────
-- Source: 0015_profile_enhancements.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0015_profile_enhancements.sql
-- Add profile customization fields for bio, preferred role, neighborhood, and contact phone

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT CHECK (char_length(bio) <= 500),
  ADD COLUMN IF NOT EXISTS preferred_role TEXT CHECK (char_length(preferred_role) <= 100),
  ADD COLUMN IF NOT EXISTS location_neighborhood TEXT CHECK (char_length(location_neighborhood) <= 100),
  ADD COLUMN IF NOT EXISTS contact_phone TEXT CHECK (char_length(contact_phone) <= 20);


-- ──────────────────────────────────────────────────────────
-- Source: 0016_roles_and_dashboards.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0016_roles_and_dashboards.sql
-- ═══════════════════════════════════════════════════════════════
-- User Roles & Dashboard Access Management
-- ═══════════════════════════════════════════════════════════════

-- 1. Add role column to public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));

-- 2. Update handle_new_user() to automatically assign 'admin' to the first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_admin BOOLEAN;
BEGIN
  -- If no admin exists in profiles, make this first user an admin
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO has_admin;

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN has_admin THEN 'user' ELSE 'admin' END
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to prevent non-admins from self-escalating their roles
CREATE OR REPLACE FUNCTION public.check_role_update()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow modification only if the user is an admin or using service_role
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' AND auth.role() <> 'service_role' THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_role_update ON public.profiles;
CREATE TRIGGER tr_check_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.check_role_update();

-- 4. Enable RLS and add moderator/admin policies for cats and tnr_events
CREATE POLICY "cats_moderator_update" ON public.cats FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

CREATE POLICY "cats_moderator_delete" ON public.cats FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

CREATE POLICY "events_moderator_update" ON public.tnr_events FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

CREATE POLICY "events_moderator_delete" ON public.tnr_events FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

-- 5. Enable RLS and add policies for GDPR audits (admin only)
ALTER TABLE public.erasure_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS erasure_audit_admin_select ON public.erasure_audit;
CREATE POLICY erasure_audit_admin_select ON public.erasure_audit FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

ALTER TABLE public.data_retention_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_log_admin_select ON public.data_retention_log;
CREATE POLICY retention_log_admin_select ON public.data_retention_log FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);


-- ──────────────────────────────────────────────────────────
-- Source: 0017_super_admin_email.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0017_super_admin_email.sql
-- ═══════════════════════════════════════════════════════════════
-- Explicit Super Admin Promotion for synthreaperx@gmail.com
-- ═══════════════════════════════════════════════════════════════

-- 1. Update handle_new_user trigger to always assign 'admin' to synthreaperx@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_admin BOOLEAN;
  new_role TEXT;
BEGIN
  IF NEW.email = 'synthreaperx@gmail.com' THEN
    new_role := 'admin';
  ELSE
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO has_admin;
    new_role := CASE WHEN has_admin THEN 'user' ELSE 'admin' END;
  END IF;

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    new_role
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Immediately promote existing profile if the user already exists
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'synthreaperx@gmail.com'
);


-- ──────────────────────────────────────────────────────────
-- Source: 0018_power_role_features.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0018_power_role_features.sql
-- ═══════════════════════════════════════════════════════════════
-- Power-Role Features (Verified Sightings & Admin Points Adjustment)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add is_verified column to public.cats
ALTER TABLE public.cats 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 2. Create adjust_points function to allow admins to modify user points directly
CREATE OR REPLACE FUNCTION public.adjust_points(
  p_user_id UUID,
  p_points  INTEGER
) RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET empire_points = GREATEST(0, empire_points + p_points),
      weekly_points = GREATEST(0, weekly_points + p_points),
      updated_at    = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ──────────────────────────────────────────────────────────
-- Source: 0019_moderator_queries.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0019_moderator_queries.sql
-- ═══════════════════════════════════════════════════════════════
-- Moderator Queries Table & Security Policies
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.moderator_queries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  TEXT NOT NULL CHECK (target_type IN ('cat', 'event')),
  target_id    UUID NOT NULL,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message      TEXT NOT NULL CHECK (char_length(message) <= 2000),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.moderator_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable select for involved users and staff" ON public.moderator_queries
  FOR SELECT USING (
    auth.uid() = volunteer_id OR 
    auth.uid() = moderator_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

CREATE POLICY "Enable insert for staff roles" ON public.moderator_queries
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

CREATE POLICY "Enable update for involved staff or volunteers" ON public.moderator_queries
  FOR UPDATE USING (
    auth.uid() = volunteer_id OR 
    auth.uid() = moderator_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );


-- ──────────────────────────────────────────────────────────
-- Source: 0020_extend_queries_target_type.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0020_extend_queries_target_type.sql
-- ═══════════════════════════════════════════════════════════════
-- Extend Moderator Queries target_type to support profiles
-- ═══════════════════════════════════════════════════════════════

-- Drop the auto-generated check constraint from migration 0019
ALTER TABLE public.moderator_queries 
  DROP CONSTRAINT IF EXISTS moderator_queries_target_type_check;

-- Add the expanded check constraint supporting 'cat', 'event', and 'profile'
ALTER TABLE public.moderator_queries 
  ADD CONSTRAINT moderator_queries_target_type_check 
  CHECK (target_type IN ('cat', 'event', 'profile'));


-- ──────────────────────────────────────────────────────────
-- Source: 0021_community_chat.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0021_community_chat.sql
-- ═══════════════════════════════════════════════════════════════
-- Community Chat Room & Moderation Policies
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.community_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message      TEXT NOT NULL CHECK (char_length(message) <= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_flagged   BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (including anonymous guests) can read messages
CREATE POLICY "Enable select for everyone" ON public.community_messages
  FOR SELECT USING (true);

-- 2. Authenticated users can insert their own messages
CREATE POLICY "Enable insert for authenticated users" ON public.community_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Authors, moderators, and admins can delete messages
CREATE POLICY "Enable delete for author and staff" ON public.community_messages
  FOR DELETE USING (
    auth.uid() = user_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- 4. Authors, moderators, and admins can update messages
CREATE POLICY "Enable update for author and staff" ON public.community_messages
  FOR UPDATE USING (
    auth.uid() = user_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );


-- ──────────────────────────────────────────────────────────
-- Source: 0022_community_channels.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0022_community_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Community Channels, Reactions & Channel Membership
-- ═══════════════════════════════════════════════════════════════

-- 1. Channels (like Slack channels / Reddit sub-communities)
CREATE TABLE IF NOT EXISTS public.community_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,          -- e.g. 'general', 'tnr-ops'
  name        TEXT NOT NULL,                 -- display name
  description TEXT,
  icon        TEXT DEFAULT 'forum',          -- material icon name
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are public" ON public.community_channels
  FOR SELECT USING (true);

CREATE POLICY "Only staff can create channels" ON public.community_channels
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

CREATE POLICY "Only staff can update channels" ON public.community_channels
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 2. Add channel_id to community_messages
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parent_id  UUID REFERENCES public.community_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMPTZ;

-- 3. Emoji reactions
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are public" ON public.community_reactions
  FOR SELECT USING (true);

CREATE POLICY "Auth users can react" ON public.community_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.community_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Seed default channels
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('general',      'General',       'Open discussion for everyone',                    'forum'),
  ('tnr-ops',      'TNR Ops',       'Coordinate Trap-Neuter-Return operations',         'content_cut'),
  ('cat-sightings','Cat Sightings', 'Share and confirm stray cat sightings',            'pets'),
  ('rescue',       'Rescue Help',   'Emergency rescue coordination and support',        'emergency'),
  ('resources',    'Resources',     'Food drives, supplies, vet contacts, and grants',  'volunteer_activism'),
  ('off-topic',    'Off Topic',     'Casual chat and cat pics 🐾',                     'mood')
ON CONFLICT (slug) DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- Source: 0023_moderator_applications.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0023_moderator_applications.sql
-- ═══════════════════════════════════════════════════════════════
-- Moderator Applications Schema, Profile Enablement & Staff Audit Logs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.moderator_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (char_length(reason) <= 1000),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.moderator_applications ENABLE ROW LEVEL SECURITY;

-- 1. Users can read and insert their own applications
DROP POLICY IF EXISTS "Users can select own applications" ON public.moderator_applications;
CREATE POLICY "Users can select own applications" ON public.moderator_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own applications" ON public.moderator_applications;
CREATE POLICY "Users can insert own applications" ON public.moderator_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Staff can read and update all applications
DROP POLICY IF EXISTS "Staff can select all applications" ON public.moderator_applications;
CREATE POLICY "Staff can select all applications" ON public.moderator_applications
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

DROP POLICY IF EXISTS "Staff can update all applications" ON public.moderator_applications;
CREATE POLICY "Staff can update all applications" ON public.moderator_applications
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- 3. Seed Private Management Channel
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('management', 'Staff HQ 🛡️', 'Private channel for moderators and admins', 'admin_panel_settings')
ON CONFLICT (slug) DO NOTHING;

-- 4. Add is_enabled column to profiles (default true)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- 5. Create staff_audit_logs table
CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role   TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_id    TEXT,
  details      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.staff_audit_logs;
CREATE POLICY "Admin can view all audit logs" ON public.staff_audit_logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Moderators can view own audit logs" ON public.staff_audit_logs;
CREATE POLICY "Moderators can view own audit logs" ON public.staff_audit_logs
  FOR SELECT USING (
    auth.uid() = actor_id
  );


-- ──────────────────────────────────────────────────────────
-- Source: 0024_enable_realtime.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0024_enable_realtime.sql
-- Enable realtime publication for community_messages table

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;


-- ──────────────────────────────────────────────────────────
-- Source: 0025_extend_moderator_queries.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0025_extend_moderator_queries.sql
-- ═══════════════════════════════════════════════════════════════
-- Support message/general query types and nullable columns
-- ═══════════════════════════════════════════════════════════════

-- 1. Make moderator_id nullable
ALTER TABLE public.moderator_queries 
  ALTER COLUMN moderator_id DROP NOT NULL;

-- 2. Make target_id nullable (for general user queries)
ALTER TABLE public.moderator_queries 
  ALTER COLUMN target_id DROP NOT NULL;

-- 3. Add response column to queries table
ALTER TABLE public.moderator_queries 
  ADD COLUMN IF NOT EXISTS response TEXT CHECK (char_length(response) <= 2000);

-- 4. Update check constraint to support 'message' and 'general' types
ALTER TABLE public.moderator_queries 
  DROP CONSTRAINT IF EXISTS moderator_queries_target_type_check;

ALTER TABLE public.moderator_queries 
  ADD CONSTRAINT moderator_queries_target_type_check 
  CHECK (target_type IN ('cat', 'event', 'profile', 'message', 'general'));


-- ──────────────────────────────────────────────────────────
-- Source: 0026_password_expiry.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0026_password_expiry.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;


-- ──────────────────────────────────────────────────────────
-- Source: 0027_dms_and_notifications.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0027_dms_and_notifications.sql
-- ═══════════════════════════════════════════════════════════════
-- Private Direct Messages, In-App Notifications, and Channel Creation
-- ═══════════════════════════════════════════════════════════════

-- 1. Private Direct Messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  media_url   TEXT,
  media_type  TEXT, -- 'image', 'video', 'pdf', 'sticker'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read     BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own DMs" ON public.direct_messages;
CREATE POLICY "Users can select own DMs" ON public.direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert own DMs" ON public.direct_messages;
CREATE POLICY "Users can insert own DMs" ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable Realtime for direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- 2. In-App Notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL, -- 'chat_mention', 'private_message', 'event_update', 'sighting_status'
  target_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own notifications" ON public.user_notifications;
CREATE POLICY "Users can select own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert notifications allowed" ON public.user_notifications;
CREATE POLICY "Insert notifications allowed" ON public.user_notifications
  FOR INSERT WITH CHECK (true);

-- Enable Realtime for user_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- 3. Relax Channel Creation (Allow all authenticated users to create channels/groups)
DROP POLICY IF EXISTS "Only staff can create channels" ON public.community_channels;
CREATE POLICY "Authenticated users can create channels" ON public.community_channels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────
-- Source: 0028_custom_admin_users.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0028_custom_admin_users.sql
-- Custom credentials support: custom password, custom expiration, and usage counts.

-- Add max_usages and usages_count columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_usages INTEGER DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usages_count INTEGER NOT NULL DEFAULT 0;

-- Function to check login parameters on successful sign-in
CREATE OR REPLACE FUNCTION public.handle_user_login_check()
RETURNS TRIGGER AS $$
DECLARE
  v_is_enabled BOOLEAN;
  v_password_expires_at TIMESTAMPTZ;
  v_max_usages INT;
  v_usages_count INT;
BEGIN
  -- Get the profile details
  SELECT is_enabled, password_expires_at, max_usages, usages_count
  INTO v_is_enabled, v_password_expires_at, v_max_usages, v_usages_count
  FROM public.profiles
  WHERE id = NEW.id;

  -- If profile doesn't exist yet, we allow it (the AFTER INSERT trigger will create it)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 1. Check if profile is disabled
  IF v_is_enabled = FALSE THEN
    RAISE EXCEPTION 'This account has been disabled.';
  END IF;

  -- 2. Check if password/ID has expired
  IF v_password_expires_at IS NOT NULL AND v_password_expires_at < NOW() THEN
    -- Disable the profile so future checks/session views fail
    UPDATE public.profiles SET is_enabled = FALSE WHERE id = NEW.id;
    RAISE EXCEPTION 'This account has expired.';
  END IF;

  -- 3. Check if usages limit exceeded
  IF v_max_usages IS NOT NULL AND v_usages_count >= v_max_usages THEN
    -- Disable the profile so future checks/session views fail
    UPDATE public.profiles SET is_enabled = FALSE WHERE id = NEW.id;
    RAISE EXCEPTION 'This account has reached its maximum login limit.';
  END IF;

  -- 4. Increment usage count on successful sign in
  IF (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) OR (OLD.last_sign_in_at IS NULL AND NEW.last_sign_in_at IS NOT NULL) THEN
    UPDATE public.profiles
    SET usages_count = COALESCE(usages_count, 0) + 1
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  BEFORE UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login_check();


-- ──────────────────────────────────────────────────────────
-- Source: 0029_colonies.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0029_colonies.sql
-- ═══════════════════════════════════════════════════════════════
-- Colony Management Schema
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.colonies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  location            GEOGRAPHY(Point, 4326),
  address_display     TEXT,
  caretaker_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  population_estimate INTEGER NOT NULL DEFAULT 0,
  tnr_count           INTEGER NOT NULL DEFAULT 0,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.colonies ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone (including guests) can view colonies
CREATE POLICY "colonies_select" ON public.colonies
  FOR SELECT USING (true);

-- 2. Authenticated users can insert colonies
CREATE POLICY "colonies_insert" ON public.colonies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 3. Caretaker, creator, or admins/moderators can update colonies
CREATE POLICY "colonies_update" ON public.colonies
  FOR UPDATE USING (
    auth.uid() = caretaker_id OR 
    auth.uid() = created_by OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- 4. Admins and moderators can delete colonies
CREATE POLICY "colonies_delete" ON public.colonies
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- Enable Realtime for colonies table
ALTER PUBLICATION supabase_realtime ADD TABLE public.colonies;


-- ──────────────────────────────────────────────────────────
-- Source: 0030_private_channels.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0030_private_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Private Channels, Invite Codes & Message Visibility
-- ═══════════════════════════════════════════════════════════════

-- 1. Alter community_channels to support private channels
ALTER TABLE public.community_channels
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Create channel_members table
CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- 3. Update/re-create RLS policies for community_channels
DROP POLICY IF EXISTS "Channels are public" ON public.community_channels;
DROP POLICY IF EXISTS "Channels visibility" ON public.community_channels;
CREATE POLICY "Channels visibility" ON public.community_channels
  FOR SELECT USING (
    is_private = false 
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.channel_members 
      WHERE channel_members.channel_id = community_channels.id AND channel_members.user_id = auth.uid()
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Authenticated users can create channels" ON public.community_channels;
DROP POLICY IF EXISTS "Only staff can create channels" ON public.community_channels;

CREATE POLICY "Insert channels" ON public.community_channels
  FOR INSERT WITH CHECK (
    -- Admin/moderator can create any channel (public or private)
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator'))
    OR
    -- Regular users can only create private channels where they set themselves as creator
    (is_private = true AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Only staff can update channels" ON public.community_channels;
DROP POLICY IF EXISTS "Update channels" ON public.community_channels;
CREATE POLICY "Update channels" ON public.community_channels
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 4. RLS policies for channel_members
DROP POLICY IF EXISTS "Select channel members" ON public.channel_members;
CREATE POLICY "Select channel members" ON public.channel_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_channels 
      WHERE id = channel_members.channel_id AND created_by = auth.uid()
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Insert channel members" ON public.channel_members;
CREATE POLICY "Insert channel members" ON public.channel_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Delete channel members" ON public.channel_members;
CREATE POLICY "Delete channel members" ON public.channel_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_channels 
      WHERE id = channel_members.channel_id AND created_by = auth.uid()
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 5. Update RLS policies for community_messages to respect private channels
DROP POLICY IF EXISTS "Enable select for everyone" ON public.community_messages;
DROP POLICY IF EXISTS "Select messages visibility" ON public.community_messages;
CREATE POLICY "Select messages visibility" ON public.community_messages
  FOR SELECT USING (
    channel_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.community_channels c
      WHERE c.id = community_messages.channel_id
      AND (
        c.is_private = false
        OR c.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.channel_members m
          WHERE m.channel_id = c.id AND m.user_id = auth.uid()
        )
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
      )
    )
  );

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.community_messages;
DROP POLICY IF EXISTS "Insert messages check" ON public.community_messages;
CREATE POLICY "Insert messages check" ON public.community_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      channel_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.community_channels c
        WHERE c.id = community_messages.channel_id
        AND (
          c.is_private = false
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.channel_members m
            WHERE m.channel_id = c.id AND m.user_id = auth.uid()
          )
          OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
        )
      )
    )
  );

-- 6. Enable Realtime for community_channels and channel_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;


-- ──────────────────────────────────────────────────────────
-- Source: 0031_notice_board.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0031_notice_board.sql
-- ═══════════════════════════════════════════════════════════════
-- Notice Board & Admin Broadcasts
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_broadcast   BOOLEAN NOT NULL DEFAULT false,
  broadcast_type TEXT NOT NULL DEFAULT 'info' CHECK (broadcast_type IN ('info', 'warning', 'error', 'success')),
  is_popup       BOOLEAN NOT NULL DEFAULT false,
  expires_at     TIMESTAMPTZ,
  active         BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.notices;
CREATE POLICY "Allow select for authenticated" ON public.notices
  FOR SELECT TO authenticated USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Write policies (Insert, Update, Delete) for admin/moderator roles
DROP POLICY IF EXISTS "Allow write access for staff" ON public.notices;
CREATE POLICY "Allow write access for staff" ON public.notices
  FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- Trigger to validate that only admins can create broadcasts/popups
CREATE OR REPLACE FUNCTION public.check_notice_write()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_broadcast = true OR NEW.is_popup = true) THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only administrators can create or modify site-wide broadcasts or popup notices.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_notice_write ON public.notices;
CREATE TRIGGER tr_check_notice_write
  BEFORE INSERT OR UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.check_notice_write();

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'notices' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────
-- Source: 0032_notice_permissions_hardening.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0032_notice_permissions_hardening.sql
-- ═══════════════════════════════════════════════════════════════
-- Notice Board Permissions Hardening (Admin vs Moderator)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_notice_write()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce on DELETE or UPDATE of existing broadcast/popup
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    IF (OLD.is_broadcast = true OR OLD.is_popup = true) THEN
      IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Only administrators can delete or modify site-wide broadcasts or popup notices.';
      END IF;
    END IF;
  END IF;

  -- Enforce on INSERT or UPDATE of new broadcast/popup values
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.is_broadcast = true OR NEW.is_popup = true) THEN
      IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Only administrators can create or modify site-wide broadcasts or popup notices.';
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to run on DELETE as well
DROP TRIGGER IF EXISTS tr_check_notice_write ON public.notices;
CREATE TRIGGER tr_check_notice_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.check_notice_write();


-- ──────────────────────────────────────────────────────────
-- Source: 0033_notice_target_page.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0033_notice_target_page.sql
-- Add target_page column to notices table for page-specific notices/broadcasts

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS target_page TEXT NOT NULL DEFAULT 'all';


-- ──────────────────────────────────────────────────────────
-- Source: 0034_update_community_channels.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0034_update_community_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Update Community Channels to align with Mockup specification
-- ═══════════════════════════════════════════════════════════════

-- 1. Remove old unused channels
DELETE FROM public.community_channels 
WHERE slug NOT IN ('general', 'management', 'adoption-stories', 'volunteer-hub', 'urgent-medical');

-- 2. Insert or update the mockup channels
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('general', 'General', 'Open discussion for everyone', 'forum'),
  ('adoption-stories', 'Adoption Stories', 'Share your heartwarming rescue and adoption stories', 'favorite'),
  ('volunteer-hub', 'Volunteer Hub', 'Real-time coordination and volunteer dispatch', 'groups'),
  ('urgent-medical', 'Urgent Medical', 'Emergency medical alerts and care coordination', 'medical_services'),
  ('management', 'Staff Hub', 'Moderator and admin coordination (staff only)', 'admin_panel_settings')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;


-- ──────────────────────────────────────────────────────────
-- Source: 0035_mix_community_channels.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0035_mix_community_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Mix all community channels (combining the two target sets)
-- ═══════════════════════════════════════════════════════════════

-- 1. Remove old unused channels (only keep the 10 mixed channels)
DELETE FROM public.community_channels 
WHERE slug NOT IN (
  'general',
  'adoption-stories',
  'volunteer-hub',
  'urgent-medical',
  'tnr-ops',
  'cat-sightings',
  'rescue',
  'resources',
  'off-topic',
  'management'
);

-- 2. Insert or update the mixed channels
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('general', 'General', 'Open discussion for everyone', 'forum'),
  ('adoption-stories', 'Adoption Stories', 'Share your heartwarming rescue and adoption stories', 'favorite'),
  ('volunteer-hub', 'Volunteer Hub', 'Real-time coordination and volunteer dispatch', 'groups'),
  ('urgent-medical', 'Urgent Medical', 'Emergency medical alerts and care coordination', 'medical_services'),
  ('tnr-ops', 'TNR Ops', 'Coordinate Trap-Neuter-Return operations', 'content_cut'),
  ('cat-sightings', 'Cat Sightings', 'Share and confirm stray cat sightings', 'pets'),
  ('rescue', 'Rescue Help', 'Emergency rescue coordination', 'emergency'),
  ('resources', 'Resources', 'Food drives, supplies, vet contacts', 'volunteer_activism'),
  ('off-topic', 'Off Topic', 'Casual chat and cat pics', 'mood'),
  ('management', 'Staff Hub', 'Moderator and admin coordination (staff only)', 'admin_panel_settings')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;


-- ──────────────────────────────────────────────────────────
-- Source: 0036_channels_policy_admin_only.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0036_channels_policy_admin_only.sql
-- ═══════════════════════════════════════════════════════════════
-- Restrict public channel creation to Admins only in RLS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Insert channels" ON public.community_channels;

CREATE POLICY "Insert channels" ON public.community_channels
  FOR INSERT WITH CHECK (
    -- Admins can create any channel (public or private)
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    OR
    -- Mods, managers, and regular users can create private channels
    (is_private = true AND created_by = auth.uid())
  );


-- ──────────────────────────────────────────────────────────
-- Source: 0037_sub_moderator_limits.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0037_sub_moderator_limits.sql
-- ═══════════════════════════════════════════════════════════════
-- Sub-Moderator role limits & automatic edits counting
-- ═══════════════════════════════════════════════════════════════

-- 1. Add sub-moderator and edits count columns to public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS sub_role TEXT CHECK (sub_role IN ('sub_moderator', 'full_moderator')),
  ADD COLUMN IF NOT EXISTS edits_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_edits INTEGER NOT NULL DEFAULT 5;

-- 2. Create the edit limit check function
CREATE OR REPLACE FUNCTION public.check_sub_moderator_edit_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_sub_role TEXT;
  v_edits_count INT;
  v_max_edits INT;
BEGIN
  -- Get the profile of the executing user (auth.uid())
  SELECT role, sub_role, edits_count, max_edits
  INTO v_role, v_sub_role, v_edits_count, v_max_edits
  FROM public.profiles
  WHERE id = auth.uid();

  -- Enforce only for moderators with 'sub_moderator' sub_role
  IF v_role = 'moderator' AND v_sub_role = 'sub_moderator' THEN
    -- Check if limit exceeded
    IF v_edits_count >= v_max_edits THEN
      RAISE EXCEPTION 'Sub-moderator edit limit of % reached. View-only access active.', v_max_edits;
    END IF;

    -- Increment edit count in profiles
    UPDATE public.profiles
    SET edits_count = edits_count + 1
    WHERE id = auth.uid();
  END IF;

  -- Return NEW or OLD depending on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Bind triggers to cats, events, and moderator queries
DROP TRIGGER IF EXISTS tr_check_sub_mod_cats ON public.cats;
CREATE TRIGGER tr_check_sub_mod_cats
  BEFORE UPDATE OR DELETE ON public.cats
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();

DROP TRIGGER IF EXISTS tr_check_sub_mod_events ON public.tnr_events;
CREATE TRIGGER tr_check_sub_mod_events
  BEFORE UPDATE OR DELETE ON public.tnr_events
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();

DROP TRIGGER IF EXISTS tr_check_sub_mod_queries ON public.moderator_queries;
CREATE TRIGGER tr_check_sub_mod_queries
  BEFORE UPDATE ON public.moderator_queries
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();


-- ──────────────────────────────────────────────────────────
-- Source: 0038_sub_moderator_limits_expand.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0038_sub_moderator_limits_expand.sql
-- ═══════════════════════════════════════════════════════════════
-- Expand Sub-Moderator role edit limits check to colonies and notices
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS tr_check_sub_mod_colonies ON public.colonies;
CREATE TRIGGER tr_check_sub_mod_colonies
  BEFORE UPDATE OR DELETE ON public.colonies
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();

DROP TRIGGER IF EXISTS tr_check_sub_mod_notices ON public.notices;
CREATE TRIGGER tr_check_sub_mod_notices
  BEFORE UPDATE OR DELETE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();


-- ──────────────────────────────────────────────────────────
-- Source: 0039_fix_channels_recursion.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0039_fix_channels_recursion.sql
-- ═══════════════════════════════════════════════════════════════
-- Fix RLS Infinite Recursion on channels and members
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper function to check if user is a member of a channel (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Helper function to check if user is the creator of a channel (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_channel_creator(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_channels
    WHERE id = p_channel_id AND created_by = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create SELECT policy for community_channels
DROP POLICY IF EXISTS "Channels visibility" ON public.community_channels;
CREATE POLICY "Channels visibility" ON public.community_channels
  FOR SELECT USING (
    is_private = false 
    OR created_by = auth.uid()
    OR public.is_channel_member(id, auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 4. Re-create RLS policies for channel_members
DROP POLICY IF EXISTS "Select channel members" ON public.channel_members;
CREATE POLICY "Select channel members" ON public.channel_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_channel_creator(channel_id, auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Delete channel members" ON public.channel_members;
CREATE POLICY "Delete channel members" ON public.channel_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_channel_creator(channel_id, auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 5. Re-create community_messages policies to prevent circular references
DROP POLICY IF EXISTS "Select messages visibility" ON public.community_messages;
CREATE POLICY "Select messages visibility" ON public.community_messages
  FOR SELECT USING (
    channel_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.community_channels c
      WHERE c.id = community_messages.channel_id
      AND (
        c.is_private = false
        OR c.created_by = auth.uid()
        OR public.is_channel_member(c.id, auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
      )
    )
  );

DROP POLICY IF EXISTS "Insert messages check" ON public.community_messages;
CREATE POLICY "Insert messages check" ON public.community_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      channel_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.community_channels c
        WHERE c.id = community_messages.channel_id
        AND (
          c.is_private = false
          OR c.created_by = auth.uid()
          OR public.is_channel_member(c.id, auth.uid())
          OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
        )
      )
    )
  );


-- ──────────────────────────────────────────────────────────
-- Source: 0040_update_max_edits_default.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0040_update_max_edits_default.sql
-- ═══════════════════════════════════════════════════════════════
-- Updates the default max_edits for sub-moderators from 5 → 20
-- Existing rows with max_edits = 5 (default) are also updated
-- to the new default. Accounts already over 5 are untouched.
-- ═══════════════════════════════════════════════════════════════

-- 1. Change the column default so new accounts get 20
ALTER TABLE public.profiles
  ALTER COLUMN max_edits SET DEFAULT 20;

-- 2. Backfill all rows that still have the old default of 5
--    (i.e. they were never manually customised)
UPDATE public.profiles
SET max_edits = 20
WHERE max_edits = 5;


-- ──────────────────────────────────────────────────────────
-- Source: 0041_add_edited_at_to_dms.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0041_add_edited_at_to_dms.sql
-- Add edited_at column to direct_messages table for message editing support

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;


-- ──────────────────────────────────────────────────────────
-- Source: 0042_add_rls_policies_for_dm_edits_deletes.sql
-- ──────────────────────────────────────────────────────────

-- Add RLS policies for updating and deleting direct messages to support secure editing, marking as read, and deleting.

-- 1. Policy to allow senders to edit their own sent DMs
DROP POLICY IF EXISTS "Users can edit own sent DMs" ON public.direct_messages;
CREATE POLICY "Users can edit own sent DMs" ON public.direct_messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 2. Policy to allow receivers to update DMs (specifically for marking them as read)
DROP POLICY IF EXISTS "Receivers can mark DMs as read" ON public.direct_messages;
CREATE POLICY "Receivers can mark DMs as read" ON public.direct_messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 3. Policy to allow senders to delete their own sent DMs
DROP POLICY IF EXISTS "Users can delete own sent DMs" ON public.direct_messages;
CREATE POLICY "Users can delete own sent DMs" ON public.direct_messages
  FOR DELETE
  USING (auth.uid() = sender_id);


-- ──────────────────────────────────────────────────────────
-- Source: 0043_upcoming_features_schemas.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0043_upcoming_features_schemas.sql
-- ═══════════════════════════════════════════════════════════════
-- Foundation Schemas for Upcoming Gamification, Guilds, and Winter Shelters
-- ═══════════════════════════════════════════════════════════════

-- 1. VOLUNTEER GUILDS & QUESTS
CREATE TABLE IF NOT EXISTS public.guilds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL CHECK (char_length(name) >= 3),
  description TEXT,
  logo_url    TEXT,
  points      INT DEFAULT 0 CHECK (points >= 0),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guild_members (
  guild_id    UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('leader', 'coordinator', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.guild_quests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id       UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  target_points  INT NOT NULL CHECK (target_points > 0),
  current_points INT DEFAULT 0 CHECK (current_points >= 0),
  is_completed   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STRAY BINGO CARDS
CREATE TABLE IF NOT EXISTS public.bingo_cards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start         DATE NOT NULL DEFAULT CURRENT_DATE,
  squares            JSONB NOT NULL, -- 5x5 grid tasks and status
  completed_squares  INT DEFAULT 0 CHECK (completed_squares BETWEEN 0 AND 25),
  is_bingo_achieved  BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COLONY TYCOON (VIRTUAL SANCTUARY)
CREATE TABLE IF NOT EXISTS public.colony_tycoon_sanctuaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  name              TEXT NOT NULL,
  level             INT DEFAULT 1 CHECK (level >= 1),
  point_multiplier  NUMERIC DEFAULT 1.0 CHECK (point_multiplier >= 1.0),
  idle_points_rate  INT DEFAULT 0 CHECK (idle_points_rate >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.colony_tycoon_upgrades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sanctuary_id  UUID REFERENCES public.colony_tycoon_sanctuaries(id) ON DELETE CASCADE,
  upgrade_type  TEXT NOT NULL CHECK (upgrade_type IN ('shelter_bed', 'kibble_feeder', 'first_aid', 'play_area')),
  level         INT DEFAULT 1 CHECK (level >= 1),
  cost_points   INT NOT NULL CHECK (cost_points >= 0),
  purchased_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WINTER WEATHER MICRO-SHELTERS
CREATE TABLE IF NOT EXISTS public.winter_shelters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_id      UUID REFERENCES public.colonies(id) ON DELETE CASCADE,
  material       TEXT NOT NULL,
  insulation_r   NUMERIC CHECK (insulation_r > 0),
  capacity_cats  INT CHECK (capacity_cats > 0),
  last_inspected TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DAILY TRIVIA STATS
CREATE TABLE IF NOT EXISTS public.trivia_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak  INT DEFAULT 0 CHECK (current_streak >= 0),
  max_streak      INT DEFAULT 0 CHECK (max_streak >= 0),
  total_correct   INT DEFAULT 0 CHECK (total_correct >= 0),
  total_played    INT DEFAULT 0 CHECK (total_played >= 0),
  last_played_at  TIMESTAMPTZ
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colony_tycoon_sanctuaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colony_tycoon_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winter_shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_stats ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES

-- Guilds
CREATE POLICY "Guilds select for everyone" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "Guilds insert for staff" ON public.guilds FOR INSERT WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);
CREATE POLICY "Guilds update for staff" ON public.guilds FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);

-- Guild Members
CREATE POLICY "Guild members select for everyone" ON public.guild_members FOR SELECT USING (true);
CREATE POLICY "Guild members insert for self" ON public.guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guild members delete for self or staff" ON public.guild_members FOR DELETE USING (
  auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);

-- Guild Quests
CREATE POLICY "Guild quests select for everyone" ON public.guild_quests FOR SELECT USING (true);
CREATE POLICY "Guild quests write for staff" ON public.guild_quests FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);

-- Bingo Cards
CREATE POLICY "Bingo cards own access" ON public.bingo_cards FOR ALL USING (auth.uid() = user_id);

-- Tycoon Sanctuary
CREATE POLICY "Tycoon sanctuaries select for everyone" ON public.colony_tycoon_sanctuaries FOR SELECT USING (true);
CREATE POLICY "Tycoon sanctuaries own write" ON public.colony_tycoon_sanctuaries FOR ALL USING (auth.uid() = user_id);

-- Tycoon Upgrades
CREATE POLICY "Tycoon upgrades select for everyone" ON public.colony_tycoon_upgrades FOR SELECT USING (true);
CREATE POLICY "Tycoon upgrades own write" ON public.colony_tycoon_upgrades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.colony_tycoon_sanctuaries s
    WHERE s.id = sanctuary_id AND s.user_id = auth.uid()
  )
);

-- Winter Shelters
CREATE POLICY "Winter shelters select for everyone" ON public.winter_shelters FOR SELECT USING (true);
CREATE POLICY "Winter shelters write for staff or caretaker" ON public.winter_shelters FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  OR EXISTS (
    SELECT 1 FROM public.colonies c
    WHERE c.id = colony_id AND (c.caretaker_id = auth.uid() OR c.created_by = auth.uid())
  )
);

-- Trivia Stats
CREATE POLICY "Trivia stats select for everyone" ON public.trivia_stats FOR SELECT USING (true);
CREATE POLICY "Trivia stats own write" ON public.trivia_stats FOR ALL USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────
-- Source: 0044_admin_gamification_creation.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0044_admin_gamification_creation.sql
-- ═══════════════════════════════════════════════════════════════
-- Dynamic Gamification Creation tables for Admin Controls
-- ═══════════════════════════════════════════════════════════════

-- 1. TRIVIA QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  options       TEXT[] NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BINGO TASK TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.bingo_task_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS ENFORCEMENT
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_task_templates ENABLE ROW LEVEL SECURITY;

-- SELECT is allowed for all authenticated users
CREATE POLICY "Trivia questions select for everyone" ON public.trivia_questions FOR SELECT USING (true);
CREATE POLICY "Bingo task templates select for everyone" ON public.bingo_task_templates FOR SELECT USING (true);

-- WRITE (INSERT, UPDATE, DELETE) is restricted to Admins only
CREATE POLICY "Trivia questions admin write" ON public.trivia_questions FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Bingo task templates admin write" ON public.bingo_task_templates FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- PRE-POPULATE TRIVIA QUESTIONS
INSERT INTO public.trivia_questions (question, options, correct_index, explanation) VALUES
  (
    'Which of the following is the most standard technique used to safely identify a returned/sterilized cat in a stray colony?',
    ARRAY['Left ear tipping/notching', 'Microchip tag collars', 'Neon paw markers', 'Tattooed tail rings'],
    0,
    'Ear tipping (removing a small portion of the left ear) is the globally accepted standard to identify a neutered stray cat from a distance.'
  ),
  (
    'When trapping a stray cat for TNR, what is the best food to use as bait to lure them into the trap?',
    ARRAY['Dry kibble', 'Highly aromatic wet food like tuna or sardines', 'Fresh raw carrots', 'White bread slices'],
    1,
    'Strong-smelling wet foods like tuna, sardines, or mackerel are the most effective bait for attracting cats into traps.'
  ),
  (
    'How long should a trapped cat typically remain covered in its trap before being transported to the vet clinic?',
    ARRAY['Kept uncovered at all times', 'Covered with a sheet or towel to minimize stress', 'Released immediately if they vocalize', 'Left in direct sunlight'],
    2,
    'Keeping the trap covered with a sheet or towel keeps the cat calm, reduces stress, and prevents injury from thrashing.'
  ),
  (
    'What is the minimum safe age for a stray kitten to undergo sterilization surgery in typical TNR protocols?',
    ARRAY['2 months or 2 pounds', '6 months', '1 year', '5 years'],
    0,
    'Kittens can be safely spayed or neutered once they are 2 months old or weigh at least 2 pounds.'
  ),
  (
    'Which type of bedding material is recommended for outdoor winter stray shelters, as it does not absorb moisture?',
    ARRAY['Blankets and towels', 'Straw', 'Shredded newspaper', 'Cardboard shreds'],
    1,
    'Straw is excellent because it repels moisture. Blankets and towels absorb moisture from the air and freeze, making the shelter colder.'
  );

-- PRE-POPULATE BINGO TASK TEMPLATES
INSERT INTO public.bingo_task_templates (label, type, description) VALUES
  ('Log Sighting', 'log_cat', 'Log a new cat profile'),
  ('Check Weather', 'check_weather', 'Visit weather safety watch'),
  ('Map Sighting', 'view_map', 'Interact with cat maps'),
  ('Join Chat Channel', 'join_chat', 'Write a community message'),
  ('Complete Daily Trivia', 'trivia_complete', 'Submit a trivia answer'),
  ('Fuzz Location', 'fuzz_location', 'Choose "Area" location privacy'),
  ('Clean EXIF', 'clean_exif', 'Upload photo with fuzzed EXIF'),
  ('Update Colony Check', 'colony_check', 'View colony health profile'),
  ('Point Transfer', 'point_transfer', 'Contribute points to community fund'),
  ('View notices', 'read_notice', 'Read notice board updates');


-- ──────────────────────────────────────────────────────────
-- Source: 0045_user_guild_creation.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0045_user_guild_creation.sql
-- ═══════════════════════════════════════════════════════════════
-- Allow Authenticated Users to Create Guilds & Seed Valid Guild UUIDs
-- ═══════════════════════════════════════════════════════════════

-- 1. DROP RESTRICTIVE STAFF INSERT POLICY
DROP POLICY IF EXISTS "Guilds insert for staff" ON public.guilds;

-- 2. CREATE NEW POLICY ALLOWING ALL AUTHENTICATED USERS TO INSERT GUILDS
CREATE POLICY "Guilds insert for authenticated users" ON public.guilds 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. SEED DEFAULT RESCUE GUILDS WITH VALID UUIDs
INSERT INTO public.guilds (id, name, description, logo_url, points) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'North Side Alley Cats',
    'Coordinating colony feeding and shelter insulation across the northern urban sector.',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=300&auto=format&fit=crop',
    420
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Downtown Stray Patrol',
    'TNR emergency trapping and safety sweeps in the crowded downtown commercial districts.',
    'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=300&auto=format&fit=crop',
    580
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'East End Whiskers',
    'Assisting caretakers with veterinary medicine runs and kitten fostering placements.',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=300&auto=format&fit=crop',
    290
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url;

-- 4. SEED DEFAULT QUESTS FOR SEEDED GUILDS
INSERT INTO public.guild_quests (guild_id, title, description, target_points, current_points, is_completed) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Winter Bedding Supply Hunt',
    'Contribute points to pool funds for purchasing 10 bags of thermal straw bedding.',
    100,
    40,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Weekly Colony Trap Fleet',
    'Pool points to secure veterinary transport vans for Saturday spay/neuter operations.',
    150,
    120,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Downtown Kitten Food Supply',
    'Provide kitten canned foods for winter shelters.',
    200,
    75,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'East End Medical Support Caravan',
    'Secure first-aid kits and vaccines.',
    120,
    60,
    false
  )
ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- Source: 0046_tycoon_idle_progress_engine.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0046_tycoon_idle_progress_engine.sql
-- ═══════════════════════════════════════════════════════════════
-- Tycoon Idle Progress Offline Game Engine Schema Updates
-- ═══════════════════════════════════════════════════════════════

-- 1. ADD LAST_CLAIMED_AT COLUMN TO SANCTUARIES
ALTER TABLE public.colony_tycoon_sanctuaries
  ADD COLUMN IF NOT EXISTS last_claimed_at TIMESTAMPTZ DEFAULT NOW();


-- ──────────────────────────────────────────────────────────
-- Source: 0047_allow_negative_point_logs.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0047_allow_negative_point_logs.sql
ALTER TABLE public.point_log DROP CONSTRAINT IF EXISTS point_log_points_check;
ALTER TABLE public.point_log ADD CONSTRAINT point_log_points_check CHECK (points <> 0);


-- ──────────────────────────────────────────────────────────
-- Source: 0048_guild_join_conditions.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0048_guild_join_conditions.sql
-- ═══════════════════════════════════════════════════════════════
-- Add Join Conditions, Category, and Creator Tracking to Guilds
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS min_points_required INT DEFAULT 0 CHECK (min_points_required >= 0);
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General' CHECK (category IN ('TNR', 'Feeding', 'Rescue', 'Medical', 'General'));
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ──────────────────────────────────────────────────────────
-- Source: 0049_enable_guild_realtime.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0049_enable_guild_realtime.sql
-- ═══════════════════════════════════════════════════════════════
-- Enable Supabase Realtime for Guilds, Members, and Quests Tables
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- 1. guilds
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'guilds' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guilds;
  END IF;

  -- 2. guild_members
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'guild_members' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_members;
  END IF;

  -- 3. guild_quests
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'guild_quests' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_quests;
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────
-- Source: 0050_system_settings.sql
-- ──────────────────────────────────────────────────────────

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


-- ──────────────────────────────────────────────────────────
-- Source: 0051_medical_logs_and_features.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0051_medical_logs_and_features.sql
-- ═══════════════════════════════════════════════════════════════
-- Veterinary Medical Logs & Profile Customizations
-- ═══════════════════════════════════════════════════════════════

-- 1. Extend Profiles for Badges & Custom Titles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_badge_id TEXT REFERENCES public.badges(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_title TEXT;

-- 2. Create Colony Medical Logs
CREATE TABLE IF NOT EXISTS public.colony_medical_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_id     UUID NOT NULL REFERENCES public.colonies(id) ON DELETE CASCADE,
  recorded_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_type      TEXT NOT NULL CHECK (log_type IN ('vaccine', 'parasite_treatment', 'injury', 'checkup')),
  notes         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.colony_medical_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Medical logs select for everyone" ON public.colony_medical_logs FOR SELECT USING (true);
CREATE POLICY "Medical logs write for staff or caretaker" ON public.colony_medical_logs FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  OR EXISTS (
    SELECT 1 FROM public.colonies c
    WHERE c.id = colony_id AND (c.caretaker_id = auth.uid() OR c.created_by = auth.uid())
  )
);


-- ──────────────────────────────────────────────────────────
-- Source: 0052_proof_of_neuter.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0052: Proof of Neuter cryptographic verification system
CREATE TABLE IF NOT EXISTS public.proof_of_neuter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  clinic_name TEXT NOT NULL,
  neuter_date TIMESTAMP WITH TIME ZONE NOT NULL,
  signature TEXT NOT NULL, -- Cryptographic hash validator
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Configuration
ALTER TABLE public.proof_of_neuter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proof select for everyone" ON public.proof_of_neuter FOR SELECT USING (true);
CREATE POLICY "Users write own proofs" ON public.proof_of_neuter FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff modify proofs" ON public.proof_of_neuter FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'moderator')
  )
);


-- ──────────────────────────────────────────────────────────
-- Source: 0053_unify_audit_logs.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0053: Unify audit logs with database-enforced role access
CREATE OR REPLACE FUNCTION public.log_system_activity(
  p_action    TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_details   TEXT DEFAULT NULL
) RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Retrieve actor role securely in DB
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
  VALUES (auth.uid(), COALESCE(v_role, 'volunteer'), p_action, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- Drop old selection policies on staff_audit_logs
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.staff_audit_logs;
DROP POLICY IF EXISTS "Moderators can view own audit logs" ON public.staff_audit_logs;

-- Re-enable RLS
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Admin select policy: can select everything
CREATE POLICY "Admin select all logs" ON public.staff_audit_logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 2. Moderator select policy: can select all volunteer and moderator logs, but NOT admin logs
CREATE POLICY "Moderator select non-admin logs" ON public.staff_audit_logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'moderator'
    AND actor_role <> 'admin'
  );

-- 3. Volunteer user select policy: can select only their own logs
CREATE POLICY "Volunteer select own logs" ON public.staff_audit_logs
  FOR SELECT USING (
    auth.uid() = actor_id
  );

-- 4. Insert policy: anyone can insert via RPC, but let's allow inserts directly if they match their auth UID
CREATE POLICY "Users insert own logs" ON public.staff_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
  );


-- ──────────────────────────────────────────────────────────
-- Source: 0054_query_chat_system.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0054: Query Escalation Chat System & Ticket Lifecycle

-- 1. Drop the old status check constraint if it exists
ALTER TABLE public.moderator_queries 
  DROP CONSTRAINT IF EXISTS moderator_queries_status_check;

-- 2. Add the updated check constraint supporting:
--    'pending' (open ticket)
--    'solved' (moderator responded, asking volunteer to close)
--    'closed' (volunteer resolved and closed the ticket)
--    'resolved' (legacy support status)
ALTER TABLE public.moderator_queries
  ADD CONSTRAINT moderator_queries_status_check
  CHECK (status IN ('pending', 'solved', 'closed', 'resolved'));

-- 3. Add JSONB chat messages array
ALTER TABLE public.moderator_queries
  ADD COLUMN IF NOT EXISTS chat_messages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4. Migrate old single-message tickets into the chat array structure
UPDATE public.moderator_queries
SET chat_messages = jsonb_build_array(
  jsonb_build_object(
    'sender_id', volunteer_id,
    'sender_role', 'volunteer',
    'message', message,
    'timestamp', created_at
  )
)
WHERE chat_messages = '[]'::jsonb;


-- ──────────────────────────────────────────────────────────
-- Source: 0055_enable_realtime_queries.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0055: Enable realtime replication for moderator support queries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.moderator_queries;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.moderator_queries;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ──────────────────────────────────────────────────────────
-- Source: 0056_auto_audit_logging.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0056: Natively audit point_log, cats, events, and moderator queries changes

-- Helper to retrieve profile roles securely inside triggers
CREATE OR REPLACE FUNCTION public.get_actor_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'system';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN COALESCE(v_role, 'volunteer');
END;
$$ LANGUAGE plpgsql;

-- 1. point_log triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_point_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
  VALUES (
    NEW.user_id,
    public.get_actor_role(NEW.user_id),
    'earn_xp',
    NEW.related_id::TEXT,
    'Claimed ' || NEW.points || ' XP for activity: ' || NEW.activity
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_point_log_trigger ON public.point_log;
CREATE TRIGGER audit_point_log_trigger
AFTER INSERT ON public.point_log
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_point_log();


-- 2. cats triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_cats()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    v_details := 'Volunteer registered cat: ' || NEW.name || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_cat', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    v_details := 'Updated cat profile properties: ' || NEW.name || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_cat', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.owner_id);
    v_details := 'Deleted cat profile: ' || OLD.name || ' (Status: ' || OLD.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_cat', OLD.id::TEXT, v_details);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_cats_trigger ON public.cats;
CREATE TRIGGER audit_cats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cats
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_cats();


-- 3. tnr_events triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_tnr_events()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.organizer_id);
    v_details := 'Created TNR event: ' || NEW.title || ' (Capacity: ' || NEW.capacity || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_event', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.organizer_id);
    v_details := 'Updated event: ' || NEW.title || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_event', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.organizer_id);
    v_details := 'Deleted event: ' || OLD.title;
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_event', OLD.id::TEXT, v_details);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_tnr_events_trigger ON public.tnr_events;
CREATE TRIGGER audit_tnr_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tnr_events
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_tnr_events();


-- 4. moderator_queries triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_moderator_queries()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
  v_action TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.volunteer_id);
    v_details := 'Submitted ticket: ' || SUBSTRING(NEW.message FROM 1 FOR 100);
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'submit_query', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.volunteer_id);
    
    -- Detect status change vs reply change
    IF OLD.status <> NEW.status THEN
      v_action := 'update_query_status';
      v_details := 'Ticket status changed from ' || OLD.status || ' to ' || NEW.status;
    ELSE
      v_action := 'reply_query';
      v_details := 'Ticket message update/reply sent';
    END IF;

    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), v_action, NEW.id::TEXT, v_details);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_moderator_queries_trigger ON public.moderator_queries;
CREATE TRIGGER audit_moderator_queries_trigger
AFTER INSERT OR UPDATE ON public.moderator_queries
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_moderator_queries();


-- ──────────────────────────────────────────────────────────
-- Source: 0057_realtime_replica_identity.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0057: Enable full replica identity for realtime update broadcasts
ALTER TABLE public.moderator_queries REPLICA IDENTITY FULL;


-- ──────────────────────────────────────────────────────────
-- Source: 0058_auto_audit_profiles.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0058: Auto-audit profile administrative updates
CREATE OR REPLACE FUNCTION public.trigger_audit_profiles()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF (TG_OP = 'UPDATE') THEN
    -- Log role change
    IF COALESCE(OLD.role, '') <> COALESCE(NEW.role, '') THEN
      v_details := 'Role for user ' || COALESCE(NEW.display_name, NEW.id::TEXT) || ' updated from "' || COALESCE(OLD.role, 'none') || '" to "' || COALESCE(NEW.role, 'none') || '"';
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (
        COALESCE(v_actor_id, NEW.id),
        public.get_actor_role(v_actor_id),
        'update_user_role',
        NEW.id::TEXT,
        v_details
      );
    END IF;

    -- Log enabled/disabled toggle
    IF OLD.is_enabled <> NEW.is_enabled THEN
      v_details := 'Account status for user ' || COALESCE(NEW.display_name, NEW.id::TEXT) || ' changed to ' || (CASE WHEN NEW.is_enabled THEN 'ENABLED' ELSE 'DISABLED' END);
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (
        COALESCE(v_actor_id, NEW.id),
        public.get_actor_role(v_actor_id),
        'toggle_user_status',
        NEW.id::TEXT,
        v_details
      );
    END IF;

    -- Log empire points updates (XP adjustment)
    IF OLD.empire_points <> NEW.empire_points THEN
      v_details := 'XP points adjusted for user ' || COALESCE(NEW.display_name, NEW.id::TEXT) || ' from ' || OLD.empire_points || ' to ' || NEW.empire_points;
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (
        COALESCE(v_actor_id, NEW.id),
        public.get_actor_role(v_actor_id),
        'adjust_points_balance',
        NEW.id::TEXT,
        v_details
      );
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_profiles();


-- ──────────────────────────────────────────────────────────
-- Source: 0059_get_user_by_email.sql
-- ──────────────────────────────────────────────────────────

-- Migration 0059: Scalable search helper to get user ID by email
CREATE OR REPLACE FUNCTION public.get_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email VARCHAR) 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY 
  SELECT u.id, u.email::VARCHAR 
  FROM auth.users u 
  WHERE LOWER(u.email) = LOWER(p_email);
END;
$$ LANGUAGE plpgsql;


-- ──────────────────────────────────────────────────────────
-- Source: 0060_notices_pinned.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0060_notices_pinned.sql
-- Add pinned column to notices table

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;


-- ──────────────────────────────────────────────────────────
-- Source: 0061_fix_award_points.sql
-- ──────────────────────────────────────────────────────────

-- supabase/migrations/0061_fix_award_points.sql
-- Redefine award_points to safely handle negative point transactions without violating check constraints.

CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id    UUID,
  p_activity   TEXT,
  p_points     INTEGER,
  p_related_id UUID    DEFAULT NULL,
  p_action_key TEXT    DEFAULT NULL
) RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.point_log(user_id, activity, points, related_id, action_key)
  VALUES (p_user_id, p_activity, p_points, p_related_id, p_action_key)
  ON CONFLICT (action_key) DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles
    SET empire_points = GREATEST(0, empire_points + p_points),
        weekly_points = GREATEST(0, weekly_points + p_points),
        updated_at    = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

