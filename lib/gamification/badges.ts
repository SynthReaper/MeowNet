// lib/gamification/badges.ts — Badge registry + unlock logic

export const BADGE_REGISTRY = [
  { id: 'first_sighting',  name: 'First Sighting',   icon: 'Eye',     rarity: 'common'    as const, threshold: 1,    activity: 'cat_logged'     },
  { id: 'cartographer',    name: 'Cartographer',      icon: 'Map',     rarity: 'rare'      as const, threshold: 25,   activity: 'cat_logged'     },
  { id: 'tnr_warrior',     name: 'TNR Warrior',       icon: 'Swords',  rarity: 'rare'      as const, threshold: 5,    activity: 'event_attended' },
  { id: 'adoption_angel',  name: 'Adoption Angel',    icon: 'Heart',   rarity: 'rare'      as const, threshold: 3,    activity: 'cat_adopted'    },
  { id: 'empire_founder',  name: 'Empire Founder',    icon: 'Crown',   rarity: 'legendary' as const, threshold: 500,  activity: 'total_points'   },
  { id: 'grand_overlord',  name: 'Grand Overlord',    icon: 'Star',    rarity: 'legendary' as const, threshold: 1000, activity: 'total_points'   },
] as const;

export type BadgeId = (typeof BADGE_REGISTRY)[number]['id'];
export type BadgeRarity = 'common' | 'rare' | 'legendary';

export const RARITY_COLORS: Record<BadgeRarity, string> = {
  common:    'var(--bg-border)',
  rare:      '#3B82F6',
  legendary: 'var(--empire-gold)',
};
