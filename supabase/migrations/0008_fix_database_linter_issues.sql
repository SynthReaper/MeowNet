-- supabase/migrations/0008_fix_database_linter_issues.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Supabase Database Linter Comprehensive Remediation:
-- 1. security_definer_view: public.leaderboard_weekly & public.impact_summary
-- 2. rls_disabled_in_public: public.spatial_ref_sys
-- 3. function_search_path_mutable: mutable search_path on functions
-- 4. rls_policy_always_true: research_requests_insert_public WITH CHECK (true)
-- 5. anon/authenticated_security_definer_function_executable: revoke public/anon RPC access
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Security Definer Views -> Security Invoker
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'leaderboard_weekly'
  ) THEN
    ALTER VIEW public.leaderboard_weekly SET (security_invoker = true);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'impact_summary'
  ) THEN
    ALTER VIEW public.impact_summary SET (security_invoker = true);
  END IF;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. RLS on public.spatial_ref_sys (wrapped in exception block for managed Supabase)
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys'
  ) THEN
    BEGIN
      ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "allow_read_spatial_ref_sys" ON public.spatial_ref_sys;
      CREATE POLICY "allow_read_spatial_ref_sys" ON public.spatial_ref_sys
        FOR SELECT USING (true);
    EXCEPTION WHEN OTHERS THEN
      -- In managed Supabase, spatial_ref_sys is owned by supabase_admin
      NULL;
    END;
  END IF;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. RLS Policy Always True Hardening (research_data_requests)
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'research_data_requests'
  ) THEN
    DROP POLICY IF EXISTS "research_requests_insert_public" ON public.research_data_requests;
    CREATE POLICY "research_requests_insert_public"
      ON public.research_data_requests FOR INSERT
      WITH CHECK (
        organization_name IS NOT NULL AND
        contact_email IS NOT NULL AND
        purpose IS NOT NULL AND
        status = 'pending'
      );
  END IF;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- 4. Function Search Path Mutable Hardening
-- ───────────────────────────────────────────────────────────────────────────

-- get_displayable_location
CREATE OR REPLACE FUNCTION public.get_displayable_location(
  p_location GEOMETRY,
  p_privacy  TEXT
) RETURNS GEOMETRY LANGUAGE SQL IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_privacy = 'exact' THEN p_location
    ELSE ST_SnapToGrid(p_location, 0.005)
  END;
$$;

-- prevent_meownet_bucket_modification
CREATE OR REPLACE FUNCTION public.prevent_meownet_bucket_modification()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.id = 'MeowNet' OR NEW.id = 'MeowNet') THEN
    RAISE EXCEPTION 'The MeowNet bucket configuration cannot be changed after creation.';
  ELSIF TG_OP = 'DELETE' AND OLD.id = 'MeowNet' THEN
    RAISE EXCEPTION 'The MeowNet bucket cannot be deleted.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- check_notice_write
CREATE OR REPLACE FUNCTION public.check_notice_write()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Enforce on DELETE or UPDATE of existing broadcast/popup
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    IF (OLD.is_broadcast = true OR OLD.is_popup = true) THEN
      IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Only administrators can delete or modify site-wide broadcasts or popup notices.';
      END IF;
    END IF;
  END IF;

  -- Enforce on INSERT or UPDATE of new broadcast/popup values
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.is_broadcast = true OR NEW.is_popup = true) THEN
      IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Only administrators can create or modify site-wide broadcasts or popup notices.';
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- get_actor_role
CREATE OR REPLACE FUNCTION public.get_actor_role(p_user_id UUID)
RETURNS TEXT SECURITY DEFINER SET search_path = public AS $$
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

-- trigger_audit_point_log
CREATE OR REPLACE FUNCTION public.trigger_audit_point_log()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
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

-- trigger_audit_cats
CREATE OR REPLACE FUNCTION public.trigger_audit_cats()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Volunteer registered cat: ' || COALESCE(NEW.name, 'Unnamed') || ' (Status: ' || NEW.status || ')';
    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_cat', NEW.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.owner_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Updated cat profile properties: ' || COALESCE(NEW.name, 'Unnamed') || ' (Status: ' || NEW.status || ')';
    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_cat', NEW.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.owner_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Deleted cat profile: ' || COALESCE(OLD.name, 'Unnamed') || ' (Status: ' || OLD.status || ')';
    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_cat', OLD.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- trigger_audit_tnr_events
CREATE OR REPLACE FUNCTION public.trigger_audit_tnr_events()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
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
    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'create_event', NEW.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.organizer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Updated event: ' || NEW.title || ' (Status: ' || NEW.status || ')';
    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'update_event', NEW.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_actor_id := COALESCE(auth.uid(), OLD.organizer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    v_details := 'Deleted event: ' || OLD.title;
    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'delete_event', OLD.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- trigger_audit_moderator_queries
CREATE OR REPLACE FUNCTION public.trigger_audit_moderator_queries()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
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
    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), 'submit_query', NEW.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_actor_id := COALESCE(auth.uid(), NEW.volunteer_id);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id) THEN
      v_actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    IF OLD.status <> NEW.status THEN
      v_action := 'update_query_status';
      v_details := 'Ticket status changed from ' || OLD.status || ' to ' || NEW.status;
    ELSE
      v_action := 'reply_query';
      v_details := 'Ticket message update/reply sent';
    END IF;

    BEGIN
      INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
      VALUES (v_actor_id, public.get_actor_role(v_actor_id), v_action, NEW.id::TEXT, v_details);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- trigger_audit_profiles
CREATE OR REPLACE FUNCTION public.trigger_audit_profiles()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id UUID;
  v_details TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF (TG_OP = 'UPDATE') THEN
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


-- ───────────────────────────────────────────────────────────────────────────
-- 5. Revoke Direct REST/RPC Access from Public/Anon/Authenticated
-- ───────────────────────────────────────────────────────────────────────────

-- Revoke trigger and internal security definer functions from public/anon/authenticated
DO $$
BEGIN
  -- Trigger functions
  REVOKE ALL ON FUNCTION public.check_direct_message_update() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.check_event_capacity() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.check_moderator_application_status_update() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.check_notice_write() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.check_role_update() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.check_sub_moderator_edit_limit() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.fuzz_cat_location() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.fuzz_incident_location() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.handle_new_donation() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.handle_user_login_check() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.prevent_meownet_bucket_modification() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.set_colony_medical_log_recorded_by() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.touch_tasks_updated_at() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.trigger_audit_cats() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.trigger_audit_moderator_queries() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.trigger_audit_point_log() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.trigger_audit_profiles() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.trigger_audit_tnr_events() FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.update_chapter_member_count() FROM PUBLIC, anon, authenticated;

  -- Internal helper functions
  REVOKE ALL ON FUNCTION public.can_manage_event(UUID, UUID) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.donate_to_fund(UUID, INT, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.forfeit_points(UUID, TEXT, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.get_actor_role(UUID) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.get_displayable_location(GEOMETRY, TEXT) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.get_user_by_email(TEXT) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.get_volunteer_matches(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.is_channel_creator(UUID, UUID) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.is_channel_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON FUNCTION public.log_system_activity(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
