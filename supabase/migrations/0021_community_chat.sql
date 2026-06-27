-- supabase/migrations/0021_community_chat.sql
-- ═══════════════════════════════════════════════════════════════
-- Community Chat Room & Moderation Policies
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.community_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message      TEXT NOT NULL CHECK (char_length(message) <= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_flagged   BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (including anonymous guests) can read messages
CREATE POLICY "Enable select for everyone" ON public.community_messages
  FOR SELECT USING (true);

-- 2. Authenticated users can insert their own messages
CREATE POLICY "Enable insert for authenticated users" ON public.community_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Authors, moderators, and admins can delete messages
CREATE POLICY "Enable delete for author and staff" ON public.community_messages
  FOR DELETE USING (
    auth.uid() = user_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- 4. Authors, moderators, and admins can update messages
CREATE POLICY "Enable update for author and staff" ON public.community_messages
  FOR UPDATE USING (
    auth.uid() = user_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );
