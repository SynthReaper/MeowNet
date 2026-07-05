'use client';
// components/volunteers/TaskBoard.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';
import TaskCard from './TaskCard';
import { Task } from '@/lib/actions/volunteers';

interface Props {
  readonly initialTasks?: Task[];
  readonly currentUserId: string | null;
}

type TabType = 'all' | 'open' | 'claimed' | 'completed';

export default function TaskBoard({ initialTasks = [], currentUserId }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const refetchTasks = async () => {
    try {
      const res = await fetch('/api/volunteers/tasks');
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch {
      console.error('Failed to reload tasks');
    }
  };

  const openTasks = tasks.filter((t) => t.status === 'open');
  const claimedTasks = tasks.filter((t) => t.status === 'claimed' || t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const columns = [
    { title: 'Open Tasks', count: openTasks.length, items: openTasks, color: 'text-[var(--empire-cream)]' },
    { title: 'In Progress', count: claimedTasks.length, items: claimedTasks, color: 'text-[var(--empire-gold)]' },
    { title: 'Completed', count: completedTasks.length, items: completedTasks, color: 'text-[var(--life-teal)]' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Colony Task Board</h3>
          <p className="text-xs text-gray-400 mt-1">Claim and log TNR assistance, feeding duties, and transportation tasks.</p>
        </div>

        <div className="flex gap-1 bg-black/40 border border-white/5 p-1 rounded-xl">
          {(['all', 'open', 'claimed', 'completed'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[var(--life-teal)] text-white'
                  : 'text-gray-400 hover:text-[var(--empire-cream)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col, idx) => {
          // If a tab is active, filter columns accordingly
          if (activeTab === 'open' && idx !== 0) return null;
          if (activeTab === 'claimed' && idx !== 1) return null;
          if (activeTab === 'completed' && idx !== 2) return null;

          return (
            <div
              key={col.title}
              className={`flex flex-col gap-4 bg-black/20 border border-white/5 rounded-2xl p-4 min-h-[400px] transition-all ${
                activeTab !== 'all' ? 'md:col-span-3' : ''
              }`}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className={`text-sm font-bold tracking-wider uppercase ${col.color}`}>{col.title}</span>
                <span className="text-[10px] bg-white/5 text-gray-300 font-mono px-2 py-0.5 rounded-md">{col.count}</span>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1">
                {col.items.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-500 font-mono">No tasks in this section.</div>
                ) : (
                  col.items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserId={currentUserId}
                      onUpdate={refetchTasks}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
