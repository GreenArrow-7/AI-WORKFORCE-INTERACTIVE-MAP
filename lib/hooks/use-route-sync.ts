'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { buildPath, parseRoute, resolveRoute, DEFAULT_ROUTE, type ViewMode } from '@/lib/routing';
import { useWorkforceStore } from '@/stores/workforce-store';

/**
 * Makes the URL and the store agree, in that direction.
 *
 * The URL is authoritative on every pathname change — including back and
 * forward. Interactions push a URL *and* set the store, so when the pathname
 * change arrives this re-derives the same state and does nothing, which is what
 * keeps the two from fighting.
 *
 * A URL naming something that does not exist is repaired with `replaceState`
 * rather than 404ing the app (§36).
 */
export function useRouteSync(view: ViewMode): void {
  const pathname = usePathname();

  useEffect(() => {
    const parsed = parseRoute(pathname) ?? { ...DEFAULT_ROUTE, view };
    const { state, corrected } = resolveRoute(parsed, catalog);
    const store = useWorkforceStore.getState();

    if (store.viewMode !== state.view) store.setViewMode(state.view);

    const department = state.departmentSlug
      ? (catalog.indexes.departmentBySlug.get(state.departmentSlug)?.id ?? null)
      : null;
    if (store.focusedDepartmentId !== department) store.focusDepartment(department);

    const agent = state.agentSlug ? (catalog.indexes.agentBySlug.get(state.agentSlug)?.id ?? null) : null;
    if (store.selectedAgentId !== agent) store.selectAgent(agent);

    if (store.brainOpen !== state.brainOpen) store.openBrain(state.brainOpen);

    const centre = state.commandCenterSlug
      ? (catalog.indexes.commandCenterBySlug.get(state.commandCenterSlug)?.id ?? null)
      : null;
    if (store.commandCenterId !== centre) store.setCommandCenter(centre);

    if (corrected) {
      const target = buildPath(state);
      if (window.location.pathname !== target) window.history.replaceState(null, '', target);
    }
  }, [pathname, view]);
}
