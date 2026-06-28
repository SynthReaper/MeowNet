-- supabase/migrations/0044_admin_gamification_creation.sql
-- ═══════════════════════════════════════════════════════════════
-- Dynamic Gamification Creation tables for Admin Controls
-- ═══════════════════════════════════════════════════════════════

-- 1. TRIVIA QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  options       TEXT[] NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BINGO TASK TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.bingo_task_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS ENFORCEMENT
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_task_templates ENABLE ROW LEVEL SECURITY;

-- SELECT is allowed for all authenticated users
CREATE POLICY "Trivia questions select for everyone" ON public.trivia_questions FOR SELECT USING (true);
CREATE POLICY "Bingo task templates select for everyone" ON public.bingo_task_templates FOR SELECT USING (true);

-- WRITE (INSERT, UPDATE, DELETE) is restricted to Admins only
CREATE POLICY "Trivia questions admin write" ON public.trivia_questions FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Bingo task templates admin write" ON public.bingo_task_templates FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- PRE-POPULATE TRIVIA QUESTIONS
INSERT INTO public.trivia_questions (question, options, correct_index, explanation) VALUES
  (
    'Which of the following is the most standard technique used to safely identify a returned/sterilized cat in a stray colony?',
    ARRAY['Left ear tipping/notching', 'Microchip tag collars', 'Neon paw markers', 'Tattooed tail rings'],
    0,
    'Ear tipping (removing a small portion of the left ear) is the globally accepted standard to identify a neutered stray cat from a distance.'
  ),
  (
    'When trapping a stray cat for TNR, what is the best food to use as bait to lure them into the trap?',
    ARRAY['Dry kibble', 'Highly aromatic wet food like tuna or sardines', 'Fresh raw carrots', 'White bread slices'],
    1,
    'Strong-smelling wet foods like tuna, sardines, or mackerel are the most effective bait for attracting cats into traps.'
  ),
  (
    'How long should a trapped cat typically remain covered in its trap before being transported to the vet clinic?',
    ARRAY['Kept uncovered at all times', 'Covered with a sheet or towel to minimize stress', 'Released immediately if they vocalize', 'Left in direct sunlight'],
    2,
    'Keeping the trap covered with a sheet or towel keeps the cat calm, reduces stress, and prevents injury from thrashing.'
  ),
  (
    'What is the minimum safe age for a stray kitten to undergo sterilization surgery in typical TNR protocols?',
    ARRAY['2 months or 2 pounds', '6 months', '1 year', '5 years'],
    0,
    'Kittens can be safely spayed or neutered once they are 2 months old or weigh at least 2 pounds.'
  ),
  (
    'Which type of bedding material is recommended for outdoor winter stray shelters, as it does not absorb moisture?',
    ARRAY['Blankets and towels', 'Straw', 'Shredded newspaper', 'Cardboard shreds'],
    1,
    'Straw is excellent because it repels moisture. Blankets and towels absorb moisture from the air and freeze, making the shelter colder.'
  );

-- PRE-POPULATE BINGO TASK TEMPLATES
INSERT INTO public.bingo_task_templates (label, type, description) VALUES
  ('Log Sighting', 'log_cat', 'Log a new cat profile'),
  ('Check Weather', 'check_weather', 'Visit weather safety watch'),
  ('Map Sighting', 'view_map', 'Interact with cat maps'),
  ('Join Chat Channel', 'join_chat', 'Write a community message'),
  ('Complete Daily Trivia', 'trivia_complete', 'Submit a trivia answer'),
  ('Fuzz Location', 'fuzz_location', 'Choose "Area" location privacy'),
  ('Clean EXIF', 'clean_exif', 'Upload photo with fuzzed EXIF'),
  ('Update Colony Check', 'colony_check', 'View colony health profile'),
  ('Point Transfer', 'point_transfer', 'Contribute points to community fund'),
  ('View notices', 'read_notice', 'Read notice board updates');
