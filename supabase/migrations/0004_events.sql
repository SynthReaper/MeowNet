-- supabase/migrations/0004_events.sql
CREATE TABLE IF NOT EXISTS public.tnr_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (char_length(title) <= 200),
  description       TEXT CHECK (char_length(description) <= 1000),
  location          GEOMETRY(POINT, 4326) NOT NULL,
  event_time        TIMESTAMPTZ NOT NULL,
  capacity          INTEGER NOT NULL DEFAULT 10 CHECK (capacity BETWEEN 1 AND 500),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  cats_tnrd_count   INTEGER NOT NULL DEFAULT 0 CHECK (cats_tnrd_count >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tnr_events_location_idx ON public.tnr_events USING GIST(location);
CREATE INDEX IF NOT EXISTS tnr_events_time_idx ON public.tnr_events(event_time);
ALTER TABLE public.tnr_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.event_signups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.tnr_events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_up_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attended      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY;

-- Capacity guard trigger — prevents over-booking
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_capacity INTEGER;
  v_signups  INTEGER;
BEGIN
  SELECT capacity INTO v_capacity FROM public.tnr_events WHERE id = NEW.event_id;
  SELECT COUNT(*) INTO v_signups FROM public.event_signups WHERE event_id = NEW.event_id;
  IF v_signups >= v_capacity THEN
    RAISE EXCEPTION 'Event is at full capacity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_capacity ON public.event_signups;
CREATE TRIGGER enforce_capacity
  BEFORE INSERT ON public.event_signups
  FOR EACH ROW EXECUTE PROCEDURE public.check_event_capacity();
