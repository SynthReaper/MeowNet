-- supabase/migrations/0032_notice_permissions_hardening.sql
-- ═══════════════════════════════════════════════════════════════
-- Notice Board Permissions Hardening (Admin vs Moderator)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_notice_write()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce on DELETE or UPDATE of existing broadcast/popup
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    IF (OLD.is_broadcast = true OR OLD.is_popup = true) THEN
      IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Only administrators can delete or modify site-wide broadcasts or popup notices.';
      END IF;
    END IF;
  END IF;

  -- Enforce on INSERT or UPDATE of new broadcast/popup values
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.is_broadcast = true OR NEW.is_popup = true) THEN
      IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Only administrators can create or modify site-wide broadcasts or popup notices.';
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to run on DELETE as well
DROP TRIGGER IF EXISTS tr_check_notice_write ON public.notices;
CREATE TRIGGER tr_check_notice_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.check_notice_write();
