'use client';
// components/empire/EmpireCodex/index.tsx — Interactive handbook for community guidelines, roles, and badge requirements

import { useState } from 'react';

interface CodexBadge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  threshold: number;
  activity: string;
}

const BADGE_CRITERIA_LIST: CodexBadge[] = [
  { id: 'first_sighting',  name: 'First Sighting',   icon: 'visibility',       rarity: 'common',    threshold: 1,    activity: 'cat sighting logged' },
  { id: 'cartographer',    name: 'Cartographer',      icon: 'map',              rarity: 'rare',      threshold: 25,   activity: 'cat sightings logged' },
  { id: 'tnr_warrior',     name: 'TNR Warrior',       icon: 'content_cut',      rarity: 'rare',      threshold: 5,    activity: 'TNR events attended' },
  { id: 'adoption_angel',  name: 'Adoption Angel',    icon: 'favorite',         rarity: 'rare',      threshold: 3,    activity: 'cats marked adopted' },
  { id: 'empire_founder',  name: 'Empire Founder',    icon: 'shield_with_heart',rarity: 'legendary', threshold: 500,  activity: 'total Karma points earned' },
  { id: 'grand_overlord',  name: 'Grand Overlord',    icon: 'workspace_premium',rarity: 'legendary', threshold: 1000, activity: 'total Karma points earned' },
];

const ROLES_LIST = [
  {
    title: 'Volunteer / Sighter (Standard)',
    icon: 'pets',
    color: 'text-[var(--empire-gold)] bg-[#ffdcc5]/30 border-[var(--empire-gold)]/20',
    description: 'Every new user starts here to support community colony health.',
    powers: [
      'Pinpoint stray cat locations on the interactive map.',
      'Log photos, health notes, sterilized statuses, and microchips.',
      'Lend a Paw by pledging food, water, or temporary fostering.',
      'Earn Karma points to rank up the weekly leaderboard.'
    ],
    criteria: 'Automatically assigned upon creating a MeowNet account.'
  },
  {
    title: 'Colony Moderator (Staff)',
    icon: 'gavel',
    color: 'text-[#ab2c5d] bg-[#ffd9e1]/50 border-[#ab2c5d]/20',
    description: 'Trusted advocates keeping data accurate and coordinating care.',
    powers: [
      'Verify and approve cat logs submitted by volunteers.',
      'Moderate active Community Care Funds and point distributions.',
      'Edit or correct fuzzed location coordinates for TNR operations.',
      'Flag duplicate sightings or invalid health diagnoses.'
    ],
    criteria: 'Earn 500+ total Karma points AND apply through our community coordinator review.'
  }
];

const RANKS_LIST = [
  {
    title: 'Recruit Scout',
    points: '0 - 99 pts',
    icon: 'star_half',
    desc: 'Default entry rank for all community members. Get started by logging your first sighting!'
  },
  {
    title: 'Colony Mapper',
    points: '100 - 499 pts',
    icon: 'map',
    desc: 'Assigned to active sighters who map feline territories and colonies.'
  },
  {
    title: 'Colony Protector',
    points: '500 - 999 pts',
    icon: 'shield',
    desc: 'Awarded to volunteers who manage care checklists and participate in TNR support.'
  },
  {
    title: 'Neighborhood Guardian',
    points: '1000+ pts',
    icon: 'workspace_premium',
    desc: 'Top-tier rank for veteran rescuers coordinating regional care operations and community funds.'
  }
];

const RULES_LIST = [
  {
    title: 'Protect Colony Privacy First',
    icon: 'shield',
    desc: 'Never post precise GPS locations of vulnerable stray colonies unless coordinating active rescue. Choose the "Area" privacy option to fuzz coordinates server-side to a 500m grid.'
  },
  {
    title: 'No Double-Logging',
    icon: 'find_replace',
    desc: 'Verify if a street cat has already been mapped by searching nearby markers on the map first. Duplicate entries distort colony population tracking.'
  },
  {
    title: 'Honor Your Pledges',
    icon: 'handshake',
    desc: 'Only pledge food, TNR trap assistance, or foster support if you can follow through. Local rescuers count on active pledges to plan trapping schedules.'
  },
  {
    title: 'RespectEXIF Privacy Protocols',
    icon: 'photo_camera',
    desc: 'MeowNet automatically strips GPS EXIF metadata from uploaded cat pictures to keep colony locations safe. Do not manually share photo coordinates in text summaries.'
  }
];

