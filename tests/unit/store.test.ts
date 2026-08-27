// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { catalog } from '@/lib/catalog';
import { matchesFilters } from '@/lib/hooks/use-visible-agents';
import { EMPTY_FILTERS, isFilterActive, setRepository, useWorkforceStore } from '@/stores/workforce-store';
import { MemoryRepository } from '@/lib/storage';
import type { Agent } from '@/lib/schemas';

const NOW = '2026-01-15T09:30:00.000Z';

function reset(): void {
  useWorkforceStore.setState({
    agentStates: {},
    filters: EMPTY_FILTERS,
    workspace: { name: 'My workspace', theme: 'dark' },
    notices: [],
  });
}

describe('filters', () => {
  const agent = catalog.indexes.agentById.get('agt-outreach-writer') as Agent;

  it('reports no active facets for the empty filter', () => {
    expect(isFilterActive(EMPTY_FILTERS)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTERS, hasSkills: true })).toBe(true);
  });

  it('passes every agent when nothing is selected', () => {
    for (const a of catalog.agents) {
      expect(matchesFilters(a, EMPTY_FILTERS, 'not_started')).toBe(true);
    }
  });

  it('intersects across facets and unions within one', () => {
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, departmentIds: ['dep-sales'] }, 'not_started')).toBe(true);
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, departmentIds: ['dep-marketing'] }, 'not_started')).toBe(false);
    expect(
      matchesFilters(agent, { ...EMPTY_FILTERS, departmentIds: ['dep-sales', 'dep-marketing'] }, 'not_started'),
    ).toBe(true);

    // Right department, wrong autonomy — both must hold.
    expect(
      matchesFilters(agent, { ...EMPTY_FILTERS, departmentIds: ['dep-sales'], autonomy: ['autonomous'] }, 'not_started'),
    ).toBe(false);
  });

  it('filters on user status, which is not a property of the agent', () => {
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, status: ['live'] }, 'live')).toBe(true);
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, status: ['live'] }, 'planned')).toBe(false);
  });

  it('matches an agent using any one of the selected tools', () => {
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, toolIds: ['tl-gmail'] }, 'not_started')).toBe(true);
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, toolIds: ['tl-stripe'] }, 'not_started')).toBe(false);
  });

  it('supports the has-skills and has-dependencies facets', () => {
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, hasSkills: true }, 'not_started')).toBe(true);
    expect(matchesFilters(agent, { ...EMPTY_FILTERS, hasDependencies: true }, 'not_started')).toBe(true);

    const foundational = catalog.indexes.agentById.get('agt-lead-sourcing') as Agent;
    expect(matchesFilters(foundational, { ...EMPTY_FILTERS, hasDependencies: true }, 'not_started')).toBe(false);
  });
});

describe('workforce store', () => {
  beforeEach(() => {
    setRepository(new MemoryRepository());
    reset();
  });

  it('records a status change without touching the catalogue', () => {
    const before = catalog.indexes.agentById.get('agt-lead-sourcing');
    useWorkforceStore.getState().setStatus('agt-lead-sourcing', 'live');

    expect(useWorkforceStore.getState().agentStates['agt-lead-sourcing']?.status).toBe('live');
    // The canonical record is unchanged and carries no status of its own.
    expect(catalog.indexes.agentById.get('agt-lead-sourcing')).toBe(before);
    expect('status' in (before ?? {})).toBe(false);
  });

  it('refuses a status for an agent that does not exist', () => {
    useWorkforceStore.getState().setStatus('agt-imaginary', 'live');
    expect(useWorkforceStore.getState().agentStates['agt-imaginary']).toBeUndefined();
  });

  it('keeps notes and status independent', () => {
    const store = useWorkforceStore.getState();
    store.setStatus('agt-lead-sourcing', 'building');
    store.setNotes('agt-lead-sourcing', 'Waiting on data access.');

    const state = useWorkforceStore.getState().agentStates['agt-lead-sourcing'];
    expect(state?.status).toBe('building');
    expect(state?.notes).toBe('Waiting on data access.');
  });

  it('clears a note set to whitespace rather than storing it', () => {
    const store = useWorkforceStore.getState();
    store.setNotes('agt-lead-sourcing', '   ');
    expect(useWorkforceStore.getState().agentStates['agt-lead-sourcing']?.notes).toBeUndefined();
  });

  it('drops imported states for agents outside the catalogue', () => {
    const result = useWorkforceStore.getState().importSnapshot({
      version: '1.0',
      workspace: { name: 'Imported', theme: 'light' },
      agentStatuses: {
        'agt-lead-sourcing': { agentId: 'agt-lead-sourcing', status: 'live', updatedAt: NOW },
        'agt-from-another-catalogue': { agentId: 'agt-from-another-catalogue', status: 'live', updatedAt: NOW },
      },
      updatedAt: NOW,
    });

    expect(result).toEqual({ applied: 1, skipped: 1 });
    const states = useWorkforceStore.getState().agentStates;
    expect(states['agt-lead-sourcing']?.status).toBe('live');
    expect(states['agt-from-another-catalogue']).toBeUndefined();
    expect(useWorkforceStore.getState().workspace.name).toBe('Imported');
  });

  it('replaces rather than merges on import, so an export round-trips exactly', () => {
    const store = useWorkforceStore.getState();
    store.setStatus('agt-contact-enrichment', 'building');
    store.importSnapshot({
      version: '1.0',
      workspace: { name: 'W', theme: 'dark' },
      agentStatuses: { 'agt-lead-sourcing': { agentId: 'agt-lead-sourcing', status: 'live', updatedAt: NOW } },
      updatedAt: NOW,
    });

    expect(Object.keys(useWorkforceStore.getState().agentStates)).toEqual(['agt-lead-sourcing']);
  });

  it('round-trips its own snapshot', () => {
    useWorkforceStore.getState().setStatus('agt-lead-sourcing', 'planned');
    const snapshot = useWorkforceStore.getState().toSnapshot();

    useWorkforceStore.getState().resetProgress();
    expect(useWorkforceStore.getState().agentStates).toEqual({});

    useWorkforceStore.getState().importSnapshot(snapshot);
    expect(useWorkforceStore.getState().agentStates['agt-lead-sourcing']?.status).toBe('planned');
  });

  it('resets every agent to not started', () => {
    useWorkforceStore.getState().setStatus('agt-lead-sourcing', 'live');
    useWorkforceStore.getState().resetProgress();
    expect(useWorkforceStore.getState().agentStates).toEqual({});
  });
});
