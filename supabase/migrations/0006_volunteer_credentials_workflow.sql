-- supabase/migrations/0006_volunteer_credentials_workflow.sql
-- MeowNet v0.9.0 Social Impact — Improve volunteer credentials claim & verify workflow

-- Add new workflow columns to volunteer_skills
ALTER TABLE public.volunteer_skills ADD COLUMN IF NOT EXISTS info TEXT;
ALTER TABLE public.volunteer_skills ADD COLUMN IF NOT EXISTS proof TEXT;
ALTER TABLE public.volunteer_skills ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'query_raised', 'verified', 'rejected'));
ALTER TABLE public.volunteer_skills ADD COLUMN IF NOT EXISTS mod_query TEXT;
ALTER TABLE public.volunteer_skills ADD COLUMN IF NOT EXISTS volunteer_response TEXT;

-- Synchronize initial status with verified flag
UPDATE public.volunteer_skills SET status = 'verified' WHERE verified = true;

-- Drop existing update policy if any
DROP POLICY IF EXISTS "volunteer_skills_own_update" ON public.volunteer_skills;

-- Create update policy for standard volunteers to submit responses or correct their applications
CREATE POLICY "volunteer_skills_own_update"
  ON public.volunteer_skills FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND verified = false);
