-- Migration 0052: Proof of Neuter cryptographic verification system
CREATE TABLE IF NOT EXISTS public.proof_of_neuter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  clinic_name TEXT NOT NULL,
  neuter_date TIMESTAMP WITH TIME ZONE NOT NULL,
  signature TEXT NOT NULL, -- Cryptographic hash validator
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Configuration
ALTER TABLE public.proof_of_neuter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proof select for everyone" ON public.proof_of_neuter FOR SELECT USING (true);
CREATE POLICY "Users write own proofs" ON public.proof_of_neuter FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff modify proofs" ON public.proof_of_neuter FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'moderator')
  )
);
