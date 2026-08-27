import type { Catalog } from '@/lib/catalog';

export type ViewMode = 'map' | 'rollout' | 'command-centers';

export const VIEW_MODES: readonly ViewMode[] = ['map', 'rollout', 'command-centers'];

/** The slug the Company Brain occupies in the department position of a map URL. */
export const BRAIN_SLUG = 'brain';

/**
 * A URL expressed as intent. Slugs here are unvalidated — `resolveRoute` is what
 * checks them against the catalogue, so parsing stays pure and testable.
 */
export interface RouteState {
  view: ViewMode;
  departmentSlug: string | null;
  agentSlug: string | null;
  commandCenterSlug: string | null;
  brainOpen: boolean;
}

export const DEFAULT_ROUTE: RouteState = {
  view: 'map',
  departmentSlug: null,
  agentSlug: null,
  commandCenterSlug: null,
  brainOpen: false,
};

function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as readonly string[]).includes(value);
}

function segmentsOf(pathname: string): string[] {
  return pathname.split('/').filter((s) => s.length > 0);
}

/**
 * Parses a pathname into route intent.
 *
 * Returns `null` only for paths this app does not own; every path it does own
 * resolves to *some* state, because an unrecognised trailing segment should
 * degrade to the nearest sensible view rather than 404 the whole app (§36).
 */
export function parseRoute(pathname: string): RouteState | null {
  const segments = segmentsOf(pathname);
  const head = segments[0];

  // "/" is the map.
  if (head === undefined) return { ...DEFAULT_ROUTE };

  // "/agents/<slug>" is a resolver route; it carries an agent and no view yet.
  if (head === 'agents') {
    const slug = segments[1];
    return slug === undefined
      ? { ...DEFAULT_ROUTE }
      : { ...DEFAULT_ROUTE, agentSlug: slug };
  }

  if (!isViewMode(head)) return null;

  if (head === 'command-centers') {
    return { ...DEFAULT_ROUTE, view: 'command-centers', commandCenterSlug: segments[1] ?? null };
  }

  const second = segments[1] ?? null;
  const third = segments[2] ?? null;

  if (second === BRAIN_SLUG) {
    // The brain has no rollout view; treat /rollout/brain as the map.
    return { ...DEFAULT_ROUTE, view: 'map', brainOpen: true };
  }

  return {
    ...DEFAULT_ROUTE,
    view: head,
    departmentSlug: second,
    agentSlug: third,
  };
}

/** Builds the canonical pathname for a route state. Inverse of `parseRoute`. */
export function buildPath(state: RouteState): string {
  if (state.view === 'command-centers') {
    return state.commandCenterSlug ? `/command-centers/${state.commandCenterSlug}` : '/command-centers';
  }
  if (state.view === 'map' && state.brainOpen) return `/map/${BRAIN_SLUG}`;

  const parts: string[] = [state.view];
  if (state.departmentSlug) {
    parts.push(state.departmentSlug);
    if (state.agentSlug) parts.push(state.agentSlug);
  }
  return `/${parts.join('/')}`;
}

export interface ResolvedRoute {
  state: RouteState;
  /** True when a slug in the URL did not exist and the state was corrected. */
  corrected: boolean;
}

/**
 * Checks route intent against the catalogue and repairs it.
 *
 * An unknown department slug falls back to the overview; an unknown agent slug
 * is dropped but its department is kept; an agent named without a department
 * (the `/agents/<slug>` route) gains its department. Callers use `corrected` to
 * decide whether to `replaceState` the tidied URL back into the address bar.
 */
export function resolveRoute(state: RouteState, catalog: Catalog): ResolvedRoute {
  const next: RouteState = { ...state };
  let corrected = false;

  if (next.view === 'command-centers') {
    if (next.commandCenterSlug && !catalog.indexes.commandCenterBySlug.has(next.commandCenterSlug)) {
      next.commandCenterSlug = null;
      corrected = true;
    }
    return { state: next, corrected };
  }

  if (next.brainOpen) return { state: next, corrected };

  // An agent slug is authoritative: it can supply the department it belongs to.
  const agent = next.agentSlug ? catalog.indexes.agentBySlug.get(next.agentSlug) : undefined;
  if (next.agentSlug && !agent) {
    next.agentSlug = null;
    corrected = true;
  }

  if (agent) {
    const owning = catalog.indexes.departmentById.get(agent.departmentId);
    if (owning && next.departmentSlug !== owning.slug) {
      next.departmentSlug = owning.slug;
      corrected = true;
    }
  } else if (next.departmentSlug && !catalog.indexes.departmentBySlug.has(next.departmentSlug)) {
    next.departmentSlug = null;
    corrected = true;
  }

  // Rollout always shows a department; default to the first one.
  if (next.view === 'rollout' && !next.departmentSlug) {
    const first = catalog.departments[0];
    if (first) {
      next.departmentSlug = first.slug;
      corrected = true;
    }
  }

  return { state: next, corrected };
}
