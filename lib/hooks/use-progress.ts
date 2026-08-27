'use client';

import { useMemo } from 'react';
import { catalog } from '@/lib/catalog';
import { computeProgress, type ProgressRollup } from '@/lib/progress/compute';
import { useWorkforceStore } from '@/stores/workforce-store';

/**
 * Progress rolled up across the company, memoised on the state map so a status
 * change recomputes once rather than once per subscriber.
 */
export function useProgress(): ProgressRollup {
  const states = useWorkforceStore((s) => s.agentStates);
  return useMemo(() => computeProgress(catalog, states), [states]);
}
