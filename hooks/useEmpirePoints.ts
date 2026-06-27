// hooks/useEmpirePoints.ts — Optimistic points UI with GSAP animation

'use client';

import { useState, useCallback } from 'react';
import type { PointActivity } from '@/lib/gamification/points';
import { POINT_VALUES } from '@/lib/gamification/points';

export function useEmpirePoints(initialPoints: number) {
  const [displayPoints, setDisplayPoints] = useState(initialPoints);
  const [isPending, setIsPending] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);

  const awardOptimistic = useCallback((activity: PointActivity) => {
    const delta = POINT_VALUES[activity];
    setDisplayPoints((prev) => prev + delta);
    setLastDelta(delta);
    setIsPending(true);
    setTimeout(() => setLastDelta(null), 3000);
  }, []);

  const rollback = useCallback((activity: PointActivity) => {
    setDisplayPoints((prev) => prev - POINT_VALUES[activity]);
    setLastDelta(null);
    setIsPending(false);
  }, []);

  const confirm = useCallback(() => setIsPending(false), []);

  return { displayPoints, awardOptimistic, rollback, confirm, isPending, lastDelta };
}
