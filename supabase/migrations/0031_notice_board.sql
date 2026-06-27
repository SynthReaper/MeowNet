-- supabase/migrations/0031_notice_board.sql
-- ═══════════════════════════════════════════════════════════════
-- Notice Board & Admin Broadcasts
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_broadcast   BOOLEAN NOT NULL DEFAULT false,
  broadcast_type TEXT NOT NULL DEFAULT 'info' CHECK (broadcast_type IN ('info', 'warning', 'error', 'success')),
  is_popup       BOOLEAN NOT NULL DEFAULT false,
  expires_at     TIMESTAMPTZ,
  active         BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.notices;
CREATE POLICY "Allow select for authenticated" ON public.notices
  FOR SELECT TO authenticated USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Write policies (Insert, Update, Delete) for admin/moderator roles
DROP POLICY IF EXISTS "Allow write access for staff" ON public.notices;
CREATE POLICY "Allow write access for staff" ON public.notices
  FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- Trigger to validate that only admins can create broadcasts/popups
CREATE OR REPLACE FUNCTION public.check_notice_write()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_broadcast = true OR NEW.is_popup = true) THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only administrators can create or modify site-wide broadcasts or popup notices.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_notice_write ON public.notices;
CREATE TRIGGER tr_check_notice_write
  BEFORE INSERT OR UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.check_notice_write();

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'notices' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
  END IF;
END $$;
