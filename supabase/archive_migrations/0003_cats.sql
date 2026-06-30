-- supabase/migrations/0003_cats.sql
CREATE TABLE IF NOT EXISTS public.cats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  name             TEXT CHECK (char_length(name) <= 100),
  photo_url        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'stray'
                   CHECK (status IN ('stray','tnr_needed','adoptable','adopted','fostered')),
  location         GEOMETRY(POINT, 4326) NOT NULL,
  location_privacy TEXT NOT NULL DEFAULT 'area' CHECK (location_privacy IN ('exact','area')),
  breed_estimate   TEXT CHECK (char_length(breed_estimate) <= 100),
  breed_confidence NUMERIC(4,3) CHECK (breed_confidence BETWEEN 0 AND 1),
  bcs_estimate     INTEGER CHECK (bcs_estimate BETWEEN 1 AND 9),
  health_flags     TEXT[] NOT NULL DEFAULT '{}',
  health_notes     TEXT CHECK (char_length(health_notes) <= 2000),
  age_estimate     TEXT CHECK (age_estimate IN ('kitten','juvenile','adult','senior')),
  color            TEXT CHECK (char_length(color) <= 100),
  sterilized       BOOLEAN NOT NULL DEFAULT false,
  vaccinated       BOOLEAN NOT NULL DEFAULT false,
  microchipped     BOOLEAN NOT NULL DEFAULT false,
  contact_info     TEXT CHECK (char_length(contact_info) <= 500),
  shelter_url      TEXT CHECK (char_length(shelter_url) <= 500),
  consent_recorded BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GIST spatial index — required for PostGIS range queries
CREATE INDEX IF NOT EXISTS cats_location_idx ON public.cats USING GIST(location);
CREATE INDEX IF NOT EXISTS cats_status_idx ON public.cats(status);
CREATE INDEX IF NOT EXISTS cats_owner_idx ON public.cats(owner_id);
CREATE INDEX IF NOT EXISTS cats_created_idx ON public.cats(created_at DESC);

ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;

-- Privacy-preserving location function
-- ST_SnapToGrid(0.005) ≈ 500m grid cell snap
CREATE OR REPLACE FUNCTION public.get_displayable_location(
  p_location GEOMETRY,
  p_privacy  TEXT
) RETURNS GEOMETRY LANGUAGE SQL IMMUTABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN p_privacy = 'exact' THEN p_location
    ELSE ST_SnapToGrid(p_location, 0.005)
  END;
$$;
