-- supabase/migrations/0043_upcoming_features_schemas.sql
-- ═══════════════════════════════════════════════════════════════
-- Foundation Schemas for Upcoming Gamification, Guilds, and Winter Shelters
-- ═══════════════════════════════════════════════════════════════

-- 1. VOLUNTEER GUILDS & QUESTS
CREATE TABLE IF NOT EXISTS public.guilds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL CHECK (char_length(name) >= 3),
  description TEXT,
  logo_url    TEXT,
  points      INT DEFAULT 0 CHECK (points >= 0),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guild_members (
  guild_id    UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('leader', 'coordinator', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.guild_quests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id       UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  target_points  INT NOT NULL CHECK (target_points > 0),
  current_points INT DEFAULT 0 CHECK (current_points >= 0),
  is_completed   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STRAY BINGO CARDS
CREATE TABLE IF NOT EXISTS public.bingo_cards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start         DATE NOT NULL DEFAULT CURRENT_DATE,
  squares            JSONB NOT NULL, -- 5x5 grid tasks and status
  completed_squares  INT DEFAULT 0 CHECK (completed_squares BETWEEN 0 AND 25),
  is_bingo_achieved  BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COLONY TYCOON (VIRTUAL SANCTUARY)
CREATE TABLE IF NOT EXISTS public.colony_tycoon_sanctuaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  name              TEXT NOT NULL,
  level             INT DEFAULT 1 CHECK (level >= 1),
  point_multiplier  NUMERIC DEFAULT 1.0 CHECK (point_multiplier >= 1.0),
  idle_points_rate  INT DEFAULT 0 CHECK (idle_points_rate >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.colony_tycoon_upgrades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sanctuary_id  UUID REFERENCES public.colony_tycoon_sanctuaries(id) ON DELETE CASCADE,
  upgrade_type  TEXT NOT NULL CHECK (upgrade_type IN ('shelter_bed', 'kibble_feeder', 'first_aid', 'play_area')),
  level         INT DEFAULT 1 CHECK (level >= 1),
  cost_points   INT NOT NULL CHECK (cost_points >= 0),
  purchased_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WINTER WEATHER MICRO-SHELTERS
CREATE TABLE IF NOT EXISTS public.winter_shelters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_id      UUID REFERENCES public.colonies(id) ON DELETE CASCADE,
  material       TEXT NOT NULL,
  insulation_r   NUMERIC CHECK (insulation_r > 0),
  capacity_cats  INT CHECK (capacity_cats > 0),
  last_inspected TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DAILY TRIVIA STATS
CREATE TABLE IF NOT EXISTS public.trivia_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak  INT DEFAULT 0 CHECK (current_streak >= 0),
  max_streak      INT DEFAULT 0 CHECK (max_streak >= 0),
  total_correct   INT DEFAULT 0 CHECK (total_correct >= 0),
  total_played    INT DEFAULT 0 CHECK (total_played >= 0),
  last_played_at  TIMESTAMPTZ
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colony_tycoon_sanctuaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colony_tycoon_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winter_shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_stats ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES

-- Guilds
CREATE POLICY "Guilds select for everyone" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "Guilds insert for staff" ON public.guilds FOR INSERT WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);
CREATE POLICY "Guilds update for staff" ON public.guilds FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);

-- Guild Members
CREATE POLICY "Guild members select for everyone" ON public.guild_members FOR SELECT USING (true);
CREATE POLICY "Guild members insert for self" ON public.guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guild members delete for self or staff" ON public.guild_members FOR DELETE USING (
  auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);

-- Guild Quests
CREATE POLICY "Guild quests select for everyone" ON public.guild_quests FOR SELECT USING (true);
CREATE POLICY "Guild quests write for staff" ON public.guild_quests FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);

-- Bingo Cards
CREATE POLICY "Bingo cards own access" ON public.bingo_cards FOR ALL USING (auth.uid() = user_id);

-- Tycoon Sanctuary
CREATE POLICY "Tycoon sanctuaries select for everyone" ON public.colony_tycoon_sanctuaries FOR SELECT USING (true);
CREATE POLICY "Tycoon sanctuaries own write" ON public.colony_tycoon_sanctuaries FOR ALL USING (auth.uid() = user_id);

-- Tycoon Upgrades
CREATE POLICY "Tycoon upgrades select for everyone" ON public.colony_tycoon_upgrades FOR SELECT USING (true);
CREATE POLICY "Tycoon upgrades own write" ON public.colony_tycoon_upgrades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.colony_tycoon_sanctuaries s
    WHERE s.id = sanctuary_id AND s.user_id = auth.uid()
  )
);

-- Winter Shelters
CREATE POLICY "Winter shelters select for everyone" ON public.winter_shelters FOR SELECT USING (true);
CREATE POLICY "Winter shelters write for staff or caretaker" ON public.winter_shelters FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  OR EXISTS (
    SELECT 1 FROM public.colonies c
    WHERE c.id = colony_id AND (c.caretaker_id = auth.uid() OR c.created_by = auth.uid())
  )
);

-- Trivia Stats
CREATE POLICY "Trivia stats select for everyone" ON public.trivia_stats FOR SELECT USING (true);
CREATE POLICY "Trivia stats own write" ON public.trivia_stats FOR ALL USING (auth.uid() = user_id);
