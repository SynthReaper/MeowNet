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
