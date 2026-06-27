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
