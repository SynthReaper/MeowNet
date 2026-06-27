-- supabase/migrations/0033_notice_target_page.sql
-- Add target_page column to notices table for page-specific notices/broadcasts

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS target_page TEXT NOT NULL DEFAULT 'all';
