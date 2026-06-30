-- supabase/migrations/0027_dms_and_notifications.sql
-- ═══════════════════════════════════════════════════════════════
-- Private Direct Messages, In-App Notifications, and Channel Creation
-- ═══════════════════════════════════════════════════════════════

-- 1. Private Direct Messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  media_url   TEXT,
  media_type  TEXT, -- 'image', 'video', 'pdf', 'sticker'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read     BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own DMs" ON public.direct_messages;
CREATE POLICY "Users can select own DMs" ON public.direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert own DMs" ON public.direct_messages;
CREATE POLICY "Users can insert own DMs" ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable Realtime for direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- 2. In-App Notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL, -- 'chat_mention', 'private_message', 'event_update', 'sighting_status'
  target_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own notifications" ON public.user_notifications;
CREATE POLICY "Users can select own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert notifications allowed" ON public.user_notifications;
CREATE POLICY "Insert notifications allowed" ON public.user_notifications
  FOR INSERT WITH CHECK (true);

-- Enable Realtime for user_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- 3. Relax Channel Creation (Allow all authenticated users to create channels/groups)
DROP POLICY IF EXISTS "Only staff can create channels" ON public.community_channels;
CREATE POLICY "Authenticated users can create channels" ON public.community_channels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
