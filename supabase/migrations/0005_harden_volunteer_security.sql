-- supabase/migrations/0005_harden_volunteer_security.sql
-- Hardens RLS policies for volunteer_skills and volunteer_hours to prevent faking/forging credentials or hour logs.

-- 1. volunteer_skills hardening
DROP POLICY IF EXISTS "volunteer_skills_own_insert" ON public.volunteer_skills;

CREATE POLICY "volunteer_skills_own_insert"
  ON public.volunteer_skills FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND verified = false 
    AND verified_by IS NULL 
    AND verified_at IS NULL
  );

-- 2. volunteer_hours hardening
DROP POLICY IF EXISTS "volunteer_hours_own_all" ON public.volunteer_hours;

CREATE POLICY "volunteer_hours_own_select"
  ON public.volunteer_hours FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "volunteer_hours_own_insert"
  ON public.volunteer_hours FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND verified_by IS NULL 
    AND verified_at IS NULL
  );

CREATE POLICY "volunteer_hours_own_update"
  ON public.volunteer_hours FOR UPDATE
  USING (auth.uid() = user_id AND verified_by IS NULL)
  WITH CHECK (
    auth.uid() = user_id 
    AND verified_by IS NULL 
    AND verified_at IS NULL
  );

CREATE POLICY "volunteer_hours_own_delete"
  ON public.volunteer_hours FOR DELETE
  USING (auth.uid() = user_id AND verified_by IS NULL);
