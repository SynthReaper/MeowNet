-- supabase/migrations/0007_security_hardening.sql
-- Consolidated security hardening migration

-- 1. Redefine handle_new_user trigger function to remove email hardcoding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_admin BOOLEAN;
  new_role TEXT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO has_admin;
  new_role := CASE WHEN has_admin THEN 'user' ELSE 'admin' END;

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    new_role
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create cat location fuzz trigger BEFORE INSERT OR UPDATE
CREATE OR REPLACE FUNCTION public.fuzz_cat_location()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.location_privacy = 'area' AND NEW.location IS NOT NULL THEN
    NEW.location = ST_SnapToGrid(NEW.location, 0.005);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_cat_location_fuzz ON public.cats;
CREATE TRIGGER on_cat_location_fuzz
  BEFORE INSERT OR UPDATE ON public.cats
  FOR EACH ROW EXECUTE FUNCTION public.fuzz_cat_location();

-- 3. Create transactional donate_to_fund RPC
CREATE OR REPLACE FUNCTION public.donate_to_fund(
  p_fund_id UUID,
  p_amount_points INT,
  p_is_anonymous BOOLEAN,
  p_donor_id UUID
) RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_points INT;
BEGIN
  -- Security check: donor must match authenticated user
  IF auth.uid() IS DISTINCT FROM p_donor_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount_points <= 0 THEN
    RAISE EXCEPTION 'Invalid donation amount';
  END IF;

  -- Lock donor profile for update to prevent race conditions
  SELECT empire_points INTO v_points
  FROM public.profiles
  WHERE id = p_donor_id
  FOR UPDATE;

  IF v_points IS NULL OR v_points < p_amount_points THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Deduct points
  UPDATE public.profiles
  SET empire_points = empire_points - p_amount_points
  WHERE id = p_donor_id;

  -- Insert donation record
  INSERT INTO public.fund_donations (fund_id, donor_id, amount_points, is_anonymous)
  VALUES (p_fund_id, p_donor_id, p_amount_points, p_is_anonymous);
END;
$$ LANGUAGE plpgsql;

-- 4. Redefine check_role_update to cover all profile settings
CREATE OR REPLACE FUNCTION public.check_role_update()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role) OR
     (OLD.sub_role IS DISTINCT FROM NEW.sub_role) OR
     (OLD.is_enabled IS DISTINCT FROM NEW.is_enabled) OR
     (OLD.password_expires_at IS DISTINCT FROM NEW.password_expires_at) OR
     (OLD.max_usages IS DISTINCT FROM NEW.max_usages) OR
     (OLD.usages_count IS DISTINCT FROM NEW.usages_count) OR
     (OLD.max_edits IS DISTINCT FROM NEW.max_edits) OR
     (OLD.edits_count IS DISTINCT FROM NEW.edits_count) THEN
    -- Allow modification only if the user is an admin or using service_role
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' AND auth.role() <> 'service_role' THEN
      NEW.role := OLD.role;
      NEW.sub_role := OLD.sub_role;
      NEW.is_enabled := OLD.is_enabled;
      NEW.password_expires_at := OLD.password_expires_at;
      NEW.max_usages := OLD.max_usages;
      NEW.usages_count := OLD.usages_count;
      NEW.max_edits := OLD.max_edits;
      NEW.edits_count := OLD.edits_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create direct_messages update check trigger
CREATE OR REPLACE FUNCTION public.check_direct_message_update()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Senders can edit their own messages
  IF auth.uid() = OLD.sender_id THEN
    -- Sender cannot change the receiver_id or sender_id
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
      RAISE EXCEPTION 'Cannot change sender or receiver of a message.';
    END IF;
    RETURN NEW;
  END IF;

  -- Receivers can only update is_read
  IF auth.uid() = OLD.receiver_id THEN
    IF (NEW.id IS DISTINCT FROM OLD.id) OR
       (NEW.sender_id IS DISTINCT FROM OLD.sender_id) OR
       (NEW.receiver_id IS DISTINCT FROM OLD.receiver_id) OR
       (NEW.message IS DISTINCT FROM OLD.message) OR
       (NEW.created_at IS DISTINCT FROM OLD.created_at) OR
       (NEW.edited_at IS DISTINCT FROM OLD.edited_at) THEN
      RAISE EXCEPTION 'Recipient can only mark messages as read.';
    END IF;
    RETURN NEW;
  END IF;

  -- If neither sender nor receiver, deny
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_direct_message_update ON public.direct_messages;
CREATE TRIGGER tr_check_direct_message_update
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_direct_message_update();

-- 6. Create colony_medical_logs recorded_by trigger
CREATE OR REPLACE FUNCTION public.set_colony_medical_log_recorded_by()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.role() <> 'service_role' THEN
    NEW.recorded_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_colony_medical_log_recorded_by ON public.colony_medical_logs;
