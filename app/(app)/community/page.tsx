// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/community/page.tsx — Server entry point for Community Hub

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getCommunityMessages, getCommunityChannels } from '@/lib/actions/community';
import CommunityClient from './CommunityClient';

export const metadata: Metadata = {
  title: 'Community | MeowNet',
  description: "Chat, plan rescues, and coordinate with other cat guardians in MeowNet's community hub.",
};

export const dynamic = 'force-dynamic';

export default async function CommunityPage() {
  const supabase = await createServerClient();

  let user = null;
  let userProfile: { role: string; displayName: string | null; avatarUrl: string | null; activeBadgeId: string | null; customTitle: string | null } = {
    role: 'user',
    displayName: null,
    avatarUrl: null,
    activeBadgeId: null,
    customTitle: null,
  };

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles' as never)
        .select('role, display_name, avatar_url, active_badge_id, custom_title')
        .eq('id', user.id)
        .single() as {
          data: {
            role: string | null;
            display_name: string | null;
            avatar_url: string | null;
            active_badge_id: string | null;
            custom_title: string | null;
          } | null;
        };

      if (profile) {
        userProfile = {
          role: profile.role ?? 'user',
          displayName: profile.display_name ?? null,
          avatarUrl: profile.avatar_url ?? null,
          activeBadgeId: profile.active_badge_id ?? null,
          customTitle: profile.custom_title ?? null,
        };
      }
    } catch {
      // keep defaults
    }
  }

  const [initialMessages, initialChannels] = await Promise.all([
    getCommunityMessages(),
    getCommunityChannels(),
  ]);

  return (
    <CommunityClient
      initialMessages={initialMessages}
      initialChannels={initialChannels}
      isSignedIn={!!user}
      currentUser={
        user
          ? {
              id: user.id,
              role: userProfile.role,
              displayName: userProfile.displayName ?? user.email?.split('@')[0] ?? 'Volunteer',
              avatarUrl: userProfile.avatarUrl,
              activeBadgeId: userProfile.activeBadgeId,
              customTitle: userProfile.customTitle,
            }
          : null
      }
    />
  );
}
