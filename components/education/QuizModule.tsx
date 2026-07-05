'use client';
// components/education/QuizModule.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { completeQuiz } from '@/lib/actions/education';

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

interface Props {
  readonly enrollmentId: string;
  readonly course: Course;
  readonly onClose: () => void;
  readonly onQuizFinished?: () => void;
}

export default function QuizModule({ enrollmentId, course, onClose, onQuizFinished }: Props) {
  const [isPending, startTransition] = useTransition();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ success: boolean; score?: number; certified?: boolean; error?: string } | null>(null);

  const questions = course.content?.quizzes || [];

  const handleSelectOption = (opt: string) => {
    if (!questions[currentIdx]) return;
    const questionId = questions[currentIdx].id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: opt,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await completeQuiz(enrollmentId, answers);
      if (res.success) {
        setResult({
          success: true,
          score: res.score,
          certified: res.passed,
        });
      } else {
        setResult({
          success: false,
          error: res.error || 'Failed to submit quiz results',
        });
      }
    });
  };

  const currentQuestion = questions[currentIdx];
  const selectedOption = currentQuestion ? (answers[currentQuestion.id] || '') : '';

  if (questions.length === 0) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-center">
        <h3 className="text-base font-bold text-[var(--empire-cream)]">No Quiz Questions Available</h3>
        <p className="text-xs text-gray-400">This course does not currently have any certification questions configured.</p>
        <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-xs font-bold py-2 rounded-xl border border-white/10 uppercase cursor-pointer">
          Close Window
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-border)] max-w-lg w-full p-6 shadow-2xl flex flex-col gap-6 relative">
      <div className="flex justify-between items-start gap-4 border-b border-[var(--bg-border)]/20 pb-4">
        <div>
          <span className="text-[9px] font-bold text-[var(--empire-gold)] uppercase tracking-widest font-mono">Certification Assessment</span>
          <h3 className="text-base font-bold text-[var(--empire-cream)] mt-1">{course.title} Quiz</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {result ? (
        <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
          {result.success && result.certified ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[var(--life-teal)]/20 text-[var(--life-teal)] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-bold">workspace_premium</span>
              </div>
              <h4 className="text-base font-bold text-[var(--empire-cream)]">Congratulations! You Passed!</h4>
              <p className="text-xs text-gray-400 max-w-sm">
                You successfully scored {result.score}% and are now officially certified for this course track.
              </p>
            </>
          ) : result.success ? (
            <>
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-bold">cancel</span>
              </div>
              <h4 className="text-base font-bold text-[var(--empire-cream)]">Quiz Not Passed</h4>
              <p className="text-xs text-gray-400 max-w-sm">
                You scored {result.score}%. A passing grade of 70% or higher is required to qualify for certificate deployment. Keep studying and try again!
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-bold">warning</span>
              </div>
              <h4 className="text-base font-bold text-[var(--empire-cream)]">Submission Failed</h4>
              <p className="text-xs text-gray-400 max-w-sm">{result.error}</p>
            </>
          )}

          <button
            onClick={() => {
              if (onQuizFinished) onQuizFinished();
              onClose();
            }}
            className="bg-[var(--life-teal)] text-white hover:opacity-90 px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all mt-4 cursor-pointer"
          >
            Close Assessment
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Question Index Progress indicator */}
          <div className="flex justify-between text-[10px] font-bold text-gray-400 font-mono">
            <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
            <span>{Math.round(((currentIdx + 1) / questions.length) * 100)}%</span>
          </div>

          <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-xs text-[var(--empire-cream)] font-medium leading-relaxed">
            {currentQuestion.question}
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            {currentQuestion.options.map((opt) => (
              <div
                key={opt}
                onClick={() => handleSelectOption(opt)}
                className={`p-3 border rounded-xl flex items-center gap-3 cursor-pointer text-xs transition-all ${
                  selectedOption === opt
                    ? 'border-[var(--life-teal)] bg-[var(--life-teal)]/5 text-[var(--empire-cream)]'
                    : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                  selectedOption === opt ? 'border-[var(--life-teal)]' : 'border-gray-500'
                }`}>
                  {selectedOption === opt && <div className="w-1.5 h-1.5 rounded-full bg-[var(--life-teal)]" />}
                </div>
                <span>{opt}</span>
              </div>
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex justify-between items-center gap-4 border-t border-[var(--bg-border)]/20 pt-4 mt-2">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold px-4 py-2 rounded-xl uppercase transition-all cursor-pointer"
            >
              Previous
            </button>

            {currentIdx === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={isPending || Object.keys(answers).length < questions.length}
                className="bg-[var(--empire-gold)] text-black hover:opacity-90 disabled:opacity-50 text-xs font-bold px-6 py-2 rounded-xl uppercase transition-all cursor-pointer"
              >
                {isPending ? 'Grading...' : 'Submit Answers'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!selectedOption}
                className="bg-[var(--life-teal)] text-white hover:opacity-90 disabled:opacity-50 text-xs font-bold px-6 py-2 rounded-xl uppercase transition-all cursor-pointer"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export type { Question, Course };
