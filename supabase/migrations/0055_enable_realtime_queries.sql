-- Migration 0055: Enable realtime replication for moderator support queries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.moderator_queries;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.moderator_queries;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
