'use client';
// components/emergency/DispatchPanel.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { dispatchVolunteer } from '@/lib/actions/emergency';

interface Volunteer {
  readonly id: string;
  readonly display_name: string;
  readonly role: string;
  readonly distance_km?: number;
}

interface Props {
  readonly incidentId: string;
  readonly incidentType: string;
  readonly severity: string;
  readonly initialVolunteers?: Volunteer[];
  readonly onDispatched?: () => void;
}

export default function DispatchPanel({
  incidentId,
  incidentType,
  severity,
  initialVolunteers = [],
  onDispatched,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [volunteers] = useState<Volunteer[]>(initialVolunteers);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  const handleDispatch = () => {
    if (!selectedVolunteer) return;
    startTransition(async () => {
      const res = await dispatchVolunteer(incidentId, selectedVolunteer);
      if (res.success) {
        setMessage('Volunteer successfully dispatched to incident!');
        setTimeout(() => {
          setMessage(null);
          if (onDispatched) onDispatched();
        }, 3000);
      } else {
        setMessage(res.error || 'Failed to dispatch volunteer');
      }
    });
  };

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl w-full">
      <h3 className="text-lg font-bold text-[var(--empire-cream)] mb-2">Operational Dispatch</h3>
      <p className="text-xs text-gray-400 mb-6">
        Select and deploy a volunteer to respond to the logged {severity} {incidentType.replace('_', ' ')} incident.
      </p>

      {volunteers.length === 0 ? (
        <div className="text-center py-6 text-xs text-gray-500 font-mono">
          No nearby verified volunteers found with matching skills.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Available Responders</label>
            <select
              value={selectedVolunteer}
              onChange={(e) => setSelectedVolunteer(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
            >
              <option value="">-- Choose Responder --</option>
              {volunteers.map((vol) => (
                <option key={vol.id} value={vol.id}>
                  {vol.display_name} ({vol.role}) {vol.distance_km ? `- ${vol.distance_km}km away` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDispatch}
            disabled={isPending || !selectedVolunteer}
            className="w-full bg-[var(--life-teal)] text-white hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? 'Deploying...' : 'Deploy Responder'}
          </button>

          {message && (
            <div className="text-center text-xs font-bold text-[var(--empire-gold)] mt-2">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
