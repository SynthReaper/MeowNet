// lib/gamification/points.ts — pure functions, no side effects, fully testable

export const POINT_VALUES = {
  CAT_LOGGED: 10,
  CAT_MARKED_TNR: 15,
  CAT_MARKED_ADOPTED: 25,
  EVENT_CREATED: 20,
  EVENT_SIGNUP: 5,
  EVENT_ATTENDED: 20,
  HEALTH_FLAGS_ADDED: 5,
  STREAK_BONUS: 15,
  LEND_A_PAW: 5,
  DAILY_TRIVIA: 10,
  BINGO_COMPLETED: 50,
  GUILD_QUEST_COMPLETED: 30,
  NEUTER_PROOF: 50,
  MEDICAL_LOG: 15,
  COLONY_DONATION: 0,
  TYCOON_CLAIM: 0,
  TYCOON_UPGRADE: 0,
  MEOW_TRANSLATION: 10,
} as const;

export type PointActivity = keyof typeof POINT_VALUES;

/**
 * Generates a deterministic, idempotent action key.
 * Prevents double-award on network retry — stored as UNIQUE in point_log.
 */
export function makeActionKey(userId: string, activity: PointActivity, relatedId?: string): string {
  return `${userId}:${activity}:${relatedId ?? 'none'}`;
}
