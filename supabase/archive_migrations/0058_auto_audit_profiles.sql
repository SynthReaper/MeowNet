-- Migration 0058: Auto-audit profile administrative updates
CREATE OR REPLACE FUNCTION public.trigger_audit_profiles()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF (TG_OP = 'UPDATE') THEN
    -- Log role change
    IF COALESCE(OLD.role, '') <> COALESCE(NEW.role, '') THEN
      v_details := 'Role for user ' || COALESCE(NEW.display_name, NEW.id::TEXT) || ' updated from "' || COALESCE(OLD.role, 'none') || '" to "' || COALESCE(NEW.role, 'none') || '"';
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (
        COALESCE(v_actor_id, NEW.id),
        public.get_actor_role(v_actor_id),
        'update_user_role',
        NEW.id::TEXT,
        v_details
      );
    END IF;

    -- Log enabled/disabled toggle
    IF OLD.is_enabled <> NEW.is_enabled THEN
      v_details := 'Account status for user ' || COALESCE(NEW.display_name, NEW.id::TEXT) || ' changed to ' || (CASE WHEN NEW.is_enabled THEN 'ENABLED' ELSE 'DISABLED' END);
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (
        COALESCE(v_actor_id, NEW.id),
        public.get_actor_role(v_actor_id),
        'toggle_user_status',
        NEW.id::TEXT,
        v_details
      );
    END IF;

    -- Log empire points updates (XP adjustment)
    IF OLD.empire_points <> NEW.empire_points THEN
      v_details := 'XP points adjusted for user ' || COALESCE(NEW.display_name, NEW.id::TEXT) || ' from ' || OLD.empire_points || ' to ' || NEW.empire_points;
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (
        COALESCE(v_actor_id, NEW.id),
        public.get_actor_role(v_actor_id),
        'adjust_points_balance',
        NEW.id::TEXT,
        v_details
      );
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_profiles();
