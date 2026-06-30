-- supabase/migrations/0060_notices_pinned.sql
-- Add pinned column to notices table

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
