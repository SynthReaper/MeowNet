-- supabase/migrations/0026_password_expiry.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;
