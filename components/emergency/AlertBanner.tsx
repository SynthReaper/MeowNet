'use client';
// components/emergency/AlertBanner.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface IncidentAlert {
  readonly id: string;
  readonly incident_type: string;
  readonly severity: string;
  readonly description: string;
  readonly created_at: string;
}

export default function AlertBanner() {
  const [activeAlerts, setActiveAlerts] = useState<IncidentAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 1. Fetch initial alerts
    const loadAlerts = async () => {
      try {
        const res = await fetch('/api/emergency/alerts');
        const data = await res.json();
        if (data.alerts) {
          setActiveAlerts(data.alerts);
        }
      } catch {
        console.error('Failed to load initial alerts');
      }
    };
    loadAlerts();

    // 2. Real-time subscription to active critical alerts
    const supabase = createClient();
    const channel = supabase
      .channel('realtime:incidents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const newIncident = payload.new as IncidentAlert;
          if (newIncident.severity === 'critical' || newIncident.severity === 'high') {
            setActiveAlerts((prev) => [newIncident, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
  };

  const visibleAlerts = activeAlerts.filter((a) => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  // Show the most recent alert
  const alert = visibleAlerts[0];

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-950/95 border-b border-red-500/50 backdrop-blur-lg px-6 py-4 shadow-2xl transition-all duration-500 animate-slide-in">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-red-500 text-2xl animate-pulse">warning</span>
          <div className="min-w-0">
            <span className="text-xs font-black text-red-400 uppercase tracking-widest block font-mono">
              {alert.severity} Alert: {alert.incident_type.replace('_', ' ')}
            </span>
            <p className="text-sm text-[var(--empire-cream)] truncate max-w-4xl mt-0.5">
              {alert.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/emergency"
            className="bg-red-500 text-white hover:bg-red-600 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all no-underline"
          >
            Dispatch Help
          </a>
          <button
            onClick={() => handleDismiss(alert.id)}
            className="text-gray-400 hover:text-white transition-all cursor-pointer"
            aria-label="Dismiss alert"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
