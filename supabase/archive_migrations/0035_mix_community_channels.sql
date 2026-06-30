-- supabase/migrations/0035_mix_community_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Mix all community channels (combining the two target sets)
-- ═══════════════════════════════════════════════════════════════

-- 1. Remove old unused channels (only keep the 10 mixed channels)
DELETE FROM public.community_channels 
WHERE slug NOT IN (
  'general',
  'adoption-stories',
  'volunteer-hub',
  'urgent-medical',
  'tnr-ops',
  'cat-sightings',
  'rescue',
  'resources',
  'off-topic',
  'management'
);

-- 2. Insert or update the mixed channels
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('general', 'General', 'Open discussion for everyone', 'forum'),
  ('adoption-stories', 'Adoption Stories', 'Share your heartwarming rescue and adoption stories', 'favorite'),
  ('volunteer-hub', 'Volunteer Hub', 'Real-time coordination and volunteer dispatch', 'groups'),
  ('urgent-medical', 'Urgent Medical', 'Emergency medical alerts and care coordination', 'medical_services'),
  ('tnr-ops', 'TNR Ops', 'Coordinate Trap-Neuter-Return operations', 'content_cut'),
  ('cat-sightings', 'Cat Sightings', 'Share and confirm stray cat sightings', 'pets'),
  ('rescue', 'Rescue Help', 'Emergency rescue coordination', 'emergency'),
  ('resources', 'Resources', 'Food drives, supplies, vet contacts', 'volunteer_activism'),
  ('off-topic', 'Off Topic', 'Casual chat and cat pics', 'mood'),
  ('management', 'Staff Hub', 'Moderator and admin coordination (staff only)', 'admin_panel_settings')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;
