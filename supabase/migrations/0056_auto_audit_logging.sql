-- Migration 0056: Natively audit point_log, cats, events, and moderator queries changes

-- Helper to retrieve profile roles securely inside triggers
CREATE OR REPLACE FUNCTION public.get_actor_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'system';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN COALESCE(v_role, 'volunteer');
END;
$$ LANGUAGE plpgsql;

-- 1. point_log triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_point_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
  VALUES (
    NEW.user_id,
    public.get_actor_role(NEW.user_id),
    'earn_xp',
    NEW.related_id::TEXT,
    'Claimed ' || NEW.points || ' XP for activity: ' || NEW.activity
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_point_log_trigger ON public.point_log;
CREATE TRIGGER audit_point_log_trigger
AFTER INSERT ON public.point_log
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_point_log();


-- 2. cats triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_cats()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    v_details := 'Volunteer registered cat: ' || NEW.name || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_cat', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    v_details := 'Updated cat profile properties: ' || NEW.name || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_cat', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.owner_id);
    v_details := 'Deleted cat profile: ' || OLD.name || ' (Status: ' || OLD.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_cat', OLD.id::TEXT, v_details);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_cats_trigger ON public.cats;
CREATE TRIGGER audit_cats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cats
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_cats();


-- 3. tnr_events triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_tnr_events()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.organizer_id);
    v_details := 'Created TNR event: ' || NEW.title || ' (Capacity: ' || NEW.capacity || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_event', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.organizer_id);
    v_details := 'Updated event: ' || NEW.title || ' (Status: ' || NEW.status || ')';
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_event', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.organizer_id);
    v_details := 'Deleted event: ' || OLD.title;
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_event', OLD.id::TEXT, v_details);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_tnr_events_trigger ON public.tnr_events;
CREATE TRIGGER audit_tnr_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tnr_events
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_tnr_events();


-- 4. moderator_queries triggers
CREATE OR REPLACE FUNCTION public.trigger_audit_moderator_queries()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
  v_action TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.volunteer_id);
    v_details := 'Submitted ticket: ' || SUBSTRING(NEW.message FROM 1 FOR 100);
    INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
    VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'submit_query', NEW.id::TEXT, v_details);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.volunteer_id);
    
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

DROP TRIGGER IF EXISTS audit_moderator_queries_trigger ON public.moderator_queries;
CREATE TRIGGER audit_moderator_queries_trigger
AFTER INSERT OR UPDATE ON public.moderator_queries
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_moderator_queries();
