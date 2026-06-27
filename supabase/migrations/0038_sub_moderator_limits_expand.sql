-- supabase/migrations/0038_sub_moderator_limits_expand.sql
-- ═══════════════════════════════════════════════════════════════
-- Expand Sub-Moderator role edit limits check to colonies and notices
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS tr_check_sub_mod_colonies ON public.colonies;
CREATE TRIGGER tr_check_sub_mod_colonies
  BEFORE UPDATE OR DELETE ON public.colonies
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();

DROP TRIGGER IF EXISTS tr_check_sub_mod_notices ON public.notices;
CREATE TRIGGER tr_check_sub_mod_notices
  BEFORE UPDATE OR DELETE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();
