'use server';
// lib/actions/gamification.ts — Server Actions for Stray Bingo, Educational Trivia, Volunteer Guilds, and Colony Tycoon

import { revalidatePath } from 'next/cache';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { makeActionKey } from '@/lib/gamification/points';
import { TRIVIA_QUESTIONS } from '@/lib/gamification/trivia';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// ── TYPES & INTERFACES ───────────────────────────────────────────────────────

export interface TriviaStats {
  id: string;
  user_id: string;
  current_streak: number;
  max_streak: number;
  total_correct: number;
  total_played: number;
  last_played_at: string | null;
}

export interface BingoCard {
  id: string;
  user_id: string;
  week_start: string;
  squares: Array<{ label: string; type: string; completed: boolean }>;
  completed_squares: number;
  is_bingo_achieved: boolean;
}

export interface Sanctuary {
  id: string;
  user_id: string;
  name: string;
  level: number;
  point_multiplier: number;
  idle_points_rate: number;
  last_claimed_at?: string | null;
}

export interface Upgrade {
  id: string;
  sanctuary_id: string;
  upgrade_type: 'shelter_bed' | 'kibble_feeder' | 'first_aid' | 'play_area';
  level: number;
  cost_points: number;
  purchased_at?: string;
}

export interface Guild {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  points: number;
  member_count?: number;
}

export interface GuildQuest {
  id: string;
  guild_id: string;
  title: string;
  description: string | null;
  target_points: number;
  current_points: number;
  is_completed: boolean;
}

// Helper to check user session
async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ── DAILY TRIVIA ─────────────────────────────────────────────────────────────

