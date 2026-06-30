-- supabase/migrations/0036_channels_policy_admin_only.sql
-- ═══════════════════════════════════════════════════════════════
-- Restrict public channel creation to Admins only in RLS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Insert channels" ON public.community_channels;

CREATE POLICY "Insert channels" ON public.community_channels
  FOR INSERT WITH CHECK (
    -- Admins can create any channel (public or private)
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    OR
    -- Mods, managers, and regular users can create private channels
    (is_private = true AND created_by = auth.uid())
  );