export default function EmpireCodex() {
  const [activeTab, setActiveTab] = useState<'roles' | 'badges' | 'rules'>('roles');

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-6 text-[var(--empire-cream)] mt-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[var(--empire-gold)] flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl icon-fill" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
          <span>MeowNet Codex & Handbook</span>
        </h2>
        <p className="font-body text-sm text-[var(--empire-cream)]/60">Learn about our ecosystem roles, badge rewards, and volunteer regulations.</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[var(--bg-border)]/20 p-1 bg-[var(--bg-elevated)] rounded-xl w-full max-w-md">
        <button 
          onClick={() => setActiveTab('roles')}
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg font-body text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'roles' 
              ? 'bg-white text-[var(--empire-gold)] shadow-sm' 
              : 'text-[var(--empire-cream)]/60 hover:bg-white/30'
          }`}
        >
          Roles & Ranks
        </button>
        <button 
          onClick={() => setActiveTab('badges')}
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg font-body text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'badges' 
              ? 'bg-white text-[var(--empire-gold)] shadow-sm' 
              : 'text-[var(--empire-cream)]/60 hover:bg-white/30'
          }`}
        >
          Badge Criteria
        </button>
        <button 
          onClick={() => setActiveTab('rules')}
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg font-body text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'rules' 
              ? 'bg-white text-[var(--empire-gold)] shadow-sm' 
              : 'text-[var(--empire-cream)]/60 hover:bg-white/30'
          }`}
        >
          Rules & Regulations
        </button>
      </div>

      {/* Tab content area */}
      <div className="mt-2 animate-in fade-in-50 duration-200">
        {/* ROLES & RANKS TAB */}
        {activeTab === 'roles' && (
          <div className="flex flex-col gap-6">
            {/* Roles Section */}
            <div>
              <h3 className="font-display text-sm font-bold text-[var(--empire-gold)] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">groups</span>
                <span>Ecosystem Roles</span>
              </h3>
              <div className="flex flex-col gap-4">
                {ROLES_LIST.map((role, idx) => (
                  <div 
                    key={idx} 
                    className="p-5 rounded-2xl border border-[var(--bg-border)]/30 bg-[var(--bg-elevated)] flex flex-col md:flex-row md:items-start gap-4 hover:shadow-ambient transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${role.color}`}>
                      <span className="material-symbols-outlined text-2xl font-bold">{role.icon}</span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-display text-base font-bold text-[var(--empire-cream)] mb-1">{role.title}</h3>
                      <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-3">{role.description}</p>
                      
                      <div className="mb-3">
                        <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--life-teal)]">Authorized Powers</span>
                        <ul className="list-disc pl-5 font-body text-xs text-[var(--empire-cream)]/80 mt-1 space-y-1">
                          {role.powers.map((pow, pIdx) => (
                            <li key={pIdx}>{pow}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-[var(--bg-border)]/15">
                        <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--empire-gold)]">Access Criteria: </span>
                        <span className="font-body text-xs text-[var(--empire-cream)]/75">{role.criteria}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranks Section */}
            <div className="border-t border-[var(--bg-border)]/20 pt-6 mt-2">
              <h3 className="font-display text-sm font-bold text-[var(--empire-gold)] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">military_tech</span>
                <span>Karma Rank Progression</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RANKS_LIST.map((rank, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-[var(--bg-border)]/20 bg-[var(--bg-elevated)] flex items-start gap-3 hover:bg-[var(--bg-border)]/5 transition-all"
                  >
                    <span className="w-9 h-9 rounded-lg bg-[#ffdcc5]/40 border border-[var(--empire-gold)]/20 flex items-center justify-center shrink-0 text-[var(--empire-gold)]">
                      <span className="material-symbols-outlined text-lg">{rank.icon}</span>
                    </span>
                    <div>
                      <div className="flex justify-between items-baseline gap-2 mb-0.5">
                        <h4 className="font-display text-sm font-bold text-[var(--empire-cream)]">{rank.title}</h4>
                        <span className="font-data text-[10px] font-bold text-[var(--life-teal)]">{rank.points}</span>
                      </div>
                      <p className="font-body text-xs text-[var(--empire-cream)]/60 leading-normal">{rank.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BADGE_CRITERIA_LIST.map((badge) => (
              <div 
                key={badge.id}
                className="p-4 rounded-xl border border-[var(--bg-border)]/20 bg-[var(--bg-elevated)] flex items-start gap-3 hover:bg-[var(--bg-border)]/5 transition-all"
              >
                <span 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm shrink-0 border ${
                    badge.rarity === 'legendary' 
                      ? 'bg-[#ffdcc5] text-[var(--empire-gold)] border-[var(--empire-gold)]/30' 
                      : badge.rarity === 'rare' 
                        ? 'bg-[#8bf1e6]/30 text-[var(--life-teal)] border-[var(--life-teal)]/20' 
                        : 'bg-white text-[var(--empire-cream)]/60 border-[var(--bg-border)]/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{badge.icon}</span>
                </span>
                <div>
                  <h4 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-0.5">{badge.name}</h4>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`font-body text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      badge.rarity === 'legendary' 
                        ? 'bg-[var(--empire-gold)] text-white' 
                        : badge.rarity === 'rare' 
                          ? 'bg-[var(--life-teal)] text-white' 
                          : 'bg-[var(--bg-border)] text-[var(--empire-cream)]/70'
                    }`}>
                      {badge.rarity}
                    </span>
                  </div>
                  <p className="font-body text-xs text-[var(--empire-cream)]/60 leading-normal">
                    Earned by accumulating <strong className="text-[var(--empire-cream)] font-bold">{badge.threshold}</strong> {badge.activity}.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RULES_LIST.map((rule, idx) => (
              <div 
                key={idx} 
                className="p-5 rounded-2xl border border-[var(--bg-border)]/30 bg-[var(--bg-elevated)] flex gap-3.5 hover:shadow-ambient transition-all duration-300"
              >
                <span className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-[var(--empire-gold)]">
                  <span className="material-symbols-outlined text-lg font-bold">{rule.icon}</span>
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-1">{rule.title}</h3>
                  <p className="font-body text-xs text-[var(--empire-cream)]/60 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
