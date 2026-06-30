-- supabase/migrations/0041_add_edited_at_to_dms.sql
-- Add edited_at column to direct_messages table for message editing support

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
