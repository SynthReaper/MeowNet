-- supabase/migrations/0013_caregivers_user_id_fkey_and_funds.sql

-- 1. Alter public.cat_caregivers user_id constraint to reference public.profiles
ALTER TABLE public.cat_caregivers
  DROP CONSTRAINT IF EXISTS cat_caregivers_user_id_fkey,
  ADD CONSTRAINT cat_caregivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Add is_anonymous column to public.cat_caregivers
ALTER TABLE public.cat_caregivers
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- 3. Create public.community_funds table
CREATE TABLE IF NOT EXISTS public.community_funds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) <= 150),
  category      TEXT NOT NULL CHECK (category IN ('general', 'tnr', 'medical', 'food')),
  target_points INTEGER NOT NULL CHECK (target_points > 0),
  raised_points INTEGER NOT NULL DEFAULT 0 CHECK (raised_points >= 0),
  description   TEXT CHECK (char_length(description) <= 1000),
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_funds ENABLE ROW LEVEL SECURITY;

-- Policies for public.community_funds
CREATE POLICY "funds_select_all" ON public.community_funds
  FOR SELECT USING (true);

CREATE POLICY "funds_insert_own" ON public.community_funds
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

GRANT SELECT, INSERT ON public.community_funds TO authenticated;
GRANT SELECT ON public.community_funds TO anon;

-- 4. Create public.fund_donations table
CREATE TABLE IF NOT EXISTS public.fund_donations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id       UUID NOT NULL REFERENCES public.community_funds(id) ON DELETE CASCADE,
  donor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_points INTEGER NOT NULL CHECK (amount_points > 0),
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fund_donations ENABLE ROW LEVEL SECURITY;

-- Policies for public.fund_donations
CREATE POLICY "donations_select_all" ON public.fund_donations
  FOR SELECT USING (true);

CREATE POLICY "donations_insert_own" ON public.fund_donations
  FOR INSERT WITH CHECK (auth.uid() = donor_id);

GRANT SELECT, INSERT ON public.fund_donations TO authenticated;
GRANT SELECT ON public.fund_donations TO anon;

-- 5. Trigger or function to automatically update raised_points on new donation
CREATE OR REPLACE FUNCTION public.handle_new_donation()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.community_funds
  SET raised_points = raised_points + NEW.amount_points
  WHERE id = NEW.fund_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_fund_donation_created ON public.fund_donations;
CREATE TRIGGER on_fund_donation_created
  AFTER INSERT ON public.fund_donations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_donation();
