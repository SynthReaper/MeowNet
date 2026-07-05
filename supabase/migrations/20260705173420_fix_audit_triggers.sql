-- supabase/migrations/20260705173420_fix_audit_triggers.sql
-- Fix foreign key constraint violations on public.staff_audit_logs when auditing cats, events, and moderator queries
-- Falls back to the 'System Cats' user ID ('00000000-0000-0000-0000-000000000000') if actor profile does not exist

CREATE OR REPLACE FUNCTION public.trigger_audit_cats()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Volunteer registered cat: ' || NEW.name || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_cat', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Updated cat profile properties: ' || NEW.name || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_cat', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.owner_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Deleted cat profile: ' || OLD.name || ' (Status: ' || OLD.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_cat', OLD.id::TEXT, v_details);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_audit_tnr_events()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.organizer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Created TNR event: ' || NEW.title || ' (Capacity: ' || NEW.capacity || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_event', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.organizer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Updated event: ' || NEW.title || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_event', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.organizer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Deleted event: ' || OLD.title;
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_event', OLD.id::TEXT, v_details);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_audit_moderator_queries()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
  v_action TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.volunteer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Submitted ticket: ' || SUBSTRING(NEW.message FROM 1 FOR 100);
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'submit_query', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.volunteer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    -- Detect status change vs reply change
    IF OLD.status <> NEW.status THEN
      v_action := 'update_query_status';
      v_details := 'Ticket status changed from ' || OLD.status || ' to ' || NEW.status;
    ELSE
      v_action := 'reply_query';
      v_details := 'Ticket message update/reply sent';
    END IF;

    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), v_action, NEW.id::TEXT, v_details);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
