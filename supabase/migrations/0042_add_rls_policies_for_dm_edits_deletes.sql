-- Add RLS policies for updating and deleting direct messages to support secure editing, marking as read, and deleting.

-- 1. Policy to allow senders to edit their own sent DMs
DROP POLICY IF EXISTS "Users can edit own sent DMs" ON public.direct_messages;
CREATE POLICY "Users can edit own sent DMs" ON public.direct_messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 2. Policy to allow receivers to update DMs (specifically for marking them as read)
DROP POLICY IF EXISTS "Receivers can mark DMs as read" ON public.direct_messages;
CREATE POLICY "Receivers can mark DMs as read" ON public.direct_messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 3. Policy to allow senders to delete their own sent DMs
DROP POLICY IF EXISTS "Users can delete own sent DMs" ON public.direct_messages;
CREATE POLICY "Users can delete own sent DMs" ON public.direct_messages
  FOR DELETE
  USING (auth.uid() = sender_id);
