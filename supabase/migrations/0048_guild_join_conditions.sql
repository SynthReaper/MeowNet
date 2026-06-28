-- supabase/migrations/0048_guild_join_conditions.sql
-- ═══════════════════════════════════════════════════════════════
-- Add Join Conditions, Category, and Creator Tracking to Guilds
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS min_points_required INT DEFAULT 0 CHECK (min_points_required >= 0);
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General' CHECK (category IN ('TNR', 'Feeding', 'Rescue', 'Medical', 'General'));
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
