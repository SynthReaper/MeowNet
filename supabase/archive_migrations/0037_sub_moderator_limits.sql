-- supabase/migrations/0037_sub_moderator_limits.sql
-- ═══════════════════════════════════════════════════════════════
-- Sub-Moderator role limits & automatic edits counting
-- ═══════════════════════════════════════════════════════════════

-- 1. Add sub-moderator and edits count columns to public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS sub_role TEXT CHECK (sub_role IN ('sub_moderator', 'full_moderator')),
  ADD COLUMN IF NOT EXISTS edits_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_edits INTEGER NOT NULL DEFAULT 5;

-- 2. Create the edit limit check function
CREATE OR REPLACE FUNCTION public.check_sub_moderator_edit_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_sub_role TEXT;
  v_edits_count INT;
  v_max_edits INT;
BEGIN
  -- Get the profile of the executing user (auth.uid())
  SELECT role, sub_role, edits_count, max_edits
  INTO v_role, v_sub_role, v_edits_count, v_max_edits
  FROM public.profiles
  WHERE id = auth.uid();

  -- Enforce only for moderators with 'sub_moderator' sub_role
  IF v_role = 'moderator' AND v_sub_role = 'sub_moderator' THEN
    -- Check if limit exceeded
    IF v_edits_count >= v_max_edits THEN
      RAISE EXCEPTION 'Sub-moderator edit limit of % reached. View-only access active.', v_max_edits;
    END IF;

    -- Increment edit count in profiles
    UPDATE public.profiles
    SET edits_count = edits_count + 1
    WHERE id = auth.uid();
  END IF;

  -- Return NEW or OLD depending on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Bind triggers to cats, events, and moderator queries
DROP TRIGGER IF EXISTS tr_check_sub_mod_cats ON public.cats;
CREATE TRIGGER tr_check_sub_mod_cats
  BEFORE UPDATE OR DELETE ON public.cats
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();

DROP TRIGGER IF EXISTS tr_check_sub_mod_events ON public.tnr_events;
CREATE TRIGGER tr_check_sub_mod_events
  BEFORE UPDATE OR DELETE ON public.tnr_events
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();

DROP TRIGGER IF EXISTS tr_check_sub_mod_queries ON public.moderator_queries;
CREATE TRIGGER tr_check_sub_mod_queries
  BEFORE UPDATE ON public.moderator_queries
  FOR EACH ROW EXECUTE FUNCTION public.check_sub_moderator_edit_limit();
