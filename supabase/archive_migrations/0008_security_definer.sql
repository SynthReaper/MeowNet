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
