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
