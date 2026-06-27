// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/events/page.tsx — TNR Events list
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'TNR Events',
  description: 'Find and join Trap-Neuter-Return events near you. Coordinate with local cat rescue volunteers.',
};

export const revalidate = 60;

interface TnrEvent {
  id: string; title: string; description: string | null;
  event_time: string; capacity: number; status: string; cats_tnrd_count: number;
}

export default async function EventsPage() {
  const supabase = await createServerClient();

  // Check auth state
  const { data: { user } } = await supabase.auth.getUser();
  const isSignedIn = !!user;

  const { data, error } = await supabase
    .from('tnr_events' as never)
    .select('id, title, description, event_time, capacity, status, cats_tnrd_count')
    .eq('status', 'open')
    .gte('event_time', new Date().toISOString())
    .order('event_time', { ascending: true })
    .limit(50);

  const events = (data ?? []) as TnrEvent[];

  // Split into featured and upcoming list
  const featuredEvent = events[0];
  const upcomingEvents = events.slice(1);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Header Section */}
      <section className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
            <span>TNR Event Coordination</span>
          </h1>
          <p className="font-body text-base text-[var(--empire-cream)]/70">
            Manage upcoming Trap-Neuter-Return operations, coordinate volunteers, and track community impact. Every paw counts.
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Link 
            href={isSignedIn ? "/events/new" : "/auth/login"}
            className="w-full md:w-auto bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold px-6 py-3.5 rounded-full shadow-ambient hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 no-underline transform active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Host an Event</span>
          </Link>
        </div>
      </section>

      {error ? (
        <div className="flex flex-col gap-6">
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl font-body text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">cloud_off</span>
            <span>Network Error: Failed to synchronize TNR events list. Please verify your connection or try reloading.</span>
          </div>
          {/* Empty boxes (skeletons) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[var(--bg-border)] shadow-ambient p-6 flex flex-col gap-4 h-[250px]">
                <div className="h-6 bg-zinc-200/50 w-3/4 rounded-md"></div>
                <div className="h-4 bg-zinc-200/50 w-full rounded-md"></div>
                <div className="h-4 bg-zinc-200/50 w-5/6 rounded-md"></div>
                <div className="mt-auto h-10 bg-zinc-100/50 w-1/3 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-ambient border border-[var(--bg-border)] text-center max-w-md mx-auto my-12">
          <div className="text-4xl mb-4">🐾</div>
          <h2 className="font-display text-xl text-[var(--empire-cream)] font-bold mb-2">No Upcoming Events</h2>
          <p className="font-body text-sm text-[var(--empire-cream)]/60 mb-6">No operations are scheduled right now. Be the first to host one!</p>
          <Link 
            href="/events/new"
            className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold px-6 py-3 rounded-full shadow-ambient no-underline inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Create First Event</span>
          </Link>
        </div>
      ) : (
        <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Featured Event (Spans 8 cols on lg) */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-6 relative overflow-hidden group hover:shadow-[0_8px_24px_rgba(242,140,56,0.12)] transition-shadow">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffdcc5]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="flex justify-between items-start z-10">
              <div className="bg-[#ffdcc5] text-[var(--empire-gold-dim)] font-body text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--empire-gold)] animate-pulse"></span>
                <span>Active Operation</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 z-10">
              <h2 className="font-display text-2xl font-bold text-[var(--empire-cream)]">
                {featuredEvent.title}
              </h2>
              {featuredEvent.description && (
                <p className="font-body text-sm text-[var(--empire-cream)]/70 leading-relaxed mb-2">
                  {featuredEvent.description}
                </p>
              )}
              
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--bg-border)]/40 font-body text-sm text-[var(--empire-cream)]/60">
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)] text-base">calendar_today</span>
                  <span>{new Date(featuredEvent.event_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)] text-base">schedule</span>
                  <span>{new Date(featuredEvent.event_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--empire-gold)] text-base">group</span>
                  <span>Volunteer Capacity: {featuredEvent.capacity} spots</span>
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--bg-border)]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[var(--bg-elevated)] flex items-center justify-center text-xs overflow-hidden">
                    👩
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[var(--bg-elevated)] flex items-center justify-center text-xs overflow-hidden">
                    👨
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[var(--bg-elevated)] flex items-center justify-center text-xs overflow-hidden">
                    🧑
                  </div>
                </div>
                <div className="font-body text-xs">
                  <span className="font-bold text-[#ab2c5d]">TNR volunteers joined</span>
                </div>
              </div>

              <Link 
                href={isSignedIn ? `/events/${featuredEvent.id}` : "/auth/login"}
                className="w-full sm:w-auto bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold px-6 py-3 rounded-full hover:shadow-ambient transition-all flex items-center justify-center gap-2 no-underline"
              >
                <span>Coordinate Details</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Upcoming Events List (Spans 4 cols on lg) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-[var(--empire-cream)] font-bold">Upcoming</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              {upcomingEvents.map((event, upcomingIdx) => {
                const date = new Date(event.event_time);
                const month = date.toLocaleDateString('en-US', { month: 'short' });
                const day = date.getDate();
                const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                const isRestricted = !isSignedIn && upcomingIdx >= 1;
                const href = isRestricted ? "/auth/login" : `/events/${event.id}`;

                return (
                  <Link key={event.id} href={href} className="no-underline block">
                    <div className="p-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)]/20 transition-all duration-200 cursor-pointer flex gap-4 border border-transparent hover:border-[var(--bg-border)]/40 relative overflow-hidden">
                      {isRestricted && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center gap-2 text-white font-body text-xs font-bold z-10">
                          <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                          <span>Sign In Required</span>
                        </div>
                      )}
                      
                      <div className={`flex gap-4 flex-grow ${isRestricted ? 'filter blur-[1px] opacity-35 select-none pointer-events-none' : ''}`}>
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#8bf1e6] text-[#006f67] flex-shrink-0">
                          <span className="font-body text-[10px] font-bold uppercase leading-none">{month}</span>
                          <span className="font-display text-lg font-bold leading-none mt-0.5">{day}</span>
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                          <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate leading-tight">
                            {event.title}
                          </h4>
                          <p className="font-body text-[10px] text-[var(--empire-cream)]/50 flex items-center gap-1 mt-1 font-semibold uppercase">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            <span>{time}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {upcomingEvents.length === 0 && (
                <div className="text-center py-6 text-[var(--empire-cream)]/40 font-body text-xs">
                  No other upcoming operations.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

