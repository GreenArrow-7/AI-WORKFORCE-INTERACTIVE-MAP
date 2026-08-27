'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks a media query, returning `null` until mounted.
 *
 * The three-state return is deliberate: the server cannot know the viewport, so
 * the first render must not branch on it. Layout is switched by CSS for the
 * first paint, and this hook then lets the hidden branch be unmounted entirely
 * — correct hydration first, efficiency second (§26, §39).
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Below Tailwind's `md`, where the radial map stops being usable. */
export function useIsSmallViewport(): boolean | null {
  return useMediaQuery('(max-width: 767px)');
}
