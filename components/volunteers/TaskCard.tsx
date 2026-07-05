'use client';
// components/volunteers/TaskCard.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { claimTask, completeTask, Task } from '@/lib/actions/volunteers';

interface Props {
  readonly task: Task;
  readonly currentUserId: string | null;
  readonly onUpdate?: () => void;
}

export default function TaskCard({ task, currentUserId, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  const priorityColors = {
    low: 'border-l-blue-500/50 bg-blue-950/10',
    medium: 'border-l-[var(--life-teal)] bg-[var(--life-teal)]/5',
    high: 'border-l-[var(--empire-gold)] bg-[var(--empire-gold)]/5',
    urgent: 'border-l-red-500 bg-red-950/20',
  };

  const handleClaim = () => {
    startTransition(async () => {
      const res = await claimTask(task.id);
      if (res.success && onUpdate) {
        onUpdate();
      } else {
        alert(res.error || 'Failed to claim task.');
      }
    });
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await completeTask(task.id, file || undefined);
      if (res.success && onUpdate) {
        onUpdate();
      } else {
        alert(res.error || 'Failed to complete task.');
      }
    });
  };

  const canClaim = currentUserId && task.status === 'open';
  const isClaimedByMe = currentUserId && task.claimed_by === currentUserId;
  const inProgress = task.status === 'claimed' || task.status === 'in_progress';

  return (
    <div
      className={`border border-[rgba(255,255,255,0.08)] border-l-4 rounded-xl p-4 flex flex-col gap-3 shadow-md ${
        priorityColors[task.priority]
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[var(--empire-cream)] truncate">{task.title}</h4>
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mt-1">
            Type: {task.task_type.replace('_', ' ')}
          </span>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            task.priority === 'urgent'
              ? 'bg-red-500/20 text-red-400'
              : task.priority === 'high'
              ? 'bg-[var(--empire-gold)]/20 text-[var(--empire-gold)]'
              : 'bg-white/10 text-gray-300'
          }`}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{task.description}</p>
      )}

      {task.required_skills && task.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {task.required_skills.map((skill) => (
            <span
              key={skill}
              className="text-[9px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-md font-mono"
            >
              {skill.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}

      {task.due_date && (
        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-[12px]">calendar_today</span>
          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
        </div>
      )}

      <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-2">
        {canClaim && (
          <button
            onClick={handleClaim}
            disabled={isPending}
            className="w-full bg-[var(--life-teal)] text-white hover:opacity-90 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
          >
            Claim Task
          </button>
        )}

        {isClaimedByMe && inProgress && (
          <form onSubmit={handleComplete} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-400 cursor-pointer flex items-center gap-1 border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg">
                <span className="material-symbols-outlined text-xs">add_a_photo</span>
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {file && <span className="text-[10px] text-[var(--life-teal)] truncate max-w-[150px]">{file.name}</span>}
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[var(--empire-gold)] text-black hover:opacity-90 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
            >
              Complete Task
            </button>
          </form>
        )}

        {task.status === 'completed' && (
          <div className="flex items-center gap-1.5 text-[var(--life-teal)] text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Completed</span>
          </div>
        )}
      </div>
    </div>
  );
}
