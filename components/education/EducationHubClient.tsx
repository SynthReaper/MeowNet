'use client';
// components/education/EducationHubClient.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';
import CourseCard from '@/components/education/CourseCard';
import QuizModule, { Course } from '@/components/education/QuizModule';
import { enrollInCourse } from '@/lib/actions/education';

interface Enrollment {
  readonly id: string;
  readonly course_id: string;
  readonly progress: number;
  readonly completed_at: string | null;
  readonly certificate_url: string | null;
}

interface Props {
  readonly courses: Course[];
  readonly initialEnrollments: Enrollment[];
}

export default function EducationHubClient({ courses, initialEnrollments }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments);
  const [activeEnrollmentId, setActiveEnrollmentId] = useState<string | null>(null);

  const handleEnroll = async (courseId: string) => {
    const res = await enrollInCourse(courseId);
    if (res.success) {
      const updated: Enrollment = {
        id: res.enrollmentId || '',
        course_id: courseId,
        progress: 0,
        completed_at: null,
        certificate_url: null,
      };
      setEnrollments((prev) => [...prev, updated]);
    } else {
      alert(res.error || 'Failed to enroll');
    }
  };

  const handleRefreshEnrollments = async () => {
    window.location.reload();
  };

  const activeEnrollment = enrollments.find((e) => e.id === activeEnrollmentId);
  const activeCourse = activeEnrollment ? courses.find((c) => c.id === activeEnrollment.course_id) : undefined;

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)]">Academy &amp; Education Center</h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          Learn TNR methods, study veterinary triage guidelines, and earn public digital certificates confirming your skills.
        </p>
      </section>

      {/* Grid: Course Cards */}
      <section className="flex flex-col gap-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Curriculum Catalog</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const enrollment = enrollments.find((e) => e.course_id === course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                enrollment={enrollment}
                onStartQuiz={(id) => setActiveEnrollmentId(id)}
                onEnroll={handleEnroll}
              />
            );
          })}
        </div>
      </section>

      {/* Quiz Modal Overlay */}
      {activeEnrollmentId && activeEnrollment && activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <QuizModule
            enrollmentId={activeEnrollmentId}
            course={activeCourse}
            onClose={() => setActiveEnrollmentId(null)}
            onQuizFinished={handleRefreshEnrollments}
          />
        </div>
      )}
    </div>
  );
}
