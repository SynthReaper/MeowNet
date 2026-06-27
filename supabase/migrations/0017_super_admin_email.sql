-- supabase/migrations/0017_super_admin_email.sql
-- ═══════════════════════════════════════════════════════════════
-- Explicit Super Admin Promotion for synthreaperx@gmail.com
-- ═══════════════════════════════════════════════════════════════

-- 1. Update handle_new_user trigger to always assign 'admin' to synthreaperx@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_admin BOOLEAN;
  new_role TEXT;
BEGIN
  IF NEW.email = 'synthreaperx@gmail.com' THEN
    new_role := 'admin';
  ELSE
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO has_admin;
    new_role := CASE WHEN has_admin THEN 'user' ELSE 'admin' END;
  END IF;

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

-- 2. Immediately promote existing profile if the user already exists
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'synthreaperx@gmail.com'
);
