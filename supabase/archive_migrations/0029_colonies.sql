-- supabase/migrations/0029_colonies.sql
-- ═══════════════════════════════════════════════════════════════
-- Colony Management Schema
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.colonies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  location            GEOGRAPHY(Point, 4326),
  address_display     TEXT,
  caretaker_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  population_estimate INTEGER NOT NULL DEFAULT 0,
  tnr_count           INTEGER NOT NULL DEFAULT 0,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.colonies ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone (including guests) can view colonies
CREATE POLICY "colonies_select" ON public.colonies
  FOR SELECT USING (true);

-- 2. Authenticated users can insert colonies
CREATE POLICY "colonies_insert" ON public.colonies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 3. Caretaker, creator, or admins/moderators can update colonies
CREATE POLICY "colonies_update" ON public.colonies
  FOR UPDATE USING (
    auth.uid() = caretaker_id OR 
    auth.uid() = created_by OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- 4. Admins and moderators can delete colonies
CREATE POLICY "colonies_delete" ON public.colonies
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator', 'admin')
  );

-- Enable Realtime for colonies table
ALTER PUBLICATION supabase_realtime ADD TABLE public.colonies;
