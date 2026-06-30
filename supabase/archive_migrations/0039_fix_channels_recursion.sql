-- supabase/migrations/0039_fix_channels_recursion.sql
-- ═══════════════════════════════════════════════════════════════
-- Fix RLS Infinite Recursion on channels and members
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper function to check if user is a member of a channel (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Helper function to check if user is the creator of a channel (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_channel_creator(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_channels
    WHERE id = p_channel_id AND created_by = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create SELECT policy for community_channels
DROP POLICY IF EXISTS "Channels visibility" ON public.community_channels;
CREATE POLICY "Channels visibility" ON public.community_channels
  FOR SELECT USING (
    is_private = false 
    OR created_by = auth.uid()
    OR public.is_channel_member(id, auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 4. Re-create RLS policies for channel_members
DROP POLICY IF EXISTS "Select channel members" ON public.channel_members;
CREATE POLICY "Select channel members" ON public.channel_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_channel_creator(channel_id, auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Delete channel members" ON public.channel_members;
CREATE POLICY "Delete channel members" ON public.channel_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_channel_creator(channel_id, auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 5. Re-create community_messages policies to prevent circular references
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
        OR public.is_channel_member(c.id, auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
      )
    )
  );

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
          OR public.is_channel_member(c.id, auth.uid())
          OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
        )
      )
    )
  );
