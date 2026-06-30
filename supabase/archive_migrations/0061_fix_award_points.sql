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
