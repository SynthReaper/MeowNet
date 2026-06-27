-- supabase/seed.sql — Demo data for hackathon judges
-- Run: supabase db seed (or paste into SQL editor)

-- Create a dummy system user in auth.users (avoids FK violation on owner_id)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'system-cats@meownet.app',
  '$2a$10$YOh660DfeRj3a4N87cClWuzW9BqPz55R9sJd8G8Nl7cR8hP7eM9S.',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"System Cats"}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Demo cats
INSERT INTO public.cats (id, owner_id, name, photo_url, status, location, breed_estimate, breed_confidence, age_estimate, color, sterilized, vaccinated, consent_recorded) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000000', 'Whiskers', 'https://mwoigyiboxsoecnzibfr.supabase.co/storage/v1/object/public/MeowNet/seeds/whiskers.png', 'adoptable', ST_SetSRID(ST_MakePoint(-0.1278, 51.5074), 4326), 'British Shorthair', 0.87, 'adult', 'Blue-grey', true, true, true),
  ('a1b2c3d4-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000000', 'Ginger', 'https://mwoigyiboxsoecnzibfr.supabase.co/storage/v1/object/public/MeowNet/seeds/ginger.png', 'tnr_needed', ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326), 'Domestic Shorthair', 0.72, 'juvenile', 'Orange tabby', false, false, true),
  ('a1b2c3d4-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000000', NULL, 'https://mwoigyiboxsoecnzibfr.supabase.co/storage/v1/object/public/MeowNet/seeds/unnamed.png', 'stray', ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326), 'Maine Coon', 0.65, 'senior', 'Brown tabby', false, false, false),
  ('a1b2c3d4-0004-0004-0004-000000000004', '00000000-0000-0000-0000-000000000000', 'Princess', 'https://mwoigyiboxsoecnzibfr.supabase.co/storage/v1/object/public/MeowNet/seeds/princess.png', 'adopted', ST_SetSRID(ST_MakePoint(139.6917, 35.6895), 4326), 'Ragdoll', 0.91, 'adult', 'Seal point', true, true, true),
  ('a1b2c3d4-0005-0005-0005-000000000005', '00000000-0000-0000-0000-000000000000', 'Shadow', 'https://mwoigyiboxsoecnzibfr.supabase.co/storage/v1/object/public/MeowNet/seeds/shadow.png', 'tnr_needed', ST_SetSRID(ST_MakePoint(28.9784, 41.0082), 4326), 'Turkish Van', 0.58, 'adult', 'Black', false, false, false)
ON CONFLICT (id) DO NOTHING;

-- Demo TNR event
INSERT INTO public.tnr_events (id, organizer_id, title, description, location, event_time, capacity, status) VALUES
  ('e1e2e3e4-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000000',
   'Community TNR Drive — Central Park Area',
   'Bring traps, blankets, and cat food. Vets will be on-site for post-neuter monitoring. This is a beginner-friendly event — all welcome!',
   ST_SetSRID(ST_MakePoint(-73.9654, 40.7829), 4326),
   NOW() + INTERVAL '7 days',
   20, 'open')
ON CONFLICT (id) DO NOTHING;
