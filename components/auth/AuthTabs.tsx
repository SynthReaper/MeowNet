'use client';
// components/auth/AuthTabs.tsx — Sliding premium segment control for dual auth methods
import { useState, useEffect } from 'react';

interface Props {
  clerkForm: React.ReactNode;
  databaseForm: React.ReactNode;
  credentialsBlock?: React.ReactNode;
}

export default function AuthTabs({ clerkForm, databaseForm, credentialsBlock }: Props) {
  const [activeTab, setActiveTab] = useState<'clerk' | 'database'>('clerk');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('email') || params.has('password') || params.has('direct')) {
        setActiveTab('database');
      }
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Segmented Sliding Tab Control */}
      <div className="relative flex p-1 bg-[var(--bg-elevated)] border border-[var(--bg-border)]/60 rounded-2xl w-full max-w-[340px] mx-auto select-none shadow-inner z-10">
        <div 
          className="absolute top-1 bottom-1 rounded-xl shadow-md transition-all duration-300 ease-out"
          style={{
            left: activeTab === 'clerk' ? '4px' : 'calc(50% + 2px)',
            width: 'calc(50% - 6px)',
            backgroundColor: 'var(--empire-gold)'
          }}
        />
        <button
          type="button"
          onClick={() => setActiveTab('clerk')}
          className={`relative flex-1 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-xl ${
            activeTab === 'clerk' ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          🔐 Clerk Social
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`relative flex-1 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-xl ${
            activeTab === 'database' ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          🗄️ Database Direct
        </button>
      </div>

      {/* Slide / Fade Container */}
      <div className="w-full">
        {activeTab === 'clerk' ? (
          <div className="animate-fade-in" key="clerk-container">
            {clerkForm}
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col gap-5" key="database-container">
            <div key="db-form-wrapper">{databaseForm}</div>
            {credentialsBlock && <div key="credentials-block-wrapper">{credentialsBlock}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
