'use client';

import { useCallback } from 'react';
import { buildPath, type RouteState } from '@/lib/routing';

/**
 * URL updates that do not remount anything.
 *
 * Next's App Router syncs `usePathname` with native `history.pushState`
 * (supported since 14.1), so this changes the address bar and the route hooks
 * without a server round-trip and without tearing down the graph — which is
 * exactly what §7 requires: the camera animates, it does not navigate.
 */
export function useAppNavigation() {
  const push = useCallback((state: RouteState) => {
    const path = buildPath(state);
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, []);

  /** Used to tidy a URL that named something that does not exist (§36). */
  const replace = useCallback((state: RouteState) => {
    const path = buildPath(state);
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.replaceState(null, '', path);
    }
  }, []);

  return { push, replace };
}
