import { describe, expect, it } from 'vitest';
import { catalog } from '@/lib/catalog';
import { buildPath, parseRoute, resolveRoute, DEFAULT_ROUTE } from '@/lib/routing';

describe('parseRoute', () => {
  it('treats the root as the map', () => {
    expect(parseRoute('/')).toEqual(DEFAULT_ROUTE);
  });

  it('parses each view mode', () => {
    expect(parseRoute('/map')?.view).toBe('map');
    expect(parseRoute('/rollout')?.view).toBe('rollout');
    expect(parseRoute('/command-centers')?.view).toBe('command-centers');
  });

  it('parses a department and an agent', () => {
    expect(parseRoute('/map/sales')).toMatchObject({ view: 'map', departmentSlug: 'sales', agentSlug: null });
    expect(parseRoute('/map/sales/outreach-writer')).toMatchObject({
      view: 'map',
      departmentSlug: 'sales',
      agentSlug: 'outreach-writer',
    });
  });

  it('parses the brain route', () => {
    expect(parseRoute('/map/brain')).toMatchObject({ brainOpen: true, view: 'map' });
  });

  it('parses the /agents resolver route', () => {
    expect(parseRoute('/agents/outreach-writer')).toMatchObject({ agentSlug: 'outreach-writer' });
  });

  it('parses a command center slug', () => {
    expect(parseRoute('/command-centers/pipeline')?.commandCenterSlug).toBe('pipeline');
  });

  it('tolerates trailing slashes and repeated separators', () => {
    expect(parseRoute('/map/sales/')).toMatchObject({ departmentSlug: 'sales' });
    expect(parseRoute('//map//sales//')).toMatchObject({ departmentSlug: 'sales' });
  });

  it('returns null only for paths this app does not own', () => {
    expect(parseRoute('/settings')).toBeNull();
    expect(parseRoute('/map/anything-at-all')).not.toBeNull();
  });
});

describe('buildPath', () => {
  it('round-trips every route it can parse', () => {
    for (const path of [
      '/map',
      '/map/sales',
      '/map/sales/outreach-writer',
      '/map/brain',
      '/rollout',
      '/rollout/sales',
      '/command-centers',
      '/command-centers/pipeline',
    ]) {
      const parsed = parseRoute(path);
      expect(parsed, path).not.toBeNull();
      if (parsed) expect(buildPath(parsed)).toBe(path);
    }
  });

  it('drops an agent when no department is set, since the URL cannot express it', () => {
    expect(buildPath({ ...DEFAULT_ROUTE, agentSlug: 'outreach-writer' })).toBe('/map');
  });
});

describe('resolveRoute', () => {
  it('leaves a valid route untouched', () => {
    const parsed = parseRoute('/map/sales/outreach-writer');
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const { state, corrected } = resolveRoute(parsed, catalog);
    expect(corrected).toBe(false);
    expect(state.departmentSlug).toBe('sales');
  });

  it('drops an unknown department instead of failing', () => {
    const parsed = parseRoute('/map/not-a-department');
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const { state, corrected } = resolveRoute(parsed, catalog);
    expect(corrected).toBe(true);
    expect(state.departmentSlug).toBeNull();
  });

  it('drops an unknown agent but keeps a valid department', () => {
    const parsed = parseRoute('/map/sales/not-an-agent');
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const { state, corrected } = resolveRoute(parsed, catalog);
    expect(corrected).toBe(true);
    expect(state.agentSlug).toBeNull();
    expect(state.departmentSlug).toBe('sales');
  });

  it('lets an agent slug supply its own department', () => {
    const parsed = parseRoute('/agents/churn-risk');
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const { state, corrected } = resolveRoute(parsed, catalog);
    expect(corrected).toBe(true);
    expect(state.departmentSlug).toBe('customer');
    expect(buildPath(state)).toBe('/map/customer/churn-risk');
  });

  it('corrects a department that does not own the named agent', () => {
    const parsed = parseRoute('/map/marketing/outreach-writer');
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const { state, corrected } = resolveRoute(parsed, catalog);
    expect(corrected).toBe(true);
    expect(state.departmentSlug).toBe('sales');
  });

  it('gives rollout a default department', () => {
    const parsed = parseRoute('/rollout');
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const { state } = resolveRoute(parsed, catalog);
    expect(state.departmentSlug).toBe(catalog.departments[0]?.slug);
  });

  it('drops an unknown command center', () => {
    const parsed = parseRoute('/command-centers/nope');
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const { state, corrected } = resolveRoute(parsed, catalog);
    expect(corrected).toBe(true);
    expect(state.commandCenterSlug).toBeNull();
  });
});
