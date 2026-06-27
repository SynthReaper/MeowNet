'use client';
// components/empire/BadgeDisplay/index.tsx

import { BADGE_REGISTRY, RARITY_COLORS, type BadgeRarity } from '@/lib/gamification/badges';

interface BadgeDisplayProps {
  badges: typeof BADGE_REGISTRY;
  earnedBadgeIds: string[];
}

const ICON_MAP: Record<string, string> = {
  Eye: 'visibility',
  Map: 'map',
  Swords: 'shield',
  Heart: 'favorite',
  Crown: 'workspace_premium',
  Star: 'stars',
};

const RARITY_BG: Record<BadgeRarity, string> = {
  common: '#f1ede7',
  rare: '#e3f2fd',
  legendary: '#ffdcc5',
};

const RARITY_TEXT: Record<BadgeRarity, string> = {
  common: '#887365',
  rare: '#0d47a1',
  legendary: '#713700',
};

export default function BadgeDisplay({ badges, earnedBadgeIds }: BadgeDisplayProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
      <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined font-normal">military_tech</span>
        <span>Guardian Achievements</span>
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        {badges.map((badge) => {
          const earned = earnedBadgeIds.includes(badge.id);
          const rarityColor = RARITY_COLORS[badge.rarity as BadgeRarity];
          const bgTheme = RARITY_BG[badge.rarity as BadgeRarity];
          const textTheme = RARITY_TEXT[badge.rarity as BadgeRarity];
          const iconName = ICON_MAP[badge.icon] || 'military_tech';
          
          return (
            <div
              key={badge.id}
              title={`${badge.name}: ${badge.rarity} achievement`}
              className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                earned 
                  ? 'bg-white border-[var(--bg-border)] shadow-sm' 
                  : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/30 opacity-40'
              }`}
            >
              {/* Badge Icon */}
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform duration-200"
                style={{ 
                  backgroundColor: earned ? bgTheme : 'rgba(0,0,0,0.05)', 
                  color: earned ? textTheme : 'rgba(0,0,0,0.3)' 
                }}
              >
                <span className="material-symbols-outlined text-2xl font-normal" style={{ fontVariationSettings: earned ? "'FILL' 1" : "'FILL' 0" }}>
                  {earned ? iconName : 'lock'}
                </span>
              </div>

              {/* Badge Info */}
              <div className="font-body text-xs font-bold text-[var(--empire-cream)] mb-0.5 leading-snug">
                {badge.name}
              </div>
              
              <div 
                className="font-body text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ 
                  backgroundColor: earned ? `${rarityColor}20` : 'transparent', 
                  color: earned ? rarityColor : 'rgba(0,0,0,0.3)' 
                }}
              >
                {badge.rarity}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
