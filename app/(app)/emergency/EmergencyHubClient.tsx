'use client';
// app/(app)/emergency/EmergencyHubClient.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';
import dynamic from 'next/dynamic';
import IncidentReporter from '@/components/emergency/IncidentReporter';
import DispatchPanel from '@/components/emergency/DispatchPanel';
import EmergencyContactCard from '@/components/emergency/EmergencyContactCard';

const IncidentMap = dynamic(() => import('@/components/emergency/IncidentMap'), {
  ssr: false,
});

interface Props {
  readonly currentUserId: string;
  readonly userRole: string;
  readonly initialIncidents: any[];
  readonly initialContacts: any[];
  readonly volunteers: any[];
}

export default function EmergencyHubClient({
  currentUserId,
  userRole,
  initialIncidents,
  initialContacts,
  volunteers,
}: Props) {
  const [incidents, setIncidents] = useState<any[]>(initialIncidents);
  const [contacts, setContacts] = useState<any[]>(initialContacts);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  const refetchIncidents = async () => {
    try {
      const res = await fetch('/api/emergency/incidents');
      const data = await res.json();
      if (data.incidents) {
        setIncidents(data.incidents);
      }
    } catch {
      console.error('Failed to reload incidents');
    }
  };

  const isStaff = userRole === 'moderator' || userRole === 'admin';

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Emergency Crisis Center</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Deploy rescue operators, report critical cat injuries, track active disasters, and review emergency contacts.
        </p>
      </section>

      {/* Map Section */}
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Regional Incidents Map</h3>
        <IncidentMap incidents={incidents} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Report / Contacts */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <IncidentReporter onReported={refetchIncidents} />

          {/* Emergency Contacts */}
          <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[var(--empire-cream)]">Emergency Contacts</h3>
            <div className="flex flex-col gap-3">
              {contacts.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 font-mono">
                  No emergency contacts configured yet.
                </div>
              ) : (
                contacts.map((contact) => (
                  <EmergencyContactCard key={contact.id} contact={contact} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Incidents List / Dispatch */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Incident List */}
          <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[var(--empire-cream)]">Active Incidents</h3>
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
              {incidents.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-500 font-mono">No active crisis reports.</div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedIncident?.id === inc.id
                        ? 'bg-[var(--life-teal)]/10 border-[var(--life-teal)]'
                        : 'bg-black/40 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-400 block font-mono">
                          {inc.severity} Severity
                        </span>
                        <h4 className="text-sm font-bold text-[var(--empire-cream)] mt-0.5">
                          {inc.incident_type.replace('_', ' ')}
                        </h4>
                      </div>
                      <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase font-mono">
                        {inc.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {inc.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dispatch View (Staff Only) */}
          {isStaff && selectedIncident && (
            <DispatchPanel
              incidentId={selectedIncident.id}
              incidentType={selectedIncident.incident_type}
              severity={selectedIncident.severity}
              initialVolunteers={volunteers}
              onDispatched={() => {
                setSelectedIncident(null);
                refetchIncidents();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
