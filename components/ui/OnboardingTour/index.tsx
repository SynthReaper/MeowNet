'use client';
// components/ui/OnboardingTour/index.tsx — Guided onboarding tour for new volunteers

import { useState, useEffect, useRef } from 'react';

interface TourStep {
  targetId: string;
  title: string;
  body: string;
  placement: 'bottom' | 'top' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'nav-logo',
    title: 'Welcome, Cat Guardian! 🐾',
    body: 'Welcome to MeowNet, the live mission-control command center for protecting and coordinating community cats.',
    placement: 'bottom',
  },
  {
    targetId: 'nav-map',
    title: 'Mission Control Map 🗺️',
    body: 'Visualize colonies, report new sightings, and watch real-time active TNR areas around your community.',
    placement: 'bottom',
  },
  {
    targetId: 'nav-cats',
    title: 'Cat Log Registry 🐱',
    body: 'View detailed registries of stray, adoptable, and adopted cats, and report a new feline friend in 30 seconds.',
    placement: 'bottom',
  },
  {
    targetId: 'nav-empire',
    title: 'The Empire Leaderboard 👑',
    body: 'Earn Empire Points for every helpful action you log, collect prestigious badges, and climb the rescue ranks!',
    placement: 'bottom',
  },
];

export default function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDone = localStorage.getItem('meownet_tour_done');
    if (isDone !== 'true') {
      setTimeout(() => setIsOpen(true), 0);
    }

    // Dynamic location transition detector to trigger tour walkthrough on new location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Math.round(position.coords.latitude * 10) / 10; // Round to 0.1 deg (~11km grid)
          const lon = Math.round(position.coords.longitude * 10) / 10;
          const lastLat = localStorage.getItem('meownet_last_lat');
          const lastLon = localStorage.getItem('meownet_last_lon');

          if (lastLat && lastLon) {
            if (lastLat !== String(lat) || lastLon !== String(lon)) {
              // Location shifted significantly - trigger the full guide walkthrough
              localStorage.setItem('meownet_tour_done', 'false');
              setIsOpen(true);
              setCurrentStep(0);
            }
          }
          localStorage.setItem('meownet_last_lat', String(lat));
          localStorage.setItem('meownet_last_lon', String(lon));
        },
        (err) => console.log('Walkthrough location check skipped:', err.message),
        { timeout: 5000 }
      );
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('meownet_tour_done', 'true');
    setIsOpen(false);
  };

  // Re-calculate placement coordinates based on targeted element
  useEffect(() => {
    if (!isOpen) return;

    const calculatePosition = () => {
      const step = TOUR_STEPS[currentStep];
      const element = document.getElementById(step.targetId);

      if (!element || element.getBoundingClientRect().width === 0) {
        // Fallback: Center of the screen
        setCoords({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 160,
        });
        return;
      }

      const rect = element.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // Bottom placement (position tooltip centered directly below target)
      const top = rect.bottom + scrollY + 12;
      let left = rect.left + scrollX + rect.width / 2 - 160; // 160 is half tooltip width (320px)

      // Out of bounds check (horizontal)
      if (left < 16) left = 16;
      if (left + 320 > window.innerWidth - 16) {
        left = window.innerWidth - 320 - 16;
      }

      setCoords({ top, left });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);

    // Dynamic highlight border class add
    const step = TOUR_STEPS[currentStep];
    const element = document.getElementById(step.targetId);
    if (element) {
      element.classList.add('relative', 'z-[99992]', 'ring-4', 'ring-[var(--empire-gold)]', 'ring-offset-2');
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
      if (element) {
        element.classList.remove('relative', 'z-[99992]', 'ring-4', 'ring-[var(--empire-gold)]', 'ring-offset-2');
      }
    };
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      <div className="tour-backdrop" onClick={handleSkip} />
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{
          top: `${coords.top}px`,
          left: `${coords.left}px`,
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-body text-[10px] font-bold text-[var(--empire-gold)] uppercase tracking-wider">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-semibold bg-transparent border-none cursor-pointer"
            >
              Skip
            </button>
          </div>
          
          <h4 className="font-display text-base font-bold text-[var(--text-primary)]">
            {step.title}
          </h4>
          
          <p className="font-body text-xs text-[var(--text-secondary)] leading-relaxed">
            {step.body}
          </p>

          <div className="flex justify-between items-center mt-2 border-t border-[var(--bg-border)]/40 pt-3">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentStep ? 'bg-[var(--empire-gold)] w-3' : 'bg-[var(--bg-border)]'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={handleNext}
              className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
