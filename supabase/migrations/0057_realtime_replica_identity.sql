-- Migration 0057: Enable full replica identity for realtime update broadcasts
ALTER TABLE public.moderator_queries REPLICA IDENTITY FULL;
