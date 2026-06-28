// app/(app)/support/[id]/page.tsx
import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import TicketChatWindowClient from './TicketChatWindowClient';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SupportTicketPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role, display_name')
    .eq('id', user.id)
    .single() as any;

  const role = profile?.role || 'user';

  // Fetch the support ticket
  const { data: ticket, error } = await supabase
    .from('moderator_queries' as never)
    .select('*')
    .eq('id', id)
    .single() as any;

  if (error || !ticket) {
    notFound();
  }

  // Authorize: user must be admin, moderator, or the owner of the ticket
  const isStaff = role === 'admin' || role === 'moderator';
  const isOwner = ticket.volunteer_id === user.id;

  if (!isStaff && !isOwner) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 md:py-12">
      <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 rounded-3xl p-6 md:p-8 shadow-card">
        <TicketChatWindowClient
          initialTicket={ticket}
          currentUserId={user.id}
          currentUserRole={role}
        />
      </div>
    </div>
  );
}
