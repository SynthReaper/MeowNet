'use client';
// components/empire/EmpireMetrics/index.tsx — Animated impact counters

import { useEffect, useRef } from 'react';

interface MetricCardProps { icon: string; label: string; value: number; color: string; bgColor: string; iconColor: string; }

function MetricCard({ icon, label, value, color, bgColor, iconColor }: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) { ref.current.textContent = value.toLocaleString(); return; }

    let current = 0;
    const duration = 1500;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      current = Math.min(current + step, value);
      if (ref.current) ref.current.textContent = Math.round(current).toLocaleString();
      if (current >= value) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-[var(--bg-border)] shadow-ambient flex flex-col justify-between group h-[160px] hover:shadow-[0_8px_24px_rgba(242,140,56,0.12)] transition-shadow">
      <div className="flex justify-between items-start">
        <div 
          className="p-3 rounded-xl flex items-center justify-center font-display font-semibold"
          style={{ backgroundColor: bgColor, color: iconColor }}
        >
          <span className="material-symbols-outlined font-normal" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
      </div>
      <div>
        <p 
          ref={ref} 
          className="font-display text-3xl font-extrabold text-[var(--empire-cream)]"
        >
          0
        </p>
        <p className="font-body text-xs font-semibold text-[var(--empire-cream)]/50 mt-1 uppercase tracking-wider">
          {label}
        </p>
      </div>
    </div>
  );
}

interface EmpireMetricsProps { totalCats: number; tnrCount: number; adoptedCount: number; volunteers: number; }

export default function EmpireMetrics({ totalCats, tnrCount, adoptedCount, volunteers }: EmpireMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard icon="pets" label="Cats Logged" value={totalCats} color="var(--life-teal)" bgColor="#8bf1e6" iconColor="#006f67" />
      <MetricCard icon="content_cut" label="Cats TNR'd" value={tnrCount} color="var(--status-tnr)" bgColor="#ffd9e1" iconColor="#79003a" />
      <MetricCard icon="home" label="Adopted" value={adoptedCount} color="var(--status-adoptable)" bgColor="#e8f5e9" iconColor="#2e7d32" />
      <MetricCard icon="groups" label="Volunteers" value={volunteers} color="var(--empire-gold)" bgColor="#ffdcc5" iconColor="#713700" />
    </div>
  );
}
