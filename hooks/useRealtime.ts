// hooks/useRealtime.ts — Supabase Realtime with exponential backoff reconnect

'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

export function useCatInserts(onNewCat: (payload: unknown) => void) {
  const supabase = createClient();
  const retries = useRef(0);
  const channel = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    function subscribe() {
      channel.current = supabase
        .channel('cat-inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cats' }, onNewCat)
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' && retries.current < MAX_RETRIES) {
            const delay = BACKOFF_BASE_MS * Math.pow(2, retries.current++);
            setTimeout(subscribe, delay);
          } else if (status === 'SUBSCRIBED') {
            retries.current = 0;
          }
        });
    }
    subscribe();
    return () => {
      if (channel.current) supabase.removeChannel(channel.current);
    };
  }, [supabase, onNewCat]);
}

export function useEventSignups(eventId: string, onSignup: (payload: unknown) => void) {
  const supabase = createClient();
  const channel = useRef<RealtimeChannel | null>(null);
  const retries = useRef(0);

  useEffect(() => {
    function subscribe() {
      channel.current = supabase
        .channel(`event-signups-${eventId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'event_signups', filter: `event_id=eq.${eventId}` },
          onSignup,
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' && retries.current < MAX_RETRIES) {
            setTimeout(subscribe, BACKOFF_BASE_MS * Math.pow(2, retries.current++));
          }
        });
    }
    subscribe();
    return () => {
      if (channel.current) supabase.removeChannel(channel.current);
    };
  }, [supabase, eventId, onSignup]);
}
