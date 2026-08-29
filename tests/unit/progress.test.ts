import { describe, expect, it } from 'vitest';
import { catalog } from '@/lib/catalog';
import {
  blockersFor,
  computeProgress,
  recommendNextDeployments,
  statusOf,
  type AgentStateMap,
} from '@/lib/progress/compute';
import type { AgentStatus } from '@/lib/schemas';

function states(entries: Record<string, AgentStatus>): AgentStateMap {
  const map: Record<string, { agentId: string; status: AgentStatus; updatedAt: string }> = {};
  for (const [agentId, status] of Object.entries(entries)) {
    map[agentId] = { agentId, status, updatedAt: '2026-01-01T00:00:00.000Z' };
  }
  return map;
}

describe('statusOf', () => {
  it('treats an agent with no stored state as not started', () => {
    expect(statusOf('agt-lead-sourcing', {})).toBe('not_started');
  });
});

describe('computeProgress', () => {
  it('reports zero completion for an untouched workspace', () => {
    const progress = computeProgress(catalog, {});
    expect(progress.company.completion).toBe(0);
    expect(progress.company.counts.not_started).toBe(catalog.agents.length);
    expect(progress.company.total).toBe(catalog.agents.length);
  });

  it('rolls a single live agent up to its function, department and company', () => {
    const progress = computeProgress(catalog, states({ 'agt-lead-sourcing': 'live' }));

    expect(progress.company.counts.live).toBe(1);
    expect(progress.byDepartment.get('dep-sales')?.counts.live).toBe(1);
    expect(progress.byFunction.get('fn-prospecting')?.counts.live).toBe(1);
    // …and nowhere else.
    expect(progress.byDepartment.get('dep-marketing')?.counts.live).toBe(0);
    expect(progress.byFunction.get('fn-outreach')?.counts.live).toBe(0);
  });

  it('counts planned and building as engaged but not complete', () => {
    const progress = computeProgress(
      catalog,
      states({ 'agt-lead-sourcing': 'planned', 'agt-contact-enrichment': 'building' }),
    );
    expect(progress.company.completion).toBe(0);
    expect(progress.company.engaged).toBeCloseTo(2 / catalog.agents.length);
  });

  it('always sums the four statuses to the total', () => {
    const progress = computeProgress(catalog, states({ 'agt-lead-sourcing': 'live' }));
    for (const summary of [progress.company, ...progress.byDepartment.values()]) {
      const sum =
        summary.counts.not_started + summary.counts.planned + summary.counts.building + summary.counts.live;
      expect(sum).toBe(summary.total);
    }
  });

  it('ignores states for agents that are not in the catalogue', () => {
    const progress = computeProgress(catalog, states({ 'agt-does-not-exist': 'live' }));
    expect(progress.company.counts.live).toBe(0);
  });
});

describe('recommendNextDeployments', () => {
  it('never recommends an agent whose dependencies are not live', () => {
    for (const recommendation of recommendNextDeployments(catalog, {}, 10)) {
      expect(recommendation.agent.dependencies).toEqual([]);
    }
  });

  it('prefers agents that unblock the most downstream work', () => {
    const [first] = recommendNextDeployments(catalog, {}, 3);
    expect(first).toBeDefined();
    // Lead Sourcing is depended on by three other Sales agents.
    expect(first?.unlocks).toBeGreaterThan(0);
    expect(first?.reason).toMatch(/Unblocks \d+ downstream/);
  });

  it('surfaces an agent once its blockers go live', () => {
    const before = recommendNextDeployments(catalog, {}, 50).map((r) => r.agent.id);
    expect(before).not.toContain('agt-account-research');

    const after = recommendNextDeployments(catalog, states({ 'agt-lead-sourcing': 'live' }), 50).map(
      (r) => r.agent.id,
    );
    expect(after).toContain('agt-account-research');
    expect(after).not.toContain('agt-lead-sourcing');
  });

  it('respects the limit', () => {
    expect(recommendNextDeployments(catalog, {}, 2)).toHaveLength(2);
  });
});

describe('blockersFor', () => {
  it('lists only the dependencies that are not yet live', () => {
    const agent = catalog.indexes.agentById.get('agt-outreach-writer');
    expect(agent).toBeDefined();
    if (!agent) return;

    expect(blockersFor(agent, catalog, {}).map((a) => a.id).sort()).toEqual(
      [...agent.dependencies].sort(),
    );

    const partial = states({ 'agt-account-research': 'live' });
    expect(blockersFor(agent, catalog, partial).map((a) => a.id)).not.toContain('agt-account-research');
  });
});
