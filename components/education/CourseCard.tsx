'use client';
// components/education/CourseCard.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';

interface Question {
  readonly id: string;
  readonly question: string;
  readonly options: string[];
}

interface Course {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly content: {
    readonly modules?: string[];
    readonly quizzes?: Question[];
  };
}

interface Enrollment {
  readonly id: string;
  readonly course_id: string;
  readonly progress: number;
  readonly completed_at: string | null;
  readonly certificate_url: string | null;
}

interface Props {
  readonly course: Course;
  readonly enrollment?: Enrollment;
  readonly onStartQuiz: (enrollmentId: string) => void;
  readonly onEnroll: (courseId: string) => Promise<void>;
}

export default function CourseCard({ course, enrollment, onStartQuiz, onEnroll }: Props) {
  const [isPending, setIsPending] = useState(false);

  const handleEnroll = async () => {
    setIsPending(true);
    try {
      await onEnroll(course.id);
    } finally {
      setIsPending(false);
    }
  };

  const isEnrolled = !!enrollment;
  const progressPct = enrollment ? enrollment.progress : 0;
  const isCertified = enrollment ? !!enrollment.completed_at : false;
  const totalModules = course.content?.modules?.length || 0;

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-xl p-5 flex flex-col justify-between gap-4 shadow-md h-full">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          <h4 className="text-base font-bold text-[var(--empire-cream)]">{course.title}</h4>
          {isCertified && (
            <span className="bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider">
              Certified
            </span>
          )}
        </div>

        {course.description && (
          <p className="text-xs text-gray-400 leading-relaxed mt-1 line-clamp-3">{course.description}</p>
        )}

        {isEnrolled ? (
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 font-mono">
              <span>PROGRESS</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="bg-[var(--life-teal)] h-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 font-mono mt-3">
            {totalModules} educational modules inside this curriculum.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-2">
        {isEnrolled ? (
          <button
            id={`btn-start-quiz-${course.id}`}
            onClick={() => onStartQuiz(enrollment.id)}
            className="w-full bg-[var(--life-teal)] text-white hover:opacity-90 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
          >
            Take Certification Quiz
          </button>
        ) : (
          <button
            id={`btn-enroll-course-${course.id}`}
            onClick={handleEnroll}
            disabled={isPending}
            className="w-full bg-white/5 border border-white/10 text-[var(--empire-cream)] hover:bg-white/10 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? 'Enrolling...' : 'Enroll in Course'}
          </button>
        )}
      </div>
    </div>
  );
}
