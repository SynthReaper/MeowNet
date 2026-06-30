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
