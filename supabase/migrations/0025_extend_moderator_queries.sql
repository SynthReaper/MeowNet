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
