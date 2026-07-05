'use client';
// app/(app)/volunteers/VolunteerHubClient.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';
import AvailabilityCalendar from '@/components/volunteers/AvailabilityCalendar';
import SkillsPanel from '@/components/volunteers/SkillsPanel';
import TaskBoard from '@/components/volunteers/TaskBoard';
import HoursTracker from '@/components/volunteers/HoursTracker';
import MentorshipPipeline from '@/components/volunteers/MentorshipPipeline';

interface Props {
  readonly currentUserId: string;
  readonly userRole: string;
  readonly initialAvailability: any[];
  readonly initialSkills: any[];
  readonly initialHours: any[];
  readonly initialTasks: any[];
}

export default function VolunteerHubClient({
  currentUserId,
  userRole,
  initialAvailability,
  initialSkills,
  initialHours,
  initialTasks,
}: Props) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'credentials' | 'hours' | 'availability' | 'mentorship'>('tasks');

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Volunteer Ops Hub</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Coordinate trap-neuter-return (TNR) dispatch, manage regional credentials, map availability grids, and track field operational hours.
        </p>
      </section>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 gap-6 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'tasks', label: 'Field Tasks', icon: 'assignment' },
          { id: 'credentials', label: 'Credentials', icon: 'badge' },
          { id: 'hours', label: 'Hours Tracker', icon: 'schedule' },
          { id: 'availability', label: 'Availability', icon: 'calendar_month' },
          { id: 'mentorship', label: 'Mentorship', icon: 'groups' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--life-teal)] text-[var(--life-teal)]'
                : 'border-transparent text-gray-400 hover:text-[var(--empire-cream)]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex flex-col gap-8">
        {activeTab === 'tasks' && (
          <TaskBoard initialTasks={initialTasks} currentUserId={currentUserId} />
        )}

        {activeTab === 'credentials' && (
          <SkillsPanel
            currentUserId={currentUserId}
            targetUserId={currentUserId}
            isOwnProfile={true}
            userRole={userRole}
            initialSkills={initialSkills}
          />
        )}

        {activeTab === 'hours' && (
          <HoursTracker currentUserId={currentUserId} initialHours={initialHours} />
        )}

        {activeTab === 'availability' && (
          <AvailabilityCalendar userId={currentUserId} initialAvailability={initialAvailability} />
        )}

        {activeTab === 'mentorship' && (
          <MentorshipPipeline
            initialMentor={{
              id: 'mentor-stub-1',
              name: 'Dr. Sarah Mercer',
              role: 'Senior Vet Liaison & Trapper',
              total_hours: 142,
            }}
            initialMentees={[
              { id: 'mentee-stub-1', name: 'Marcus Miller', progress: 85 },
              { id: 'mentee-stub-2', name: 'Elena Rostova', progress: 40 },
            ]}
          />
        )}
      </div>
    </div>
  );
}
