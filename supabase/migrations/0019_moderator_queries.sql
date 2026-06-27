-- supabase/migrations/0019_moderator_queries.sql
-- ═══════════════════════════════════════════════════════════════
-- Moderator Queries Table & Security Policies
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.moderator_queries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  TEXT NOT NULL CHECK (target_type IN ('cat', 'event')),
  target_id    UUID NOT NULL,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message      TEXT NOT NULL CHECK (char_length(message) <= 2000),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.moderator_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable select for involved users and staff" ON public.moderator_queries
  FOR SELECT USING (
    auth.uid() = volunteer_id OR 
    auth.uid() = moderator_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

CREATE POLICY "Enable insert for staff roles" ON public.moderator_queries
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

CREATE POLICY "Enable update for involved staff or volunteers" ON public.moderator_queries
  FOR UPDATE USING (
    auth.uid() = volunteer_id OR 
    auth.uid() = moderator_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );
