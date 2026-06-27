'use client';
// components/ui/FloatingActionButton/index.tsx
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FloatingActionButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <Link
      href="/cats/new"
      id="fab-log-cat"
      className="fab-bounce lg:hidden fixed bottom-20 right-6 z-[9990] flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-display font-bold text-xs uppercase tracking-wider shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:scale-105 transition-all"
      style={{ background: 'var(--empire-gold)', color: '#ffffff' }}
      aria-label="Log a cat sighting"
    >
      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
        pets
      </span>
      <span>Log Cat</span>
    </Link>
  );
}
