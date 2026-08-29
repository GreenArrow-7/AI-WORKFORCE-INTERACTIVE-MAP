import { describe, expect, it } from 'vitest';
import { catalog, loadCatalog } from '@/lib/catalog';

describe('authored catalogue', () => {
  it('loads with no integrity issues', () => {
    // Any issue here is an authoring bug in data/, not a loader bug.
    expect(catalog.issues).toEqual([]);
  });

  it('has the expected shape', () => {
    expect(catalog.departments).toHaveLength(7);
    expect(catalog.functionGroups).toHaveLength(21);
    expect(catalog.agents.length).toBeGreaterThanOrEqual(50);
    expect(catalog.commandCenters).toHaveLength(6);
    expect(catalog.companyBrain).not.toBeNull();
  });

  it('gives every agent a resolvable department and function', () => {
    for (const agent of catalog.agents) {
      expect(catalog.indexes.departmentById.has(agent.departmentId)).toBe(true);
      const fn = catalog.indexes.functionById.get(agent.functionId);
      expect(fn?.departmentId).toBe(agent.departmentId);
    }
  });

  it('resolves every skill and tool reference an agent declares', () => {
    for (const agent of catalog.agents) {
      for (const id of agent.skills) expect(catalog.indexes.skillById.has(id)).toBe(true);
      for (const id of agent.tools) expect(catalog.indexes.toolById.has(id)).toBe(true);
      for (const id of agent.dependencies) expect(catalog.indexes.agentById.has(id)).toBe(true);
    }
  });

  it('keeps agent slugs globally unique so /agents/<slug> resolves', () => {
    expect(catalog.indexes.agentBySlug.size).toBe(catalog.agents.length);
  });

  it('gives every function at least one agent', () => {
    for (const fn of catalog.functionGroups) {
      expect(catalog.indexes.agentsByFunction.get(fn.id)?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('loadCatalog resilience', () => {
  const base = {
    departments: [
      { id: 'd1', name: 'D', slug: 'd', description: 'x', mission: 'm', accent: 'amber', icon: 'Target', order: 0 },
    ],
    functionGroups: [{ id: 'f1', departmentId: 'd1', name: 'F', slug: 'f', description: 'x', order: 0 }],
    agents: [] as unknown[],
    skills: [] as unknown[],
    tools: [{ id: 't1', name: 'T', category: 'crm' }],
    commandCenters: [] as unknown[],
    companyBrain: { id: 'b', name: 'B', slug: 'b', tagline: 't', description: 'd', sections: [], sources: [] },
  };

  const agent = (over: Record<string, unknown> = {}) => ({
    id: 'a1',
    departmentId: 'd1',
    functionId: 'f1',
    name: 'A',
    slug: 'a',
    shortDescription: 's',
    description: 'd',
    businessOutcome: 'o',
    autonomy: 'assisted',
    maturity: 'proven',
    dependencies: [],
    skills: [],
    tools: [],
    inputs: [],
    outputs: [],
    replaces: [],
    humanInLoop: { owner: 'o', approvalPoints: [], retainedByHumans: [] },
    buildNotes: [],
    evolution: { manual: 'm', assisted: 'a', autonomous: 'x' },
    recommendedOrder: 0,
    ...over,
  });

  it('drops a malformed agent without losing the valid ones', () => {
    const result = loadCatalog({ ...base, agents: [agent(), { id: 'broken' }] });
    expect(result.agents).toHaveLength(1);
    expect(result.issues.some((i) => i.ref === 'broken' && i.severity === 'dropped')).toBe(true);
  });

  it('drops an agent pointing at a function in another department', () => {
    const result = loadCatalog({
      ...base,
      departments: [...base.departments, { ...base.departments[0]!, id: 'd2', slug: 'd2' }],
      agents: [agent({ departmentId: 'd2' })],
    });
    expect(result.agents).toHaveLength(0);
    expect(result.issues[0]?.message).toContain('different department');
  });

  it('repairs a dangling dependency instead of dropping the agent', () => {
    const result = loadCatalog({ ...base, agents: [agent({ dependencies: ['nope'] })] });
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]?.dependencies).toEqual([]);
    expect(result.issues.some((i) => i.severity === 'repaired')).toBe(true);
  });

  it('breaks a dependency cycle rather than hanging', () => {
    const result = loadCatalog({
      ...base,
      agents: [
        agent({ id: 'a1', slug: 'a1', dependencies: ['a2'] }),
        agent({ id: 'a2', slug: 'a2', dependencies: ['a1'] }),
      ],
    });
    expect(result.agents).toHaveLength(2);
    const edges = result.agents.flatMap((a) => a.dependencies.map((d) => `${a.id}->${d}`));
    expect(edges).toHaveLength(1);
    expect(result.issues.some((i) => i.message.includes('cycle'))).toBe(true);
    expect([...result.indexes.depthByAgent.values()].every(Number.isFinite)).toBe(true);
  });

  it('drops duplicate ids and slugs deterministically', () => {
    const result = loadCatalog({ ...base, agents: [agent(), agent({ name: 'Second' })] });
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]?.name).toBe('A');
  });

  it('survives a non-array collection', () => {
    const result = loadCatalog({ ...base, agents: 'not an array' });
    expect(result.agents).toEqual([]);
    expect(result.departments).toHaveLength(1);
  });

  it('computes dependency depth as the longest chain', () => {
    const result = loadCatalog({
      ...base,
      agents: [
        agent({ id: 'a1', slug: 'a1' }),
        agent({ id: 'a2', slug: 'a2', dependencies: ['a1'] }),
        agent({ id: 'a3', slug: 'a3', dependencies: ['a1', 'a2'] }),
      ],
    });
    expect(result.indexes.depthByAgent.get('a1')).toBe(0);
    expect(result.indexes.depthByAgent.get('a2')).toBe(1);
    expect(result.indexes.depthByAgent.get('a3')).toBe(2);
  });
});
