'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function JudgeWelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [judgeType, setJudgeType] = useState<'volunteer' | 'submod' | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Prevent rendering in non-browser context
    if (typeof window === 'undefined') return;

    // Check if we've already shown this during the current browser tab session
    const hasShown = sessionStorage.getItem('meownet_judge_popup_shown');
    if (hasShown === 'true') return;

    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      if (email === 'judge-user@meownet.org') {
        setUserEmail(email);
        setJudgeType('volunteer');
        setIsOpen(true);
      } else if (email === 'judge-submod@meownet.org') {
        setUserEmail(email);
        setJudgeType('submod');
        setIsOpen(true);
      }
    };

    checkSession();
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('meownet_judge_popup_shown', 'true');
    setIsOpen(false);
  };

  if (!isOpen || !judgeType) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--empire-gold)]/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Decorative ambient gold glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--empire-gold)]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[var(--life-teal)]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4 select-none">
          <span className="material-symbols-outlined text-[var(--empire-gold)] text-3xl">workspace_premium</span>
          <div>
            <h3 className="font-display text-lg font-bold text-[var(--empire-cream)]">Judge Testing Session Active</h3>
            <p className="font-body text-[10px] text-[var(--empire-gold)] uppercase tracking-wider font-bold">Email: {userEmail}</p>
          </div>
        </div>

        <div className="space-y-4 font-body text-sm text-[var(--text-secondary)] leading-relaxed">
          {judgeType === 'volunteer' ? (
            <>
              <p>
                You are logged in as a <strong>Standard Volunteer</strong>. This account represents the primary tier of MeowNet users.
              </p>
              
              <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 space-y-2">
                <h4 className="font-display text-xs font-bold text-[var(--empire-cream)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-[var(--empire-gold)]">explore</span>
                  What to Test
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li><strong>Log Feline Sighting</strong>: Navigate to <em>Cats → Log New Cat</em>. Toggle the AI breed consent gate and upload a picture.</li>
                  <li><strong>EXIF GPS Stripping</strong>: Identifying metadata is stripped client-side automatically before save.</li>
                  <li><strong>Gamification Points</strong>: Perform actions (like signing up for a TNR event) and watch your score rise instantly on the <em>Empire Leaderboard</em>.</li>
                  <li><strong>Realtime Banners</strong>: Check the notices at the top of targeted pages.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <p>
                You are logged in as a <strong>Sub-Moderator</strong>. This account bridges volunteer capabilities with content moderation controls.
              </p>

              <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 space-y-2">
                <h4 className="font-display text-xs font-bold text-[var(--empire-cream)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-[var(--empire-gold)]">shield</span>
                  What to Test
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li><strong>Moderator Dashboard</strong>: Navigate to the <em>Moderator</em> portal in your navbar.</li>
                  <li><strong>Hotspots Map Moderation</strong>: Open the Leaflet map in the moderator panel, click any cat marker, and adjust verification status directly in the popup.</li>
                  <li><strong>Database Usage Guard</strong>: This account is constrained by a strict, database-enforced ceiling of <strong>max 20 edits</strong> to protect platform sanity.</li>
                </ul>
              </div>
            </>
          )}

          <p className="text-xs text-[var(--text-muted)] italic">
            Clerk email verification and OTP checks have been completely bypassed. You are signed in via Supabase Direct DB Auth.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white font-display font-bold text-sm px-6 py-3 rounded-2xl transition-all shadow-[var(--shadow-active)] cursor-pointer"
          >
            Start Testing
          </button>
        </div>
      </div>
    </div>
  );
}
