-- supabase/migrations/0024_enable_realtime.sql
-- Enable realtime publication for community_messages table

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
