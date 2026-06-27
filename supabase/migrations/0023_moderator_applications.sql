-- supabase/migrations/0023_moderator_applications.sql
-- ═══════════════════════════════════════════════════════════════
-- Moderator Applications Schema, Profile Enablement & Staff Audit Logs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.moderator_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (char_length(reason) <= 1000),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.moderator_applications ENABLE ROW LEVEL SECURITY;

-- 1. Users can read and insert their own applications
DROP POLICY IF EXISTS "Users can select own applications" ON public.moderator_applications;
CREATE POLICY "Users can select own applications" ON public.moderator_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own applications" ON public.moderator_applications;
CREATE POLICY "Users can insert own applications" ON public.moderator_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Staff can read and update all applications
DROP POLICY IF EXISTS "Staff can select all applications" ON public.moderator_applications;
CREATE POLICY "Staff can select all applications" ON public.moderator_applications
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

DROP POLICY IF EXISTS "Staff can update all applications" ON public.moderator_applications;
CREATE POLICY "Staff can update all applications" ON public.moderator_applications
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- 3. Seed Private Management Channel
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('management', 'Staff HQ 🛡️', 'Private channel for moderators and admins', 'admin_panel_settings')
ON CONFLICT (slug) DO NOTHING;

-- 4. Add is_enabled column to profiles (default true)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- 5. Create staff_audit_logs table
CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role   TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_id    TEXT,
  details      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.staff_audit_logs;
CREATE POLICY "Admin can view all audit logs" ON public.staff_audit_logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Moderators can view own audit logs" ON public.staff_audit_logs;
CREATE POLICY "Moderators can view own audit logs" ON public.staff_audit_logs
  FOR SELECT USING (
    auth.uid() = actor_id
  );
