-- supabase/migrations/0049_enable_guild_realtime.sql
-- ═══════════════════════════════════════════════════════════════
-- Enable Supabase Realtime for Guilds, Members, and Quests Tables
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- 1. guilds
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'guilds' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guilds;
  END IF;

  -- 2. guild_members
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'guild_members' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_members;
  END IF;

  -- 3. guild_quests
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'guild_quests' 
      AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_quests;
  END IF;
END $$;
