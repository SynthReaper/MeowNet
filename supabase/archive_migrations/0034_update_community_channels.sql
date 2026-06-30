-- supabase/migrations/0034_update_community_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Update Community Channels to align with Mockup specification
-- ═══════════════════════════════════════════════════════════════

-- 1. Remove old unused channels
DELETE FROM public.community_channels 
WHERE slug NOT IN ('general', 'management', 'adoption-stories', 'volunteer-hub', 'urgent-medical');

-- 2. Insert or update the mockup channels
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('general', 'General', 'Open discussion for everyone', 'forum'),
  ('adoption-stories', 'Adoption Stories', 'Share your heartwarming rescue and adoption stories', 'favorite'),
  ('volunteer-hub', 'Volunteer Hub', 'Real-time coordination and volunteer dispatch', 'groups'),
  ('urgent-medical', 'Urgent Medical', 'Emergency medical alerts and care coordination', 'medical_services'),
  ('management', 'Staff Hub', 'Moderator and admin coordination (staff only)', 'admin_panel_settings')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;
