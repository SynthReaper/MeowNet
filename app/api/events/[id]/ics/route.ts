// app/api/events/[id]/ics/route.ts — ICS Calendar Invite generator for TNR Events
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: event, error } = await supabase
    .from('tnr_events' as never)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) {
    return new Response('Event not found', { status: 404 });
  }

  const title = (event as any).title ?? 'TNR Event';
  const description = (event as any).description ?? '';
  const timeStr = (event as any).event_time;
  
  const startDate = new Date(timeStr);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2-hour default duration
  
  const dtstamp = formatICSDate(new Date());
  const dtstart = formatICSDate(startDate);
  const dtend = formatICSDate(endDate);

  // Sanitise user-supplied strings: strip CR/LF to prevent ICS line injection,
  // then escape commas and semicolons per RFC-5545 section 3.3.11
  const sanitizeICS = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/[,;\\]/g, '\\$&');

  // Build standard RFC-5545 text payload
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SynthReaper//MeowNet//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}@meownet.org`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${sanitizeICS(title)}`,
    `DESCRIPTION:${sanitizeICS(description)}`,
    'LOCATION:MeowNet Colony Epicenter',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const icsText = icsLines.join('\r\n');

  return new Response(icsText, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="tnr-event-${id}.ics"`,
    },
  });
}
