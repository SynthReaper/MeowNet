-- supabase/migrations/0015_profile_enhancements.sql
-- Add profile customization fields for bio, preferred role, neighborhood, and contact phone

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT CHECK (char_length(bio) <= 500),
  ADD COLUMN IF NOT EXISTS preferred_role TEXT CHECK (char_length(preferred_role) <= 100),
  ADD COLUMN IF NOT EXISTS location_neighborhood TEXT CHECK (char_length(location_neighborhood) <= 100),
  ADD COLUMN IF NOT EXISTS contact_phone TEXT CHECK (char_length(contact_phone) <= 20);
