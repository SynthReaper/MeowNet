-- Migration 0054: Query Escalation Chat System & Ticket Lifecycle

-- 1. Drop the old status check constraint if it exists
ALTER TABLE public.moderator_queries 
  DROP CONSTRAINT IF EXISTS moderator_queries_status_check;

-- 2. Add the updated check constraint supporting:
--    'pending' (open ticket)
--    'solved' (moderator responded, asking volunteer to close)
--    'closed' (volunteer resolved and closed the ticket)
--    'resolved' (legacy support status)
ALTER TABLE public.moderator_queries
  ADD CONSTRAINT moderator_queries_status_check
  CHECK (status IN ('pending', 'solved', 'closed', 'resolved'));

-- 3. Add JSONB chat messages array
ALTER TABLE public.moderator_queries
  ADD COLUMN IF NOT EXISTS chat_messages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4. Migrate old single-message tickets into the chat array structure
UPDATE public.moderator_queries
SET chat_messages = jsonb_build_array(
  jsonb_build_object(
    'sender_id', volunteer_id,
    'sender_role', 'volunteer',
    'message', message,
    'timestamp', created_at
  )
)
WHERE chat_messages = '[]'::jsonb;
