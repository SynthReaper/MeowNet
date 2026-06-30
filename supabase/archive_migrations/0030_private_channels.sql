-- supabase/migrations/0030_private_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Private Channels, Invite Codes & Message Visibility
-- ═══════════════════════════════════════════════════════════════

-- 1. Alter community_channels to support private channels
ALTER TABLE public.community_channels
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Create channel_members table
CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- 3. Update/re-create RLS policies for community_channels
DROP POLICY IF EXISTS "Channels are public" ON public.community_channels;
DROP POLICY IF EXISTS "Channels visibility" ON public.community_channels;
CREATE POLICY "Channels visibility" ON public.community_channels
  FOR SELECT USING (
    is_private = false 
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.channel_members 
      WHERE channel_members.channel_id = community_channels.id AND channel_members.user_id = auth.uid()
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Authenticated users can create channels" ON public.community_channels;
DROP POLICY IF EXISTS "Only staff can create channels" ON public.community_channels;

CREATE POLICY "Insert channels" ON public.community_channels
  FOR INSERT WITH CHECK (
    -- Admin/moderator can create any channel (public or private)
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator'))
    OR
    -- Regular users can only create private channels where they set themselves as creator
    (is_private = true AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Only staff can update channels" ON public.community_channels;
DROP POLICY IF EXISTS "Update channels" ON public.community_channels;
CREATE POLICY "Update channels" ON public.community_channels
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 4. RLS policies for channel_members
DROP POLICY IF EXISTS "Select channel members" ON public.channel_members;
CREATE POLICY "Select channel members" ON public.channel_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_channels 
      WHERE id = channel_members.channel_id AND created_by = auth.uid()
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Insert channel members" ON public.channel_members;
CREATE POLICY "Insert channel members" ON public.channel_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Delete channel members" ON public.channel_members;
CREATE POLICY "Delete channel members" ON public.channel_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_channels 
      WHERE id = channel_members.channel_id AND created_by = auth.uid()
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 5. Update RLS policies for community_messages to respect private channels
DROP POLICY IF EXISTS "Enable select for everyone" ON public.community_messages;
DROP POLICY IF EXISTS "Select messages visibility" ON public.community_messages;
CREATE POLICY "Select messages visibility" ON public.community_messages
  FOR SELECT USING (
    channel_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.community_channels c
      WHERE c.id = community_messages.channel_id
      AND (
        c.is_private = false
        OR c.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.channel_members m
          WHERE m.channel_id = c.id AND m.user_id = auth.uid()
        )
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
      )
    )
  );

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.community_messages;
DROP POLICY IF EXISTS "Insert messages check" ON public.community_messages;
CREATE POLICY "Insert messages check" ON public.community_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      channel_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.community_channels c
        WHERE c.id = community_messages.channel_id
        AND (
          c.is_private = false
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.channel_members m
            WHERE m.channel_id = c.id AND m.user_id = auth.uid()
          )
          OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
        )
      )
    )
  );

-- 6. Enable Realtime for community_channels and channel_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
