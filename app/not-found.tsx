// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/not-found.tsx — Custom 404 page

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen paw-pattern flex flex-col items-center justify-center p-6 bg-[var(--bg-void)] text-[var(--empire-cream)] select-none">
      {/* 404 Glassmorphic Card */}
      <div className="max-w-md w-full bg-white dark:bg-[var(--bg-surface)] border border-[var(--bg-border)]/60 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(242,140,56,0.1)] flex flex-col items-center text-center gap-6 relative overflow-hidden backdrop-blur-md">
        
        {/* Decorative background glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--empire-gold)]/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[var(--life-amber)]/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Cute SVG Lost Cat & Butterfly */}
        <div className="relative w-48 h-36 flex items-center justify-center mb-2">
          {/* Butterfly */}
          <svg width="24" height="24" viewBox="0 0 24 24" className="absolute top-2 right-4 fill-current text-[var(--empire-gold)] animate-bounce" style={{ animationDuration: '2.5s' }}>
            <path d="M12,10 C10,7 6,7 5,9 C4,11 6,13 12,16 C18,13 20,11 19,9 C18,7 14,7 12,10 Z M12,12 C11,13 9,15 9,15 C9,15 7,13 8,12 C9,11 11,11 12,12 Z" />
          </svg>
          
          {/* Confused/Lost Cat */}
          <svg width="120" height="120" viewBox="0 0 120 120" className="fill-current text-[var(--empire-gold)]">
            {/* Tail */}
            <path d="M90,85 Q105,75 102,60 Q98,50 92,58 Q88,65 85,75" stroke="var(--empire-gold)" strokeWidth="3" fill="none" strokeLinecap="round" className="animate-pulse" style={{ animationDuration: '2s' }} />
            
            {/* Body */}
            <ellipse cx="60" cy="85" rx="25" ry="20" fill="var(--bg-elevated)" stroke="var(--empire-gold)" strokeWidth="3" />
            
            {/* Head */}
            <circle cx="60" cy="50" r="22" fill="var(--bg-surface)" stroke="var(--empire-gold)" strokeWidth="3" />
            
            {/* Left Ear */}
            <path d="M42,38 L32,15 L52,28 Z" fill="var(--empire-gold)" />
            {/* Right Ear */}
            <path d="M78,38 L88,15 L68,28 Z" fill="var(--empire-gold)" />
            
            {/* Eyes looking up at the butterfly */}
            <ellipse cx="50" cy="46" rx="3.5" ry="5" fill="var(--empire-gold)" />
            <ellipse cx="70" cy="46" rx="3.5" ry="5" fill="var(--empire-gold)" />
            <circle cx="51.5" cy="44" r="1" fill="white" />
            <circle cx="71.5" cy="44" r="1" fill="white" />
            
            {/* Cat Nose & Mouth */}
            <polygon points="60,55 57,51 63,51" fill="var(--empire-gold)" />
            <path d="M57,58 Q60,60 60,58 Q60,60 63,58" stroke="var(--empire-gold)" strokeWidth="1.5" fill="none" />
            
            {/* Whiskers */}
            <line x1="33" y1="52" x2="15" y2="50" stroke="var(--bg-border)" strokeWidth="1.5" />
            <line x1="33" y1="56" x2="12" y2="56" stroke="var(--bg-border)" strokeWidth="1.5" />
            <line x1="87" y1="52" x2="105" y2="50" stroke="var(--bg-border)" strokeWidth="1.5" />
            <line x1="87" y1="56" x2="108" y2="56" stroke="var(--bg-border)" strokeWidth="1.5" />
            
            {/* Paws */}
            <circle cx="48" cy="103" r="6" fill="var(--bg-border)" stroke="var(--empire-gold)" strokeWidth="2" />
            <circle cx="72" cy="103" r="6" fill="var(--bg-border)" stroke="var(--empire-gold)" strokeWidth="2" />
          </svg>
        </div>

        {/* 404 Text Content */}
        <div className="space-y-3">
          <span className="bg-[#ffdcc5] dark:bg-[var(--bg-elevated)] text-[var(--empire-gold-dim)] dark:text-[var(--empire-gold)] px-3.5 py-1.5 rounded-full font-body text-xs font-extrabold uppercase tracking-widest border border-[var(--bg-border)]/40">
            404 — Cat-astrophe
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-[var(--empire-cream)] mt-1">
            Lost in the Empire
          </h1>
          <p className="font-body text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
            This page has wandered off, chased a laser pointer, or took a long nap. Let&apos;s guide you back to familiar territory!
          </p>
        </div>

        {/* Navigation Actions */}
        <div className="flex flex-col gap-3 w-full pt-2">
          <Link 
            href="/" 
            className="w-full bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold py-3.5 rounded-xl shadow-ambient transition-all duration-300 flex items-center justify-center gap-2 no-underline"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            <span>Return to Sanctuary</span>
          </Link>
          <div className="grid grid-cols-2 gap-3 w-full">
            <Link 
              href="/map" 
              className="bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-border)]/40 font-body text-xs font-bold py-3 rounded-xl border border-[var(--bg-border)]/50 no-underline transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-xs">map</span>
              <span>Mission Control</span>
            </Link>
            <Link 
              href="/events" 
              className="bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-border)]/40 font-body text-xs font-bold py-3 rounded-xl border border-[var(--bg-border)]/50 no-underline transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-xs">calendar_today</span>
              <span>TNR Events</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Subtle brand footer */}
      <span className="text-[var(--empire-cream)]/20 font-body text-[10px] tracking-wider mt-8 uppercase font-bold">
        MeowNet by <a href="https://github.com/SynthReaper" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--empire-gold)] transition-colors">SynthReaper</a> — #hackthekitty 2026
      </span>
    </div>
  );
}
