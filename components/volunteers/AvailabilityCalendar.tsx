'use client';
// components/volunteers/AvailabilityCalendar.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { setVolunteerAvailability } from '@/lib/actions/volunteers';

interface Props {
  readonly userId: string;
  readonly initialAvailability?: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityCalendar({ userId, initialAvailability = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeSlots, setActiveSlots] = useState<Set<string>>(() => {
    const set = new Set<string>();
    initialAvailability.forEach((slot) => {
      if (slot.is_active) {
        set.add(`${slot.day_of_week}-${slot.start_time}`);
      }
    });
    return set;
  });

  const [message, setMessage] = useState<string | null>(null);

  const toggleSlot = (dayIndex: number, timeStr: string) => {
    const key = `${dayIndex}-${timeStr}`;
    const newSlots = new Set(activeSlots);
    if (newSlots.has(key)) {
      newSlots.delete(key);
    } else {
      newSlots.add(key);
    }
    setActiveSlots(newSlots);

    // Auto-save changes using transition
    startTransition(async () => {
      const formData = new FormData();
      formData.append('day_of_week', String(dayIndex));
      formData.append('start_time', timeStr);
      formData.append('end_time', timeStr === '20:00' ? '23:59' : `${Number(timeStr.split(':')[0]) + 4}:00`);
      formData.append('is_active', String(!activeSlots.has(key)));

      const res = await setVolunteerAvailability(formData);
      if (res.success) {
        setMessage('Availability updated successfully');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to update availability');
      }
    });
  };

  // Time slots: Morning (08:00), Afternoon (12:00), Evening (16:00), Night (20:00)
  const TIME_SLOTS = ['08:00', '12:00', '16:00', '20:00'];

  return (
    <div className="relative border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Availability Grid</h3>
          <p className="text-xs text-gray-400 mt-1">Tap slots to set when you are available for rescue and TNR tasks.</p>
        </div>
        {isPending && <span className="text-xs text-[var(--life-teal)] animate-pulse">Saving...</span>}
        {message && <span className="text-xs text-[var(--empire-gold)]">{message}</span>}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-1"></div>
        {TIME_SLOTS.map((time) => (
          <div key={time} className="text-center text-xs font-semibold text-[var(--empire-cream)] opacity-60">
            {time}
          </div>
        ))}

        {DAYS.map((day, dayIndex) => (
          <div key={day} className="contents">
            <div className="text-xs font-bold text-[var(--empire-cream)] flex items-center py-2">
              {day}
            </div>
            {TIME_SLOTS.map((time) => {
              const key = `${dayIndex}-${time}`;
              const isActive = activeSlots.has(key);
              return (
                <button
                  key={time}
                  onClick={() => toggleSlot(dayIndex, time)}
                  disabled={isPending}
                  className={`h-12 rounded-xl transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-[var(--life-teal)] border-[var(--life-teal)] shadow-[0_0_12px_rgba(13,148,136,0.3)]'
                      : 'bg-black/40 border-white/5 hover:border-white/20'
                  }`}
                  aria-label={`Toggle availability for ${day} at ${time}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