export async function getTriviaStats() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const { data: statsData, error } = await supabase
      .from('trivia_stats' as never)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    let stats = statsData as TriviaStats | null;

    if (!stats) {
      const { data: newStats, error: insertError } = await supabase
        .from('trivia_stats' as never)
        .insert({
          user_id: user.id,
          current_streak: 0,
          max_streak: 0,
          total_correct: 0,
          total_played: 0,
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;
      stats = newStats as TriviaStats;
    }

    if (!stats) {
      return { success: false, error: 'failed_to_initialize_stats' };
    }

    // Fetch trivia questions dynamically from Supabase
    let questionsList: any[] = [];
    try {
      const { data: dbQuestions, error: questionsError } = await supabase
        .from('trivia_questions' as never)
        .select('*');
      if (!questionsError && dbQuestions && dbQuestions.length > 0) {
        questionsList = dbQuestions;
      }
    } catch { }

    if (questionsList.length === 0) {
      questionsList = TRIVIA_QUESTIONS.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation
      }));
    }

    // Determine current day question based on date
    const dayIndex = new Date().getDate() % questionsList.length;
    const currentQuestion = questionsList[dayIndex];

    // Check if user played today
    let playedToday = false;
    if (stats.last_played_at) {
      const lastPlayedDate = new Date(stats.last_played_at).toDateString();
      const todayDate = new Date().toDateString();
      playedToday = lastPlayedDate === todayDate;
    }

    return {
      success: true,
      stats,
      question: playedToday ? null : {
        id: currentQuestion.id,
        question: currentQuestion.question,
        options: currentQuestion.options,
      },
      playedToday
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

interface DBTriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

async function fetchActiveQuestion(
  supabase: SupabaseClient<Database>,
  questionId: string
): Promise<DBTriviaQuestion | null> {
  try {
    const { data: dbQuestion, error: qError } = await supabase
      .from('trivia_questions' as never)
      .select('*')
      .eq('id', questionId)
      .maybeSingle() as unknown as { data: DBTriviaQuestion | null; error: { message: string } | null };
    if (!qError && dbQuestion) {
      return dbQuestion;
    }
  } catch {}

  const localQ = TRIVIA_QUESTIONS.find((q) => q.id === questionId);
  if (!localQ) return null;
  return {
    id: localQ.id,
    question: localQ.question,
    options: localQ.options,
    correct_index: localQ.correctIndex,
    explanation: localQ.explanation,
  };
}

export async function submitTriviaAnswer(questionId: string, answerIndex: number) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const statsRes = await getTriviaStats();
    if (!statsRes.success || !statsRes.stats) {
      return { success: false, error: statsRes.error || 'stats_missing' };
    }
    const stats = statsRes.stats;
    const playedToday = statsRes.playedToday;

    if (playedToday) return { success: false, error: 'already_played_today' };

    const activeQuestion = await fetchActiveQuestion(supabase, questionId);
    if (!activeQuestion) return { success: false, error: 'invalid_question' };

    const isCorrect = activeQuestion.correct_index === answerIndex;
    const newStreak = isCorrect ? stats.current_streak + 1 : 0;
    const newMaxStreak = Math.max(stats.max_streak, newStreak);
    const newTotalCorrect = isCorrect ? stats.total_correct + 1 : stats.total_correct;

    const { error: updateError } = await supabase
      .from('trivia_stats' as never)
      .update({
        current_streak: newStreak,
        max_streak: newMaxStreak,
        total_correct: newTotalCorrect,
        total_played: stats.total_played + 1,
        last_played_at: new Date().toISOString(),
      } as never)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    let pointsAwarded = 0;
    if (isCorrect) {
      const admin = createServiceClient();
      pointsAwarded = 10; // BASE trivia point
      let streakBonus = 0;

      if (newStreak > 0 && newStreak % 3 === 0) {
        streakBonus = 15; // STREAK_BONUS every 3 days
        pointsAwarded += streakBonus;
      }

      const actionKey = makeActionKey(user.id, 'DAILY_TRIVIA', `${questionId}:${newStreak}`);
      await (admin as any).rpc('award_points', {
        p_user_id: user.id,
        p_activity: 'DAILY_TRIVIA',
        p_points: pointsAwarded,
        p_related_id: user.id,
        p_action_key: actionKey,
      });
    }

    // Log to system audit trail
    await (supabase as any).rpc('log_system_activity', {
      p_action: 'TRIVIA_ANSWER_SUBMITTED',
      p_target_id: questionId,
      p_details: `Submitted trivia answer index ${answerIndex} (Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}). Earned +${pointsAwarded} XP (Streak: ${newStreak} days)`
    });

    revalidatePath('/empire');
    return {
      success: true,
      correct: isCorrect,
      explanation: activeQuestion.explanation,
      streak: newStreak,
      pointsAwarded
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── STRAY BINGO ──────────────────────────────────────────────────────────────

export async function getBingoCard() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const today = new Date();
    // Monday of current week
    const currentWeekStart = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bingo_cards' as never)
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', currentWeekStart)
      .maybeSingle();

    if (error) throw error;

    let card = data as BingoCard | null;

    if (!card) {
      // Fetch BINGO task templates dynamically from Supabase
      const { data: templatesData, error: templatesError } = await supabase
        .from('bingo_task_templates' as never)
        .select('*');

      if (templatesError) throw templatesError;
      const templates = (templatesData ?? []) as any[];

      if (templates.length === 0) {
        return { success: false, error: 'no_bingo_task_templates_configured' };
      }

      // Build 5x5 random task list (duplicate tasks allowed to fill 25 squares, middle square is freebie)
      const squares = Array.from({ length: 25 }, (_, idx) => {
        if (idx === 12) {
          return { label: 'Free Stray Hug', type: 'free', completed: true };
        }
        const template = templates[idx % templates.length];
        return { label: template.label, type: template.type, completed: false };
      });

      const { data: newCard, error: insertError } = await supabase
        .from('bingo_cards' as never)
        .insert({
          user_id: user.id,
          week_start: currentWeekStart,
          squares,
          completed_squares: 1, // Freebie is complete
          is_bingo_achieved: false
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;
      card = newCard as BingoCard;
    }

    return { success: true, card };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function verifyBingoSquare(
  supabase: SupabaseClient<Database>,
  userId: string,
  squareType: string
): Promise<boolean> {
  if (squareType === 'log_cat' || squareType === 'fuzz_location' || squareType === 'clean_exif') {
    const { count } = await supabase
      .from('cats' as never)
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);
    return !!(count && count > 0);
  }

  if (squareType === 'trivia_complete') {
    const { data: stats } = await supabase
      .from('trivia_stats' as never)
      .select('total_played')
      .eq('user_id', userId)
      .maybeSingle() as unknown as { data: { total_played: number } | null };
    return !!(stats && stats.total_played > 0);
  }

  if (squareType === 'join_chat') {
    const { count } = await supabase
      .from('community_messages' as never)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return !!(count && count > 0);
  }

  if (squareType === 'view_map' || squareType === 'check_weather' || squareType === 'read_notice') {
    return true;
  }

  if (squareType === 'colony_check') {
    const { count: countCreated } = await supabase
      .from('colonies' as never)
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);
    const { count: countCaretaker } = await supabase
      .from('colonies' as never)
      .select('*', { count: 'exact', head: true })
      .eq('caretaker_id', userId);
    return !!((countCreated && countCreated > 0) || (countCaretaker && countCaretaker > 0));
  }

  if (squareType === 'point_transfer') {
    const { count } = await supabase
      .from('point_log' as never)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lt('points', 0);
    return !!(count && count > 0);
  }

  return true;
}

export async function claimBingoSquare(squareIndex: number) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const cardRes = await getBingoCard();
    if (!cardRes.success || !cardRes.card) {
      return { success: false, error: cardRes.error || 'card_not_found' };
    }
    const card = cardRes.card;

    const squares = [...card.squares];
    const idx = Number(squareIndex);
    if (isNaN(idx) || idx < 0 || idx >= squares.length) {
      return { success: false, error: 'invalid_index' };
    }

    if (squares[idx].completed) {
      return { success: false, error: 'already_completed' };
    }

    // Verify the square task is completed
    const square = squares[idx];
    const isVerified = await verifyBingoSquare(supabase, user.id, square.type);

    if (!isVerified) {
      return { success: false, error: `Verification failed. You haven't completed the task: "${square.label}" yet.` };
    }

    // Toggle complete
    squares[idx].completed = true;

    // Check for bingo (horizontal, vertical, diagonals)
    const isWinningPosition = (sqs: any[]) => {
      // Lines to check
      const checks = [
        // Rows
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        // Columns
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        // Diagonals
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
      ];
      return checks.some(line => line.every(idx => sqs[idx].completed));
    };

    const hasBingo = isWinningPosition(squares);
    const completedCount = squares.filter(s => s.completed).length;

    let pointsAwarded = 0;
    let bingoJustAchieved = false;

    if (hasBingo && !card.is_bingo_achieved) {
      bingoJustAchieved = true;
      const admin = createServiceClient();
      const actionKey = makeActionKey(user.id, 'BINGO_COMPLETED', card.id);
      pointsAwarded = 50;

      await (admin as any).rpc('award_points', {
        p_user_id: user.id,
        p_activity: 'BINGO_COMPLETED',
        p_points: pointsAwarded,
        p_related_id: card.id,
        p_action_key: actionKey,
      });
    }

    const { data: updatedCard, error: updateError } = await supabase
      .from('bingo_cards' as never)
      .update({
        squares,
        completed_squares: completedCount,
        is_bingo_achieved: card.is_bingo_achieved || bingoJustAchieved
      } as never)
      .eq('id', card.id)
      .select()
      .single();

    if (updateError) throw updateError;

    revalidatePath('/empire');
    return {
      success: true,
      card: updatedCard as BingoCard,
      pointsAwarded,
      bingoAchieved: bingoJustAchieved
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── VOLUNTEER GUILDS ─────────────────────────────────────────────────────────

export async function joinGuild(guildId: string) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    // 1. Fetch guild join conditions
    const { data: guild } = await supabase
      .from('guilds' as never)
      .select('min_points_required')
      .eq('id', guildId)
      .single();

    if (!guild) return { success: false, error: 'guild_not_found' };

    // 2. Fetch user points
    const { data: profile } = await supabase
      .from('profiles' as never)
      .select('empire_points')
      .eq('id', user.id)
      .single();

    const userPoints = (profile as any)?.empire_points ?? 0;
    const minPoints = (guild as any).min_points_required ?? 0;

    if (userPoints < minPoints) {
      return {
        success: false,
        error: `Insufficient empire points. This guild requires at least ${minPoints} points to join. You currently have ${userPoints} points.`
      };
    }

    // Leave existing guild first
    await supabase.from('guild_members' as never).delete().eq('user_id', user.id);

    const { error } = await supabase
      .from('guild_members' as never)
      .insert({
        guild_id: guildId,
        user_id: user.id,
        role: 'member'
      } as never);

    if (error) throw error;

    revalidatePath('/empire');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function leaveGuild(guildId: string) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const { error } = await supabase
      .from('guild_members' as never)
      .delete()
      .eq('guild_id', guildId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/empire');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function contributeToGuildQuest(questId: string, pointContribution: number) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const { data: dbQuest, error: questError } = await supabase
      .from('guild_quests' as never)
      .select('*')
      .eq('id', questId)
      .single();

    if (questError || !dbQuest) return { success: false, error: 'quest_not_found' };
    const quest = dbQuest as GuildQuest;
    if (quest.is_completed) return { success: false, error: 'quest_already_completed' };

    const newPoints = Math.min(quest.current_points + pointContribution, quest.target_points);
    const completed = newPoints >= quest.target_points;

    const { error: updateError } = await supabase
      .from('guild_quests' as never)
      .update({
        current_points: newPoints,
        is_completed: completed
      } as never)
      .eq('id', questId);

    if (updateError) throw updateError;

    // Contribute user points to guild total points by fetching guild points and incrementing
    const { data: dbGuild } = await supabase
      .from('guilds' as never)
      .select('points')
      .eq('id', quest.guild_id)
      .single();

    if (dbGuild) {
      const guild = dbGuild as Guild;
      await supabase
        .from('guilds' as never)
        .update({ points: guild.points + pointContribution } as never)
        .eq('id', quest.guild_id);
    }

    revalidatePath('/empire');
    return { success: true, completed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── COLONY TYCOON (VIRTUAL SANCTUARY) ─────────────────────────────────────────

export async function getSanctuary() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const { data, error } = await supabase
      .from('colony_tycoon_sanctuaries' as never)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    let sanctuary = data as Sanctuary | null;

    if (!sanctuary) {
      // Fetch user profile name
      const { data: profile } = await supabase.from('profiles' as never).select('display_name').eq('id', user.id).single();
      const displayName = (profile as any)?.display_name || 'My';
      const name = `${displayName} Cozy Sanctuary`;

      const { data: newSanctuary, error: insertError } = await supabase
        .from('colony_tycoon_sanctuaries' as never)
        .insert({
          user_id: user.id,
          name,
          level: 1,
          point_multiplier: 1.0,
          idle_points_rate: 1,
          last_claimed_at: new Date().toISOString()
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;
      sanctuary = newSanctuary as Sanctuary;
    }

    if (!sanctuary) {
      return { success: false, error: 'failed_to_initialize_sanctuary' };
    }

    // Calculate accumulated offline points
    const lastClaimed = sanctuary.last_claimed_at ? new Date(sanctuary.last_claimed_at).getTime() : Date.now();
    const elapsedMs = Date.now() - lastClaimed;
    // Cap offline progress to 24 hours to encourage daily check-ins
    const elapsedHours = Math.min(elapsedMs / 3600000, 24);
    const accumulatedPoints = Math.max(0, elapsedHours * sanctuary.idle_points_rate * Number(sanctuary.point_multiplier));

    const { data: upgrades } = await supabase
      .from('colony_tycoon_upgrades' as never)
      .select('*')
      .eq('sanctuary_id', sanctuary.id);

    return { success: true, sanctuary, upgrades: (upgrades ?? []) as Upgrade[], accumulatedPoints };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function claimIdlePoints() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const sanctuaryRes = await getSanctuary();
    if (!sanctuaryRes.success || !sanctuaryRes.sanctuary) {
      return { success: false, error: sanctuaryRes.error || 'sanctuary_not_found' };
    }
    const sanctuary = sanctuaryRes.sanctuary;
    const accumulatedPoints = (sanctuaryRes as any).accumulatedPoints || 0;
    const pointsToClaim = Math.floor(accumulatedPoints);

    if (pointsToClaim <= 0) {
      return { success: false, error: 'No accumulated points to claim yet.' };
    }

    // Award points via RPC
    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'TYCOON_CLAIM', `claim-idle:${Date.now()}`);
    const { error: awardError } = await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'TYCOON_CLAIM',
      p_points: pointsToClaim,
      p_related_id: sanctuary.id,
      p_action_key: actionKey,
    });

    if (awardError) {
      return { success: false, error: awardError.message || 'Failed to claim points.' };
    }

    // Update last_claimed_at to reset progress
    const { error: updateError } = await supabase
      .from('colony_tycoon_sanctuaries' as never)
      .update({
        last_claimed_at: new Date().toISOString()
      } as never)
      .eq('id', sanctuary.id);

    if (updateError) throw updateError;

    revalidatePath('/empire');
    revalidatePath('/empire/tycoon');
    return { success: true, pointsClaimed: pointsToClaim };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function purchaseSanctuaryUpgrade(upgradeType: 'shelter_bed' | 'kibble_feeder' | 'first_aid' | 'play_area', cost: number) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    // 1. Fetch user profiles points
    const { data: dbProfile, error: profileError } = await supabase
      .from('profiles' as never)
      .select('empire_points')
      .eq('id', user.id)
      .single();

    if (profileError || !dbProfile) return { success: false, error: 'profile_not_found' };
    const profile = dbProfile as { empire_points: number };
    if (profile.empire_points < cost) return { success: false, error: 'insufficient_points' };

    // 2. Fetch sanctuary
    const sanctuaryRes = await getSanctuary();
    if (!sanctuaryRes.success || !sanctuaryRes.sanctuary) {
      return { success: false, error: sanctuaryRes.error || 'sanctuary_not_found' };
    }
    const sanctuary = sanctuaryRes.sanctuary;

    // 3. Calculate level
    const { data: existingUpgrades } = await supabase
      .from('colony_tycoon_upgrades' as never)
      .select('*')
      .eq('sanctuary_id', sanctuary.id)
      .eq('upgrade_type', upgradeType);

    const level = (existingUpgrades?.length ?? 0) + 1;

    // 4. Deduct points via award_points RPC (negative points)
    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'TYCOON_UPGRADE', `${upgradeType}:${level}:${Date.now()}`);
    const { error: awardError } = await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'TYCOON_UPGRADE',
      p_points: -cost,
      p_related_id: sanctuary.id,
      p_action_key: actionKey,
    });

    if (awardError) {
      return { success: false, error: awardError.message || 'Failed to deduct points.' };
    }

    // 5. Insert upgrade record
    const { error: insertError } = await supabase
      .from('colony_tycoon_upgrades' as never)
      .insert({
        sanctuary_id: sanctuary.id,
        upgrade_type: upgradeType,
        level,
        cost_points: cost
      } as never);

    if (insertError) {
      // Revert points if upgrade insert fails
      const revertKey = makeActionKey(user.id, 'TYCOON_UPGRADE', `revert:${upgradeType}:${level}:${Date.now()}`);
      await (admin as any).rpc('award_points', {
        p_user_id: user.id,
        p_activity: 'TYCOON_UPGRADE',
        p_points: cost,
        p_related_id: sanctuary.id,
        p_action_key: revertKey,
      });
      throw insertError;
    }

    // 6. Upgrade sanctuary stats
    const newRate = sanctuary.idle_points_rate + 2;
    const newMult = Number((sanctuary.point_multiplier + 0.1).toFixed(2));
    const newLevel = Math.floor(level / 2) + 1;

    await supabase
      .from('colony_tycoon_sanctuaries' as never)
      .update({
        idle_points_rate: newRate,
        point_multiplier: newMult,
        level: newLevel
      } as never)
      .eq('id', sanctuary.id);

    revalidatePath('/empire');
    revalidatePath('/empire/tycoon');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── ADMIN GAMIFICATION CONTROLS ──────────────────────────────────────────────

export async function createTriviaQuestion(
  question: string,
  options: string[],
  correctIndex: number,
  explanation: string
) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role !== 'admin') {
    return { success: false, error: 'forbidden' };
  }

  try {
    const { data, error } = await supabase
      .from('trivia_questions' as never)
      .insert({
        question,
        options,
        correct_index: correctIndex,
        explanation
      } as never)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/empire/trivia');
    return { success: true, question: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBingoTask(
  label: string,
  type: string,
  description: string
) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role !== 'admin') {
    return { success: false, error: 'forbidden' };
  }

  try {
    const { data, error } = await supabase
      .from('bingo_task_templates' as never)
      .insert({
        label,
        type,
        description
      } as never)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/empire/bingo');
    return { success: true, task: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createGuild(
  name: string,
  description: string,
  logoUrl?: string
) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role !== 'admin') {
    return { success: false, error: 'forbidden' };
  }

  try {
    const { data, error } = await supabase
      .from('guilds' as never)
      .insert({
        name,
        description,
        logo_url: logoUrl || null,
        points: 0
      } as never)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/empire/guilds');
    return { success: true, guild: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function userCreateGuild(
  name: string,
  description: string,
  logoUrl?: string,
  minPointsRequired?: number,
  category?: string
) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  if (!name || name.trim().length < 3) {
    return { success: false, error: 'Guild name must be at least 3 characters long.' };
  }

  try {
    // 1. Insert guild
    const { data: newGuild, error: guildError } = await supabase
      .from('guilds' as never)
      .insert({
        name: name.trim(),
        description: description.trim(),
        logo_url: logoUrl || null,
        points: 0,
        min_points_required: minPointsRequired || 0,
        category: category || 'General',
        creator_id: user.id
      } as never)
      .select()
      .single();

    if (guildError) throw guildError;
    const guild = newGuild as Guild;

    // 2. Clear old membership and add as leader
    await supabase.from('guild_members' as never).delete().eq('user_id', user.id);

    const { error: memberError } = await supabase
      .from('guild_members' as never)
      .insert({
        guild_id: guild.id,
        user_id: user.id,
        role: 'leader'
      } as never);

    if (memberError) throw memberError;

    // 3. Create default cooperations/quests for this new user-created guild so it is not empty!
    await supabase.from('guild_quests' as never).insert([
      { guild_id: guild.id, title: 'Inaugural Straw Bedding Hunt', description: 'Pool points to secure first-aid blankets for neighborhood outdoor cats.', target_points: 100, current_points: 0, is_completed: false },
      { guild_id: guild.id, title: 'Establish Feeding Routine', description: 'Ensure regular dry kibble distributions are active in the local sector.', target_points: 150, current_points: 0, is_completed: false }
    ] as never);

    revalidatePath('/empire');
    return { success: true, guild };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function awardMeowTranslationPoints() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'unauthorized' };

  try {
    const admin = createServiceClient();
    const actionKey = makeActionKey(user.id, 'MEOW_TRANSLATION', `meow-translation:${Date.now()}`);
    const { error } = await (admin as any).rpc('award_points', {
      p_user_id: user.id,
      p_activity: 'MEOW_TRANSLATION',
      p_points: 10,
      p_related_id: user.id,
      p_action_key: actionKey,
    });

    if (error) throw error;

    // Log to system audit trail
    await (supabase as any).rpc('log_system_activity', {
      p_action: 'MEOW_TRANSLATION_COMPLETED',
      p_target_id: user.id,
      p_details: 'Translated cat vocalization using AI Meow Translator (+10 XP)'
    });

    revalidatePath('/empire');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

