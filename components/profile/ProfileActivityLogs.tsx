'use client';

// components/profile/ProfileActivityLogs.tsx — Interactive feed for Volunteer logs
import { useState } from 'react';

interface PointLogEntry {
  activity: string;
  points: number;
  created_at: string;
}

interface AuditLogEntry {
  action: string;
  details: string | null;
  created_at: string;
}

interface Props {
  recentPoints: PointLogEntry[];
  auditLogs: AuditLogEntry[];
}

export default function ProfileActivityLogs({ recentPoints, auditLogs }: Props) {
  const [activeTab, setActiveTab] = useState<'points' | 'audits'>('points');

  return (
    <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
      
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--bg-border)]/20 pb-3">
        <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
          <span>My Activity Ledger</span>
        </h2>
        
        {/* Toggle sliders */}
        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--bg-border)]/50 shrink-0">
          <button
            onClick={() => setActiveTab('points')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-none ${
              activeTab === 'points'
                ? 'bg-[var(--empire-gold)] text-white shadow-sm'
                : 'bg-transparent text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)]'
            }`}
          >
            XP History
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-none ${
              activeTab === 'audits'
                ? 'bg-[var(--empire-gold)] text-white shadow-sm'
                : 'bg-transparent text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)]'
            }`}
          >
            Security Audit
          </button>
        </div>
      </div>

      {/* Tab contents */}
      {activeTab === 'points' ? (
        recentPoints.length === 0 ? (
          <p className="font-body text-xs text-[var(--empire-cream)]/50 py-4 italic text-center">
            No XP transactions recorded yet.
          </p>
        ) : (
          <div className="flex flex-col max-h-[350px] overflow-y-auto pr-1">
            {recentPoints.map((log, i) => (
              <div 
                key={i} 
                className={`flex justify-between items-center py-3 ${
                  i < recentPoints.length - 1 ? 'border-b border-[var(--bg-border)]/40' : ''
                }`}
              >
                <div>
                  <div className="font-body text-xs font-bold text-[var(--empire-cream)] capitalize">
                    {log.activity.replace(/_/g, ' ').toLowerCase()}
                  </div>
                  <div className="font-body text-[10px] text-[var(--empire-cream)]/40 mt-0.5 font-semibold">
                    {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="font-data text-xs font-bold text-[var(--life-teal)]">
                  +{log.points} pts
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        auditLogs.length === 0 ? (
          <p className="font-body text-xs text-[var(--empire-cream)]/50 py-4 italic text-center">
            No system audit entries recorded.
          </p>
        ) : (
          <div className="flex flex-col max-h-[350px] overflow-y-auto pr-1 gap-2">
            {auditLogs.map((log, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/15 flex flex-col gap-1.5`}
              >
                <div className="flex justify-between items-start gap-4">
                  <span className="px-2 py-0.5 rounded bg-orange-950/20 border border-orange-850/40 text-[var(--empire-gold)] text-[8px] font-black uppercase tracking-wider">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="font-data text-[9px] text-[var(--empire-cream)]/35 font-semibold">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="font-body text-[11px] text-[var(--empire-cream)]/75 leading-relaxed">
                  {log.details || 'System event recorded successfully.'}
                </p>
              </div>
            ))}
          </div>
        )
      )}

    </div>
  );
}
