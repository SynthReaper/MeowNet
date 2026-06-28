-- Migration 0053: Unify audit logs with database-enforced role access
CREATE OR REPLACE FUNCTION public.log_system_activity(
  p_action    TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_details   TEXT DEFAULT NULL
) RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Retrieve actor role securely in DB
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  INSERT INTO public.staff_audit_logs(actor_id, actor_role, action, target_id, details)
  VALUES (auth.uid(), COALESCE(v_role, 'volunteer'), p_action, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- Drop old selection policies on staff_audit_logs
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.staff_audit_logs;
DROP POLICY IF EXISTS "Moderators can view own audit logs" ON public.staff_audit_logs;

-- Re-enable RLS
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Admin select policy: can select everything
CREATE POLICY "Admin select all logs" ON public.staff_audit_logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 2. Moderator select policy: can select all volunteer and moderator logs, but NOT admin logs
CREATE POLICY "Moderator select non-admin logs" ON public.staff_audit_logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'moderator'
    AND actor_role <> 'admin'
  );

-- 3. Volunteer user select policy: can select only their own logs
CREATE POLICY "Volunteer select own logs" ON public.staff_audit_logs
  FOR SELECT USING (
    auth.uid() = actor_id
  );

-- 4. Insert policy: anyone can insert via RPC, but let's allow inserts directly if they match their auth UID
CREATE POLICY "Users insert own logs" ON public.staff_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
  );
