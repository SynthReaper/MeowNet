'use client';
// components/nav/Footer/index.tsx — Unified Premium Footer

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[var(--bg-surface)] border-t border-[var(--bg-border)]/40 mt-auto py-12 px-6 md:px-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/pet-logo.png"
              className="w-6 h-6 object-contain"
              alt="MeowNet Logo"
            />
            <span className="font-display text-lg text-[var(--empire-gold)] font-bold tracking-tight">MeowNet</span>
          </div>
          <p className="text-[var(--text-primary)]/60 font-body text-xs leading-relaxed max-w-xs">
            A collaborative mission-control platform dedicated to community cat welfare, TNR coordination, and local colony tracking.
          </p>
        </div>

        {/* Column 1: Map & Logs */}
        <div className="flex flex-col gap-3">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--empire-gold)]">Mission Control</h4>
          <nav className="flex flex-col gap-2">
            <Link href="/map" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Interactive Map</Link>
            <Link href="/cats" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Cat Logs</Link>
            <Link href="/colonies" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Cat Colonies</Link>
          </nav>
        </div>

        {/* Column 2: Community & Operations */}
        <div className="flex flex-col gap-3">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--empire-gold)]">Community</h4>
          <nav className="flex flex-col gap-2">
            <Link href="/events" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">TNR Campaigns</Link>
            <Link href="/stories" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Success Stories</Link>
            <Link href="/community" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Forums & DMs</Link>
          </nav>
        </div>

        {/* Column 3: Legal & Developers */}
        <div className="flex flex-col gap-3">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--empire-gold)]">Resources</h4>
          <nav className="flex flex-col gap-2">
            <Link href="/privacy" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Privacy Policy</Link>
            <Link href="/terms" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Terms of Service</Link>
            <Link href="/rules" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">Rules & Regulations</Link>
            <a href="https://github.com/SynthReaper/MeowNet" target="_blank" rel="noopener noreferrer" className="text-xs font-body text-[var(--text-primary)]/70 hover:text-[var(--empire-gold)] hover:translate-x-1 no-underline transition-all inline-block">GitHub Codebase</a>
          </nav>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[var(--bg-border)]/20 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-[var(--text-primary)]/40 font-body text-[10px] font-semibold">
          &copy; {new Date().getFullYear()} MeowNet. All rights reserved. Built with pride for community cats.
        </p>
        <p className="text-[var(--text-primary)]/40 font-body text-[10px] font-semibold">
          Created by <a href="https://github.com/SynthReaper" target="_blank" rel="noopener noreferrer" className="text-[var(--empire-gold)] font-bold hover:underline">SynthReaper</a> — #hackthekitty 2026
        </p>
      </div>
    </footer>
  );
}
