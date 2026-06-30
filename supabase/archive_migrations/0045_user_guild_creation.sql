-- supabase/migrations/0045_user_guild_creation.sql
-- ═══════════════════════════════════════════════════════════════
-- Allow Authenticated Users to Create Guilds & Seed Valid Guild UUIDs
-- ═══════════════════════════════════════════════════════════════

-- 1. DROP RESTRICTIVE STAFF INSERT POLICY
DROP POLICY IF EXISTS "Guilds insert for staff" ON public.guilds;

-- 2. CREATE NEW POLICY ALLOWING ALL AUTHENTICATED USERS TO INSERT GUILDS
CREATE POLICY "Guilds insert for authenticated users" ON public.guilds 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. SEED DEFAULT RESCUE GUILDS WITH VALID UUIDs
INSERT INTO public.guilds (id, name, description, logo_url, points) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'North Side Alley Cats',
    'Coordinating colony feeding and shelter insulation across the northern urban sector.',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=300&auto=format&fit=crop',
    420
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Downtown Stray Patrol',
    'TNR emergency trapping and safety sweeps in the crowded downtown commercial districts.',
    'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=300&auto=format&fit=crop',
    580
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'East End Whiskers',
    'Assisting caretakers with veterinary medicine runs and kitten fostering placements.',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=300&auto=format&fit=crop',
    290
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url;

-- 4. SEED DEFAULT QUESTS FOR SEEDED GUILDS
INSERT INTO public.guild_quests (guild_id, title, description, target_points, current_points, is_completed) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Winter Bedding Supply Hunt',
    'Contribute points to pool funds for purchasing 10 bags of thermal straw bedding.',
    100,
    40,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Weekly Colony Trap Fleet',
    'Pool points to secure veterinary transport vans for Saturday spay/neuter operations.',
    150,
    120,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Downtown Kitten Food Supply',
    'Provide kitten canned foods for winter shelters.',
    200,
    75,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'East End Medical Support Caravan',
    'Secure first-aid kits and vaccines.',
    120,
    60,
    false
  )
ON CONFLICT DO NOTHING;
