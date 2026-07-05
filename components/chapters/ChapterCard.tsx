'use client';
// components/chapters/ChapterCard.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { joinChapter, leaveChapter, Chapter } from '@/lib/actions/chapters';

interface Props {
  readonly chapter: Chapter;
  readonly initialIsMember: boolean;
  readonly onUpdated?: () => void;
}

export default function ChapterCard({ chapter, initialIsMember, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isMember, setIsMember] = useState(initialIsMember);

  const handleToggleMembership = () => {
    startTransition(async () => {
      if (isMember) {
        const res = await leaveChapter(chapter.id);
        if (res.success) {
          setIsMember(false);
          if (onUpdated) onUpdated();
        } else {
          alert(res.error || 'Failed to leave chapter.');
        }
      } else {
        const res = await joinChapter(chapter.id);
        if (res.success) {
          setIsMember(true);
          if (onUpdated) onUpdated();
        } else {
          alert(res.error || 'Failed to join chapter.');
        }
      }
    });
  };

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-xl p-5 flex flex-col justify-between gap-4 shadow-md h-full">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h4 className="text-base font-bold text-[var(--empire-cream)]">{chapter.name}</h4>
            <span className="text-[10px] text-[var(--life-teal)] font-mono uppercase tracking-wider block mt-0.5">
              Region: {chapter.region}
            </span>
          </div>
          <div className="bg-white/5 text-gray-400 text-xs font-mono px-2 py-1 rounded-md">
            {chapter.member_count} member(s)
          </div>
        </div>

        {chapter.description && (
          <p className="text-xs text-gray-400 leading-relaxed mt-1 line-clamp-3">{chapter.description}</p>
        )}

        {chapter.meeting_schedule && (
          <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-xs">schedule</span>
            <span>Schedule: {chapter.meeting_schedule}</span>
          </div>
        )}
      </div>

      <button
        id={`btn-chapter-membership-${chapter.id}`}
        onClick={handleToggleMembership}
        disabled={isPending}
        className={`w-full py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50 ${
          isMember
            ? 'bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-950/60'
            : 'bg-[var(--life-teal)] text-white hover:opacity-90'
        }`}
      >
        {isPending ? 'Processing...' : isMember ? 'Leave Chapter' : 'Join Chapter'}
      </button>
    </div>
  );
}
