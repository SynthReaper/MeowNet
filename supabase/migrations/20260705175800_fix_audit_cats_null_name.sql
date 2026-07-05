-- supabase/migrations/20260705175800_fix_audit_cats_null_name.sql
-- Fix NULL name concatenation crash in trigger_audit_cats and related triggers
-- Also add EXCEPTION handler so audit log failures never block the main operation

CREATE OR REPLACE FUNCTION public.trigger_audit_cats()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details  TEXT;
BEGIN
  BEGIN
    IF (TG_OP = 'INSERT') THEN
      v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
        v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
      END IF;
      v_details := 'Volunteer registered cat: ' || COALESCE(NEW.name, 'Unnamed') || ' (Status: ' || NEW.status || ')';
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_cat', NEW.id::TEXT, v_details);
      RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
      v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
        v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
      END IF;
      v_details := 'Updated cat profile: ' || COALESCE(NEW.name, 'Unnamed') || ' (Status: ' || NEW.status || ')';
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_cat', NEW.id::TEXT, v_details);
      RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
      v_actor_id := COALESCE(auth.uid(), OLD.owner_id);
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
        v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
      END IF;
      v_details := 'Deleted cat profile: ' || COALESCE(OLD.name, 'Unnamed') || ' (Status: ' || OLD.status || ')';
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_cat', OLD.id::TEXT, v_details);
      RETURN OLD;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Audit log failures must never block the primary cat operation
    RAISE WARNING 'trigger_audit_cats: audit log skipped — %', SQLERRM;
    IF (TG_OP = 'DELETE') THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
