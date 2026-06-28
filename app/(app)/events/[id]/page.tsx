// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/events/[id]/page.tsx — Event detail + signup
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import EventSignupButton from '@/components/events/EventSignupButton';

export const revalidate = 60;

interface TnrEventDetail {
  id: string; title: string; description: string | null; event_time: string;
  capacity: number; status: string; cats_tnrd_count: number; organizer_id: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase.from('tnr_events' as never).select('title').eq('id', id).single();
  const ev = data as { title: string } | null;
  return { title: ev ? `✂️ ${ev.title}` : 'TNR Event' };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const [eventRes, userRes] = await Promise.all([
    supabase.from('tnr_events' as never)
      .select('*')
      .eq('id', id)
      .single()
      .then((res: any) => res, () => ({ data: null, error: true })),
    supabase.auth.getUser(),
  ]);

  if ((eventRes as any).error || !(eventRes as any).data) notFound();
  const eventData = (eventRes as any).data;

  const userId = userRes.data.user?.id;
  if (!userId) {
    redirect('/auth/login');
  }

  // Fetch organizer profile separately to avoid missing foreign key relation in schema cache
  let profile = null;
  if (eventData.organizer_id) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles' as never)
      .select('display_name, avatar_url')
      .eq('id', eventData.organizer_id)
      .single();
    if (!profileError) {
      profile = profileData;
    }
  }

  const event: TnrEventDetail = {
    ...eventData,
    profiles: profile,
  };

  // Check if already signed up
  let isSignedUp = false;
  let signupCount = 0;
  if (userId) {
    const [signupRes, countRes] = await Promise.all([
      supabase.from('event_signups' as never).select('id').eq('event_id', id).eq('user_id', userId).single(),
      supabase.from('event_signups' as never).select('id', { count: 'exact', head: true }).eq('event_id', id),
    ]);
    isSignedUp = !!signupRes.data;
    signupCount = (countRes as { count: number | null }).count ?? 0;
  }

  const eventDate = new Date(event.event_time);
  const isPast = eventDate < new Date();
  const spotsLeft = event.capacity - signupCount;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <Link href="/events" className="inline-flex items-center gap-2 text-[var(--empire-gold)] hover:text-[#e6b020] font-body text-sm font-semibold transition-colors no-underline">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to TNR Events</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-grow">
            <span className={`px-2.5 py-1 rounded-full font-body text-[10px] font-bold uppercase tracking-wider ${
              isPast 
                ? 'bg-red-50 text-[#ba1a1a] border border-red-200' 
                : 'bg-[#ffdcc5] text-[var(--empire-gold-dim)] border border-[var(--bg-border)]/40'
            }`}>
              {isPast ? 'Past Operation' : event.status === 'open' ? 'Active Operation' : event.status}
            </span>
            <h1 className="font-display text-2xl font-extrabold text-[var(--empire-cream)] mt-3">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--empire-cream)]/50 mt-2">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">calendar_today</span>
                <span>{eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">schedule</span>
                <span>{eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <a
                href={`/api/events/${event.id}/ics`}
                download
                className="flex items-center gap-1 text-[var(--life-teal)] hover:text-teal-700 transition-colors no-underline font-bold text-xs"
              >
                <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                <span>Add to Calendar</span>
              </a>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="pt-2">
          <div className="flex justify-between font-body text-xs font-semibold text-[var(--empire-cream)]/60 mb-2">
            <span>👥 {signupCount} / {event.capacity} volunteers signed up</span>
            {!isPast && spotsLeft > 0 && (
              <span className={spotsLeft <= 3 ? 'text-[#ba1a1a]' : 'text-[var(--life-teal)]'}>
                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
              </span>
            )}
            {spotsLeft <= 0 && !isPast && <span className="text-[#ba1a1a]">Full capacity</span>}
          </div>
          <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--bg-border)]/20">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{
                width: `${Math.min((signupCount / event.capacity) * 100, 100)}%`,
                backgroundColor: spotsLeft <= 3 ? '#ba1a1a' : 'var(--life-teal)',
              }}
            />
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="pt-4 border-t border-[var(--bg-border)]/40 flex flex-col gap-2">
            <h2 className="font-display text-sm font-bold text-[var(--empire-cream)]">About this Operation</h2>
            <p className="font-body text-sm text-[var(--empire-cream)]/70 leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* Impact */}
        {event.cats_tnrd_count > 0 && (
          <div className="bg-[#e8f5e9] border border-green-200 rounded-xl p-4 text-center">
            <div className="font-display text-2xl font-extrabold text-[#2e7d32]">
              {event.cats_tnrd_count}
            </div>
            <div className="font-body text-xs text-[var(--empire-cream)]/70 font-semibold mt-0.5">Cats safely TNR&apos;d at this event</div>
          </div>
        )}

        {/* Organizer */}
        {event.profiles && (
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 rounded-xl mt-2">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-border)]/30 overflow-hidden flex-shrink-0 flex items-center justify-center border border-[var(--bg-border)]/50">
              {event.profiles.avatar_url ? (
                <img src={event.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">🐱</span>
              )}
            </div>
            <div>
              <div className="font-body text-[10px] text-[var(--empire-cream)]/50 font-bold uppercase tracking-wider">Operation Coordinator</div>
              <div className="font-body text-xs font-bold text-[var(--empire-cream)]">{event.profiles.display_name ?? 'Anonymous Rescuer'}</div>
            </div>
          </div>
        )}

        {/* Signup Action */}
        <div className="pt-4 border-t border-[var(--bg-border)]/40">
          {!isPast && userId && (
            <EventSignupButton
              eventId={id}
              isSignedUp={isSignedUp}
              isFull={spotsLeft <= 0 && !isSignedUp}
            />
          )}
          {!userId && !isPast && (
            <Link 
              href="/auth/login" 
              className="w-full bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold py-3.5 rounded-full shadow-ambient flex items-center justify-center gap-2 no-underline transform active:scale-95 transition-all"
            >
              <span>Sign In to RSVP (+20 pts)</span>
              <span className="material-symbols-outlined text-sm">login</span>
            </Link>
          )}
          {isPast && (
            <div className="text-center text-[var(--empire-cream)]/40 font-body text-xs font-semibold py-2">
              This operation has been completed. Thanks to all volunteer guardians who assisted!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
