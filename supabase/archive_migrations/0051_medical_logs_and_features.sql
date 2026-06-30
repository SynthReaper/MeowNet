-- supabase/migrations/0051_medical_logs_and_features.sql
-- ═══════════════════════════════════════════════════════════════
-- Veterinary Medical Logs & Profile Customizations
-- ═══════════════════════════════════════════════════════════════

-- 1. Extend Profiles for Badges & Custom Titles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_badge_id TEXT REFERENCES public.badges(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_title TEXT;

-- 2. Create Colony Medical Logs
CREATE TABLE IF NOT EXISTS public.colony_medical_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_id     UUID NOT NULL REFERENCES public.colonies(id) ON DELETE CASCADE,
  recorded_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_type      TEXT NOT NULL CHECK (log_type IN ('vaccine', 'parasite_treatment', 'injury', 'checkup')),
  notes         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.colony_medical_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Medical logs select for everyone" ON public.colony_medical_logs FOR SELECT USING (true);
CREATE POLICY "Medical logs write for staff or caretaker" ON public.colony_medical_logs FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  OR EXISTS (
    SELECT 1 FROM public.colonies c
    WHERE c.id = colony_id AND (c.caretaker_id = auth.uid() OR c.created_by = auth.uid())
  )
);
