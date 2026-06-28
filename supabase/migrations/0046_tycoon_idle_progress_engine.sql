-- supabase/migrations/0046_tycoon_idle_progress_engine.sql
-- ═══════════════════════════════════════════════════════════════
-- Tycoon Idle Progress Offline Game Engine Schema Updates
-- ═══════════════════════════════════════════════════════════════

-- 1. ADD LAST_CLAIMED_AT COLUMN TO SANCTUARIES
ALTER TABLE public.colony_tycoon_sanctuaries
  ADD COLUMN IF NOT EXISTS last_claimed_at TIMESTAMPTZ DEFAULT NOW();
