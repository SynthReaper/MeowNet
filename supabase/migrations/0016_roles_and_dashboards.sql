-- supabase/migrations/0016_roles_and_dashboards.sql
-- ═══════════════════════════════════════════════════════════════
-- User Roles & Dashboard Access Management
-- ═══════════════════════════════════════════════════════════════

-- 1. Add role column to public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));

-- 2. Update handle_new_user() to automatically assign 'admin' to the first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_admin BOOLEAN;
BEGIN
  -- If no admin exists in profiles, make this first user an admin
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO has_admin;

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN has_admin THEN 'user' ELSE 'admin' END
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to prevent non-admins from self-escalating their roles
CREATE OR REPLACE FUNCTION public.check_role_update()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow modification only if the user is an admin or using service_role
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' AND auth.role() <> 'service_role' THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_role_update ON public.profiles;
CREATE TRIGGER tr_check_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.check_role_update();

-- 4. Enable RLS and add moderator/admin policies for cats and tnr_events
CREATE POLICY "cats_moderator_update" ON public.cats FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

CREATE POLICY "cats_moderator_delete" ON public.cats FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

CREATE POLICY "events_moderator_update" ON public.tnr_events FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

CREATE POLICY "events_moderator_delete" ON public.tnr_events FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
);

-- 5. Enable RLS and add policies for GDPR audits (admin only)
ALTER TABLE public.erasure_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS erasure_audit_admin_select ON public.erasure_audit;
CREATE POLICY erasure_audit_admin_select ON public.erasure_audit FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

ALTER TABLE public.data_retention_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_log_admin_select ON public.data_retention_log;
CREATE POLICY retention_log_admin_select ON public.data_retention_log FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