CREATE TRIGGER tr_set_colony_medical_log_recorded_by
  BEFORE INSERT ON public.colony_medical_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_colony_medical_log_recorded_by();

-- 7. Update check_event_capacity function to lock row FOR UPDATE
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_capacity INTEGER;
  v_signups  INTEGER;
BEGIN
  -- Lock the event row for update to serialize capacity checks
  SELECT capacity INTO v_capacity FROM public.tnr_events WHERE id = NEW.event_id FOR UPDATE;
  
  SELECT COUNT(*) INTO v_signups FROM public.event_signups WHERE event_id = NEW.event_id;
  IF v_signups >= v_capacity THEN
    RAISE EXCEPTION 'Event is at full capacity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Add caller-identity checks inside is_channel_member and is_channel_creator functions
CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Caller identity check
  IF auth.uid() IS DISTINCT FROM p_user_id 
     AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin'
     AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'moderator'
     AND auth.role() <> 'service_role' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_channel_creator(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Caller identity check
  IF auth.uid() IS DISTINCT FROM p_user_id 
     AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin'
     AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'moderator'
     AND auth.role() <> 'service_role' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.community_channels
    WHERE id = p_channel_id AND created_by = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 9. Create moderator_applications status updates lock trigger
CREATE OR REPLACE FUNCTION public.check_moderator_application_status_update()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' AND auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'Only admins can modify the status of moderator applications.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_moderator_application_status_update ON public.moderator_applications;
CREATE TRIGGER on_moderator_application_status_update
  BEFORE UPDATE ON public.moderator_applications
  FOR EACH ROW EXECUTE FUNCTION public.check_moderator_application_status_update();

-- 10. RLS Policies modifications

-- public.profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT (role, sub_role, edits_count, max_edits, is_enabled, password_expires_at, max_usages, usages_count) ON public.profiles FROM anon;

-- public.cats
DROP POLICY IF EXISTS "cats_select_all" ON public.cats;
CREATE POLICY "cats_select_all_new" ON public.cats
  FOR SELECT USING (true);

-- public.tnr_events
DROP POLICY IF EXISTS "events_select_all" ON public.tnr_events;
CREATE POLICY "events_select_authenticated" ON public.tnr_events
  FOR SELECT TO authenticated USING (true);

-- public.community_channels
DROP POLICY IF EXISTS "Update channels" ON public.community_channels;
CREATE POLICY "Update channels" ON public.community_channels
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  )
  WITH CHECK (
    is_private = true
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- public.guild_members
DROP POLICY IF EXISTS "Guild members select for everyone" ON public.guild_members;
CREATE POLICY "Guild members select_self_or_staff" ON public.guild_members
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- public.cat_caregivers
DROP POLICY IF EXISTS "caregivers_select_all" ON public.cat_caregivers;
CREATE POLICY "caregivers_select_authenticated" ON public.cat_caregivers
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.cat_caregivers FROM anon;

-- public.colony_medical_logs
DROP POLICY IF EXISTS "Medical logs select for everyone" ON public.colony_medical_logs;
CREATE POLICY "Medical logs select_staff_or_caretaker" ON public.colony_medical_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
    OR EXISTS (
      SELECT 1 FROM public.colonies c
      WHERE c.id = colony_medical_logs.colony_id AND (c.caretaker_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- public.user_notifications (Insert notifications restrict)
DROP POLICY IF EXISTS "Insert notifications allowed" ON public.user_notifications;
CREATE POLICY "Insert notifications allowed" ON public.user_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- public.community_reactions
DROP POLICY IF EXISTS "Reactions are public" ON public.community_reactions;
CREATE POLICY "Reactions visibility" ON public.community_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.community_messages m
      WHERE m.id = community_reactions.message_id
    )
  );

-- public.trivia_questions (Revoke correct_index select)
REVOKE SELECT ON public.trivia_questions FROM public, anon, authenticated;
GRANT SELECT (id, question, options, explanation, created_at) ON public.trivia_questions TO authenticated;
GRANT SELECT (id, question, options, explanation, created_at) ON public.trivia_questions TO anon;

-- public.staff_audit_logs (Volunteer check)
DROP POLICY IF EXISTS "Volunteer select own logs" ON public.staff_audit_logs;
CREATE POLICY "Volunteer select own logs" ON public.staff_audit_logs
  FOR SELECT USING (
    auth.uid() = actor_id AND actor_role <> 'admin'
  );

-- 11. Revoke execute on points triggers/RPCs
REVOKE EXECUTE ON FUNCTION public.award_points(UUID, TEXT, INTEGER, UUID, TEXT) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_points(UUID, INTEGER) FROM public, anon, authenticated;
