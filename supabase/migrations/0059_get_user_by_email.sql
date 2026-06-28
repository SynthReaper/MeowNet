-- Migration 0059: Scalable search helper to get user ID by email
CREATE OR REPLACE FUNCTION public.get_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email VARCHAR) 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY 
  SELECT u.id, u.email::VARCHAR 
  FROM auth.users u 
  WHERE LOWER(u.email) = LOWER(p_email);
END;
$$ LANGUAGE plpgsql;
