-- supabase/migrations/0028_custom_admin_users.sql
-- Custom credentials support: custom password, custom expiration, and usage counts.

-- Add max_usages and usages_count columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_usages INTEGER DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usages_count INTEGER NOT NULL DEFAULT 0;

-- Function to check login parameters on successful sign-in
CREATE OR REPLACE FUNCTION public.handle_user_login_check()
RETURNS TRIGGER AS $$
DECLARE
  v_is_enabled BOOLEAN;
  v_password_expires_at TIMESTAMPTZ;
  v_max_usages INT;
  v_usages_count INT;
BEGIN
  -- Get the profile details
  SELECT is_enabled, password_expires_at, max_usages, usages_count
  INTO v_is_enabled, v_password_expires_at, v_max_usages, v_usages_count
  FROM public.profiles
  WHERE id = NEW.id;

  -- If profile doesn't exist yet, we allow it (the AFTER INSERT trigger will create it)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 1. Check if profile is disabled
  IF v_is_enabled = FALSE THEN
    RAISE EXCEPTION 'This account has been disabled.';
  END IF;

  -- 2. Check if password/ID has expired
  IF v_password_expires_at IS NOT NULL AND v_password_expires_at < NOW() THEN
    -- Disable the profile so future checks/session views fail
    UPDATE public.profiles SET is_enabled = FALSE WHERE id = NEW.id;
    RAISE EXCEPTION 'This account has expired.';
  END IF;

  -- 3. Check if usages limit exceeded
  IF v_max_usages IS NOT NULL AND v_usages_count >= v_max_usages THEN
    -- Disable the profile so future checks/session views fail
    UPDATE public.profiles SET is_enabled = FALSE WHERE id = NEW.id;
    RAISE EXCEPTION 'This account has reached its maximum login limit.';
  END IF;

  -- 4. Increment usage count on successful sign in
  IF (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) OR (OLD.last_sign_in_at IS NULL AND NEW.last_sign_in_at IS NOT NULL) THEN
    UPDATE public.profiles
    SET usages_count = COALESCE(usages_count, 0) + 1
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  BEFORE UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login_check();
