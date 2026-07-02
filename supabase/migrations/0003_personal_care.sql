-- supabase/migrations/0003_personal_care.sql
-- Client-Side Encrypted Personal Cat Care Center & Private AI Keys Tables

CREATE TABLE IF NOT EXISTS public.personal_cats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_data   TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.personal_cats ENABLE ROW LEVEL SECURITY;

-- Create policies for owner-only access
CREATE POLICY "Users can insert their own personal cats" 
  ON public.personal_cats FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can select their own personal cats" 
  ON public.personal_cats FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own personal cats" 
  ON public.personal_cats FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own personal cats" 
  ON public.personal_cats FOR DELETE 
  USING (auth.uid() = owner_id);

-- User Private Config for API Keys
CREATE TABLE IF NOT EXISTS public.user_private_config (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_keys   TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_private_config ENABLE ROW LEVEL SECURITY;

-- Create policies for owner-only config access
CREATE POLICY "Users can insert their own config" 
  ON public.user_private_config FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own config" 
  ON public.user_private_config FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own config" 
  ON public.user_private_config FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own config" 
  ON public.user_private_config FOR DELETE 
  USING (auth.uid() = user_id);
