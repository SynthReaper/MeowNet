// app/maintenance/page.tsx — Beautiful Standalone Maintenance Page
'use client';

import { useState } from 'react';

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false);

  const handleRefresh = () => {
    setChecking(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  return (
    <div className="min-h-screen paw-pattern flex flex-col items-center justify-center p-6 bg-[var(--bg-void)] text-[var(--empire-cream)] select-none">
      {/* Maintenance Glassmorphic Card */}
      <div className="max-w-md w-full bg-white dark:bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(212,163,89,0.1)] flex flex-col items-center text-center gap-6 relative overflow-hidden backdrop-blur-md">
        
        {/* Decorative background glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--empire-gold)]/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[var(--life-amber)]/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Cute SVG Grooming Cat */}
        <div className="relative w-48 h-36 flex items-center justify-center mb-2">
          {/* Sparkles */}
          <svg width="24" height="24" viewBox="0 0 24 24" className="absolute top-2 right-4 fill-current text-[var(--empire-gold)] animate-pulse" style={{ animationDuration: '1.5s' }}>
            <path d="M12,2 L14.5,7.5 L20,10 L14.5,12.5 L12,18 L9.5,12.5 L4,10 L9.5,7.5 Z" />
          </svg>
          
          {/* Cleaning Cat with tools */}
          <svg width="120" height="120" viewBox="0 0 120 120" className="fill-current text-[var(--empire-gold)]">
            {/* Tail waving */}
            <path d="M90,85 Q105,75 102,60 Q98,50 92,58 Q88,65 85,75" stroke="var(--empire-gold)" strokeWidth="3" fill="none" strokeLinecap="round" className="animate-bounce" style={{ animationDuration: '2s' }} />
            
            {/* Body */}
            <ellipse cx="60" cy="85" rx="25" ry="20" fill="var(--bg-elevated)" stroke="var(--empire-gold)" strokeWidth="3" />
            
            {/* Head */}
            <circle cx="60" cy="50" r="22" fill="var(--bg-surface)" stroke="var(--empire-gold)" strokeWidth="3" />
            
            {/* Left Ear */}
            <path d="M42,38 L32,15 L52,28 Z" fill="var(--empire-gold)" />
            {/* Right Ear */}
            <path d="M78,38 L88,15 L68,28 Z" fill="var(--empire-gold)" />
            
            {/* Closed sleeping eyes */}
            <path d="M44,48 Q50,52 53,48" stroke="var(--empire-gold)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M67,48 Q70,52 76,48" stroke="var(--empire-gold)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            
            {/* Nose & Mouth */}
            <polygon points="60,55 57,51 63,51" fill="var(--empire-gold)" />
            <path d="M57,58 Q60,60 60,58 Q60,60 63,58" stroke="var(--empire-gold)" strokeWidth="1.5" fill="none" />
            
            {/* Whiskers */}
            <line x1="33" y1="52" x2="15" y2="50" stroke="var(--bg-border)" strokeWidth="1.5" />
            <line x1="33" y1="56" x2="12" y2="56" stroke="var(--bg-border)" strokeWidth="1.5" />
            <line x1="87" y1="52" x2="105" y2="50" stroke="var(--bg-border)" strokeWidth="1.5" />
            <line x1="87" y1="56" x2="108" y2="56" stroke="var(--bg-border)" strokeWidth="1.5" />
            
            {/* Tool / Wrench on Paw */}
            <path d="M48,103 L40,113 L36,109 L44,99" stroke="var(--empire-gold)" strokeWidth="2" fill="var(--bg-border)" />
            <circle cx="48" cy="103" r="6" fill="var(--bg-border)" stroke="var(--empire-gold)" strokeWidth="2" />
            <circle cx="72" cy="103" r="6" fill="var(--bg-border)" stroke="var(--empire-gold)" strokeWidth="2" />
          </svg>
        </div>

        {/* Maintenance Text Content */}
        <div className="space-y-3">
          <span className="bg-[#ffdcc5] dark:bg-[var(--bg-elevated)] text-[var(--empire-gold-dim)] dark:text-[var(--empire-gold)] px-3.5 py-1.5 rounded-full font-body text-xs font-extrabold uppercase tracking-widest border border-[var(--bg-border)]/40">
            System Grooming
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-[var(--empire-cream)] mt-1">
            Down for Grooming
          </h1>
          <p className="font-body text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
            MeowNet is temporarily taking a nap while we conduct vital systems grooming, database optimization, and feline inspections.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-3 w-full pt-2">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold py-3.5 rounded-xl shadow-ambient transition-all duration-300 flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-50"
          >
            {checking ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Checking Feline Signals...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">sync</span>
                <span>Refresh &amp; Check Signals</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Subtle brand footer */}
      <span className="text-[var(--empire-cream)]/20 font-body text-[10px] tracking-wider mt-8 uppercase font-bold">
        MeowNet by <a href="https://github.com/SynthReaper" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--empire-gold)] transition-colors">SynthReaper</a> — #hackthekitty 2026
      </span>
    </div>
  );
}
