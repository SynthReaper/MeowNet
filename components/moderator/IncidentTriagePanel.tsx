'use client';
// components/moderator/IncidentTriagePanel.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { acknowledgeIncident, resolveIncident, dispatchVolunteer } from '@/lib/actions/emergency';

interface Incident {
  readonly id: string;
  readonly incident_type: string;
  readonly severity: string;
  readonly description: string;
  readonly status: string;
  readonly created_at: string;
}

interface Volunteer {
  readonly id: string;
  readonly display_name: string | null;
  readonly role: string;
}

interface Props {
  readonly incidents?: Incident[];
  readonly volunteers?: Volunteer[];
  readonly onUpdated?: () => void;
}

export default function IncidentTriagePanel({ incidents = [], volunteers = [], onUpdated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedVol, setSelectedVol] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleAcknowledge = (id: string) => {
    startTransition(async () => {
      const res = await acknowledgeIncident(id);
      if (res.success) {
        setMessage('Incident acknowledged');
        if (onUpdated) onUpdated();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to acknowledge');
      }
    });
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    startTransition(async () => {
      const res = await resolveIncident(selectedIncident.id, resolutionNotes);
      if (res.success) {
        setMessage('Incident resolved successfully');
        setResolutionNotes('');
        setSelectedIncident(null);
        if (onUpdated) onUpdated();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to resolve');
      }
    });
  };

  const handleDispatch = () => {
    if (!selectedIncident || !selectedVol) return;
    startTransition(async () => {
      const res = await dispatchVolunteer(selectedIncident.id, selectedVol);
      if (res.success) {
        setMessage('Volunteer successfully dispatched');
        setSelectedVol('');
        if (onUpdated) onUpdated();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(res.error || 'Failed to dispatch');
      }
    });
  };

  const openIncidents = incidents.filter((i) => i.status === 'open');
  const acknowledgedIncidents = incidents.filter((i) => i.status === 'acknowledged' || i.status === 'in_progress');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      {/* Queues */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Open Queue */}
        <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4">Unassigned Emergencies ({openIncidents.length})</h3>
          <div className="flex flex-col gap-3">
            {openIncidents.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 font-mono">No new emergency reports.</div>
            ) : (
              openIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 bg-black/40 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all ${
                    selectedIncident?.id === inc.id ? 'border-[var(--life-teal)]' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-red-400 uppercase font-mono">{inc.severity}</span>
                      <h4 className="text-xs font-bold text-[var(--empire-cream)]">{inc.incident_type.replace('_', ' ')}</h4>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{inc.description}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcknowledge(inc.id);
                    }}
                    disabled={isPending}
                    className="bg-[var(--life-teal)] text-white hover:opacity-90 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Acknowledge
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Queue */}
        <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--empire-gold)] uppercase tracking-wider mb-4">Active Rescues ({acknowledgedIncidents.length})</h3>
          <div className="flex flex-col gap-3">
            {acknowledgedIncidents.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 font-mono">No active rescue operations in progress.</div>
            ) : (
              acknowledgedIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 bg-black/40 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all ${
                    selectedIncident?.id === inc.id ? 'border-[var(--life-teal)]' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[var(--empire-gold)] uppercase font-mono">{inc.severity}</span>
                      <h4 className="text-xs font-bold text-[var(--empire-cream)]">{inc.incident_type.replace('_', ' ')}</h4>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{inc.description}</p>
                  </div>
                  <span className="text-[10px] bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    {inc.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Triage / Actions Panel */}
      <div className="lg:col-span-1">
        {selectedIncident ? (
          <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-6 sticky top-4">
            <div>
              <span className="text-[10px] font-black text-red-400 uppercase font-mono tracking-widest">{selectedIncident.severity} Severity</span>
              <h3 className="text-lg font-bold text-[var(--empire-cream)] mt-1">{selectedIncident.incident_type.replace('_', ' ')}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{selectedIncident.description}</p>
            </div>

            {/* Acknowledge or Dispatch action */}
            {selectedIncident.status === 'open' ? (
              <button
                onClick={() => handleAcknowledge(selectedIncident.id)}
                disabled={isPending}
                className="w-full bg-[var(--life-teal)] text-white hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Acknowledge &amp; Assign to Me
              </button>
            ) : (
              <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                {/* Dispatch */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Dispatch Responder</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedVol}
                      onChange={(e) => setSelectedVol(e.target.value)}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] outline-none"
                    >
                      <option value="">-- Select --</option>
                      {volunteers.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.display_name || 'Unnamed Volunteer'}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleDispatch}
                      disabled={isPending || !selectedVol}
                      className="bg-[var(--life-teal)] text-white hover:opacity-90 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                    >
                      Go
                    </button>
                  </div>
                </div>

                {/* Resolve */}
                <form onSubmit={handleResolve} className="flex flex-col gap-3 border-t border-white/5 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Resolution Notes</label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      required
                      placeholder="Detail veterinary results or release status..."
                      className="w-full h-20 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-[var(--empire-cream)] outline-none resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[var(--empire-gold)] text-black hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Resolve Incident
                  </button>
                </form>
              </div>
            )}

            {message && (
              <div className="text-center text-xs font-bold text-[var(--empire-gold)]">
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center text-xs text-gray-500 font-mono">
            Select an incident from the queues to deploy responders or resolve cases.
          </div>
        )}
      </div>
    </div>
  );
}
