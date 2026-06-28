'use client';

// app/(app)/support/[id]/TicketChatWindowClient.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TicketChatWindow from '@/components/profile/TicketChatWindow';
import { createClient } from '@/lib/supabase/client';

interface Props {
  initialTicket: any;
  currentUserId: string;
  currentUserRole: 'admin' | 'moderator' | 'user';
}

export default function TicketChatWindowClient({ initialTicket, currentUserId, currentUserRole }: Props) {
  const [ticket, setTicket] = useState(initialTicket);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to changes on this ticket row (like new messages or status changes)
    const channel = supabase
      .channel(`support-ticket-realtime-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'moderator_queries',
          filter: `id=eq.${ticket.id}`
        },
        (payload: any) => {
          if (payload.new) {
            setTicket(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id]);

  const isStaff = currentUserRole === 'admin' || currentUserRole === 'moderator';

  return (
    <TicketChatWindow
      ticket={ticket}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      onUpdate={(updated) => setTicket(updated)}
      onBack={() => {
        if (isStaff) {
          router.push('/moderator');
        } else {
          router.push('/profile');
        }
      }}
    />
  );
}
