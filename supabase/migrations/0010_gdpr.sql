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
