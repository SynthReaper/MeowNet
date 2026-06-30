-- supabase/migrations/0022_community_channels.sql
-- ═══════════════════════════════════════════════════════════════
-- Community Channels, Reactions & Channel Membership
-- ═══════════════════════════════════════════════════════════════

-- 1. Channels (like Slack channels / Reddit sub-communities)
CREATE TABLE IF NOT EXISTS public.community_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,          -- e.g. 'general', 'tnr-ops'
  name        TEXT NOT NULL,                 -- display name
  description TEXT,
  icon        TEXT DEFAULT 'forum',          -- material icon name
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are public" ON public.community_channels
  FOR SELECT USING (true);

CREATE POLICY "Only staff can create channels" ON public.community_channels
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

CREATE POLICY "Only staff can update channels" ON public.community_channels
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- 2. Add channel_id to community_messages
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parent_id  UUID REFERENCES public.community_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMPTZ;

-- 3. Emoji reactions
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are public" ON public.community_reactions
  FOR SELECT USING (true);

CREATE POLICY "Auth users can react" ON public.community_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.community_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Seed default channels
INSERT INTO public.community_channels (slug, name, description, icon) VALUES
  ('general',      'General',       'Open discussion for everyone',                    'forum'),
  ('tnr-ops',      'TNR Ops',       'Coordinate Trap-Neuter-Return operations',         'content_cut'),
  ('cat-sightings','Cat Sightings', 'Share and confirm stray cat sightings',            'pets'),
  ('rescue',       'Rescue Help',   'Emergency rescue coordination and support',        'emergency'),
  ('resources',    'Resources',     'Food drives, supplies, vet contacts, and grants',  'volunteer_activism'),
  ('off-topic',    'Off Topic',     'Casual chat and cat pics 🐾',                     'mood')
ON CONFLICT (slug) DO NOTHING;
