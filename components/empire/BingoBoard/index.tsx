'use client';
// components/empire/BingoBoard/index.tsx — Interactive 5x5 Bingo Grid (Client Component)

import React, { useState } from 'react';
import { claimBingoSquare } from '@/lib/actions/gamification';

interface BingoCard {
  id: string;
  week_start: string;
  squares: Array<{
    label: string;
    type: string;
    completed: boolean;
  }>;
  completed_squares: number;
  is_bingo_achieved: boolean;
}

interface BingoBoardProps {
  initialCard: BingoCard;
}

export default function BingoBoard({ initialCard }: BingoBoardProps) {
  const [card, setCard] = useState<BingoCard>(initialCard);
  const [isClaiming, setIsClaiming] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSquareClick = async (idx: number) => {
    if (card.squares[idx].completed || isClaiming !== null) return;

    setIsClaiming(idx);
    setError(null);

    try {
      const res = await claimBingoSquare(idx) as any;
      if (res.success && res.card) {
        setCard(res.card);
        if (res.bingoAchieved) {
          setCelebration('🎉 STRAY BINGO ACHIEVED! +50 EMPIRE POINTS AWARDED!');
          setTimeout(() => setCelebration(null), 6000);
        }
      } else {
        setError(res.error || 'Verification failed. Have you completed this task?');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsClaiming(null);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* 5x5 Grid Board */}
      <div className="lg:col-span-8 bg-white rounded-2xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[var(--life-teal)] text-3xl font-bold">grid_view</span>
          <h2 className="font-display text-lg text-[var(--empire-cream)] font-bold">Weekly Stray Bingo Card</h2>
          <span className="ml-auto font-body text-xs font-bold text-[var(--empire-cream)]/50">
            Reset: Every Monday
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm font-bold">info</span>
            <span>{error}</span>
          </div>
        )}

        {celebration && (
          <div className="p-4 rounded-xl bg-[#e9faf4] border-2 border-[var(--life-teal)] text-[#0d594b] text-sm font-extrabold text-center animate-bounce shadow-md flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-xl">stars</span>
            <span>{celebration}</span>
          </div>
        )}

        {/* 5x5 Grid Container */}
        <div className="grid grid-cols-5 gap-2 md:gap-3 aspect-square w-full max-w-2xl mx-auto">
          {card.squares.map((square, idx) => {
            const isFree = idx === 12;
            const isCompleted = square.completed;
            const claiming = isClaiming === idx;

            return (
              <button
                key={idx}
                disabled={isCompleted || isClaiming !== null}
                onClick={() => handleSquareClick(idx)}
                className={`p-1 md:p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all aspect-square relative overflow-hidden cursor-pointer ${
                  isCompleted
                    ? isFree
                      ? 'bg-gradient-to-br from-[#e0f7f4] to-[#c5f2eb] border-[var(--life-teal)] text-[#0d594b]'
                      : 'bg-[#fff7f2] border-[var(--empire-gold)] text-[var(--empire-gold)] shadow-sm'
                    : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/50 text-[var(--empire-cream)]/80 hover:bg-[var(--bg-border)]/10 hover:border-[var(--bg-border)]'
                }`}
              >
                {claiming ? (
                  <span className="material-symbols-outlined text-lg animate-spin text-[var(--empire-gold)]">sync</span>
                ) : isCompleted ? (
                  <span className="material-symbols-outlined text-base md:text-xl font-bold animate-fade-in">
                    {isFree ? 'pets' : 'check_circle'}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-base md:text-lg opacity-40">
                    {square.type === 'log_cat' ? 'photo_camera' :
                     square.type === 'check_weather' ? 'thermostat' :
                     square.type === 'view_map' ? 'map' :
                     square.type === 'join_chat' ? 'chat_bubble' :
                     square.type === 'trivia_complete' ? 'quiz' :
                     'explore'}
                  </span>
                )}

                <span className="font-display text-[8px] md:text-[10px] font-bold mt-1.5 leading-tight break-all md:break-normal line-clamp-2 select-none">
                  {square.label}
                </span>

                {isCompleted && !isFree && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[var(--empire-gold)] rounded-bl-lg" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info and Progress Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#e8fbf7] flex items-center justify-center mb-3 text-[var(--life-teal)]">
            <span className="material-symbols-outlined text-3xl font-bold">trophy</span>
          </div>
          <span className="font-body text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider">Weekly Progress</span>
          <span className="font-display text-2xl font-black text-[var(--empire-cream)] mt-1">
            {card.completed_squares} / 25 Done
          </span>
          <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full mt-4 overflow-hidden border border-[var(--bg-border)]/20">
            <div
              className="h-full bg-[var(--life-teal)] rounded-full transition-all duration-500"
              style={{ width: `${(card.completed_squares / 25) * 100}%` }}
            />
          </div>
          <span className="font-body text-[10px] text-[var(--empire-cream)]/40 mt-2 font-semibold">
            Complete lines vertically, horizontally, or diagonally!
          </span>
        </div>

        {/* Legend Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-4">
          <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--empire-gold)]">explore</span>
            <span>How it works</span>
          </h3>

          <div className="flex flex-col gap-3 font-body text-xs text-[var(--empire-cream)]/70 leading-relaxed font-semibold">
            <p>
              1. Each week, you get a randomized 5x5 board with volunteer objectives (e.g. logging cats, checking weather).
            </p>
            <p>
              2. Perform these activities in MeowNet, then click the square here to verify your achievements.
            </p>
            <p>
              3. Claiming 5 squares in a row completes a **Stray Bingo**, automatically awarding **+50 Empire Points**!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
