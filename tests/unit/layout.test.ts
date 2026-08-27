import { describe, expect, it } from 'vitest';
import { catalog, loadCatalog } from '@/lib/catalog';
import { computeLayout } from '@/lib/graph/layout';
import { computeHighlight, downstreamClosure, upstreamClosure } from '@/lib/graph/highlight';
import { BRAIN_NODE_ID } from '@/lib/graph/types';
import { isZoomIntent } from '@/lib/graph/camera';

describe('overview layout', () => {
  const layout = computeLayout({ catalog, focusDepartmentId: null, visibleAgentIds: null });

  it('places the brain at the origin with every department around it', () => {
    const brain = layout.nodeById.get(BRAIN_NODE_ID);
    expect(brain).toMatchObject({ x: 0, y: 0, kind: 'brain' });
    expect(layout.nodes.filter((n) => n.kind === 'department')).toHaveLength(catalog.departments.length);
  });

  it('connects every department to the brain', () => {
    const hierarchy = layout.edges.filter((e) => e.kind === 'hierarchy');
    expect(hierarchy).toHaveLength(catalog.departments.length);
    expect(hierarchy.every((e) => e.source === BRAIN_NODE_ID)).toBe(true);
  });

  it('spaces departments evenly on one ring', () => {
    const radii = layout.nodes
      .filter((n) => n.kind === 'department')
      .map((n) => Math.round(Math.hypot(n.x, n.y)));
    expect(new Set(radii).size).toBe(1);
  });

  it('is deterministic', () => {
    const again = computeLayout({ catalog, focusDepartmentId: null, visibleAgentIds: null });
    expect(again.nodes.map((n) => `${n.id}:${n.x.toFixed(3)},${n.y.toFixed(3)}`)).toEqual(
      layout.nodes.map((n) => `${n.id}:${n.x.toFixed(3)},${n.y.toFixed(3)}`),
    );
  });

  it('emits a finite path for every edge', () => {
    for (const edge of layout.edges) expect(edge.path).not.toMatch(/NaN|Infinity/);
  });
});

describe('department layout', () => {
  const layout = computeLayout({ catalog, focusDepartmentId: 'dep-sales', visibleAgentIds: null });

  it('renders the department, its functions and its agents', () => {
    expect(layout.nodes.filter((n) => n.kind === 'department')).toHaveLength(1);
    expect(layout.nodes.filter((n) => n.kind === 'function')).toHaveLength(3);
    expect(layout.nodes.filter((n) => n.kind === 'agent')).toHaveLength(9);
  });

  it('keeps the Company Brain present and above the tree', () => {
    const brain = layout.nodeById.get(BRAIN_NODE_ID);
    expect(brain).toBeDefined();
    expect(brain?.y).toBeLessThan(0);
  });

  it('leaves the brain wedge clear of tree nodes', () => {
    // The tree spans 30°–330°, so nothing may sit within ±30° of straight up.
    for (const node of layout.nodes) {
      if (node.kind === 'brain' || node.kind === 'department') continue;
      const degrees = ((node.angle * 180) / Math.PI + 360) % 360;
      const fromTop = Math.min(degrees, 360 - degrees);
      expect(fromTop, `${node.id} at ${degrees.toFixed(1)}°`).toBeGreaterThanOrEqual(29);
    }
  });

  it('puts agents further from the centre than their functions', () => {
    const functionRadius = Math.hypot(
      layout.nodes.find((n) => n.kind === 'function')?.x ?? 0,
      layout.nodes.find((n) => n.kind === 'function')?.y ?? 0,
    );
    for (const agent of layout.nodes.filter((n) => n.kind === 'agent')) {
      expect(Math.hypot(agent.x, agent.y)).toBeGreaterThan(functionRadius);
    }
  });

  it('draws dependency edges only between agents present in the layout', () => {
    const dependency = layout.edges.filter((e) => e.kind === 'dependency');
    expect(dependency.length).toBeGreaterThan(0);
    for (const edge of dependency) {
      expect(layout.nodeById.get(edge.source)?.kind).toBe('agent');
      expect(layout.nodeById.get(edge.target)?.kind).toBe('agent');
    }
  });

  it('never overlaps two sibling agents', () => {
    const agents = layout.nodes.filter((n) => n.kind === 'agent');
    for (let i = 0; i < agents.length; i += 1) {
      for (let j = i + 1; j < agents.length; j += 1) {
        const a = agents[i];
        const b = agents[j];
        if (!a || !b) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.radius + b.radius);
      }
    }
  });

  it('includes label room in its bounds, so a fit does not clip text', () => {
    const widest = Math.max(...layout.nodes.map((n) => Math.abs(n.x) + n.radius));
    expect(layout.bounds.maxX).toBeGreaterThan(widest);
  });

  it('falls back to the overview for an unknown department', () => {
    const fallback = computeLayout({ catalog, focusDepartmentId: 'nope', visibleAgentIds: null });
    expect(fallback.mode).toBe('overview');
  });

  it('honours a filtered agent set without dropping the structure', () => {
    const visible = new Set(['agt-lead-sourcing', 'agt-outreach-writer']);
    const filtered = computeLayout({ catalog, focusDepartmentId: 'dep-sales', visibleAgentIds: visible });
    expect(filtered.nodes.filter((n) => n.kind === 'agent')).toHaveLength(2);
    expect(filtered.nodes.filter((n) => n.kind === 'function')).toHaveLength(3);
  });

  it('survives a filter that hides every agent', () => {
    const empty = computeLayout({ catalog, focusDepartmentId: 'dep-sales', visibleAgentIds: new Set() });
    expect(empty.nodes.filter((n) => n.kind === 'agent')).toHaveLength(0);
    expect(empty.edges.every((e) => !e.path.includes('NaN'))).toBe(true);
  });
});

describe('highlight', () => {
  const layout = computeLayout({ catalog, focusDepartmentId: 'dep-sales', visibleAgentIds: null });

  it('walks the whole upstream closure, not just direct dependencies', () => {
    const closure = upstreamClosure(catalog, 'agt-follow-up');
    expect(closure).toContain('agt-sequence-orchestrator');
    expect(closure).toContain('agt-outreach-writer');
    expect(closure).toContain('agt-account-research');
    expect(closure).toContain('agt-lead-sourcing');
  });

  it('walks downstream too', () => {
    expect(downstreamClosure(catalog, 'agt-lead-sourcing')).toContain('agt-account-research');
  });

  it('includes the path back to the brain', () => {
    const highlight = computeHighlight(layout, catalog, 'agt-outreach-writer');
    expect(highlight?.nodes.has('agt-outreach-writer')).toBe(true);
    expect(highlight?.nodes.has('fn-outreach')).toBe(true);
    expect(highlight?.nodes.has('dep-sales')).toBe(true);
    expect(highlight?.nodes.has(BRAIN_NODE_ID)).toBe(true);
  });

  it('returns null when nothing is active', () => {
    expect(computeHighlight(layout, catalog, null)).toBeNull();
    expect(computeHighlight(layout, catalog, 'not-a-node')).toBeNull();
  });

  it('terminates on a cyclic graph rather than hanging', () => {
    const cyclic = loadCatalog({
      departments: [
        { id: 'd', name: 'D', slug: 'd', description: 'x', mission: 'm', accent: 'amber', icon: 'Target', order: 0 },
      ],
      functionGroups: [{ id: 'f', departmentId: 'd', name: 'F', slug: 'f', description: 'x', order: 0 }],
      agents: ['a', 'b'].map((id, index) => ({
        id,
        departmentId: 'd',
        functionId: 'f',
        name: id,
        slug: id,
        shortDescription: 's',
        description: 'd',
        businessOutcome: 'o',
        autonomy: 'assisted',
        maturity: 'proven',
        dependencies: [index === 0 ? 'b' : 'a'],
        skills: [],
        tools: [],
        inputs: [],
        outputs: [],
        replaces: [],
        humanInLoop: { owner: 'o', approvalPoints: [], retainedByHumans: [] },
        buildNotes: [],
        evolution: { manual: 'm', assisted: 'a', autonomous: 'x' },
        recommendedOrder: index,
      })),
      skills: [],
      tools: [],
      commandCenters: [],
      companyBrain: { id: 'b', name: 'B', slug: 'b', tagline: 't', description: 'd', sections: [], sources: [] },
    });
    expect(() => upstreamClosure(cyclic, 'a')).not.toThrow();
    expect(() => downstreamClosure(cyclic, 'a')).not.toThrow();
  });
});

describe('wheel intent', () => {
  const wheel = (init: Partial<WheelEvent>): WheelEvent =>
    ({ deltaX: 0, deltaY: 0, ctrlKey: false, metaKey: false, ...init }) as WheelEvent;

  it('treats a pinch gesture as zoom', () => {
    expect(isZoomIntent(wheel({ deltaY: 4, ctrlKey: true }))).toBe(true);
  });

  it('treats a quantised vertical wheel as zoom', () => {
    expect(isZoomIntent(wheel({ deltaY: -120 }))).toBe(true);
  });

  it('treats two-dimensional trackpad scrolling as pan', () => {
    expect(isZoomIntent(wheel({ deltaX: 12, deltaY: -8 }))).toBe(false);
    expect(isZoomIntent(wheel({ deltaY: 3.5 }))).toBe(false);
  });
});

/**
 * §27 requires the graph to stay smooth with hundreds of nodes. Layout is the
 * only super-linear step, so it is the one worth measuring.
 */
describe('performance at scale', () => {
  function syntheticCatalog(agentCount: number) {
    const functionCount = 12;
    return loadCatalog({
      departments: [
        { id: 'd', name: 'D', slug: 'd', description: 'x', mission: 'm', accent: 'amber', icon: 'Target', order: 0 },
      ],
      functionGroups: Array.from({ length: functionCount }, (_, i) => ({
        id: `f${i}`,
        departmentId: 'd',
        name: `F${i}`,
        slug: `f${i}`,
        description: 'x',
        order: i,
      })),
      agents: Array.from({ length: agentCount }, (_, i) => ({
        id: `a${i}`,
        departmentId: 'd',
        functionId: `f${i % functionCount}`,
        name: `Agent ${i}`,
        slug: `agent-${i}`,
        shortDescription: 's',
        description: 'd',
        businessOutcome: 'o',
        autonomy: (['human-led', 'assisted', 'autonomous'] as const)[i % 3],
        maturity: 'proven',
        // A realistic amount of cross-linking, without cycles.
        dependencies: i > 0 && i % 4 === 0 ? [`a${i - 1}`] : [],
        skills: [],
        tools: [],
        inputs: [],
        outputs: [],
        replaces: [],
        humanInLoop: { owner: 'o', approvalPoints: [], retainedByHumans: [] },
        buildNotes: [],
        evolution: { manual: 'm', assisted: 'a', autonomous: 'x' },
        recommendedOrder: i,
      })),
      skills: [],
      tools: [],
      commandCenters: [],
      companyBrain: { id: 'b', name: 'B', slug: 'b', tagline: 't', description: 'd', sections: [], sources: [] },
    });
  }

  it('lays out 300 agents correctly and quickly', () => {
    const big = syntheticCatalog(300);
    expect(big.issues).toEqual([]);

    const started = performance.now();
    const layout = computeLayout({ catalog: big, focusDepartmentId: 'd', visibleAgentIds: null });
    const elapsed = performance.now() - started;

    expect(layout.nodes.filter((n) => n.kind === 'agent')).toHaveLength(300);
    // Comfortably inside one animation frame on any modern machine.
    expect(elapsed).toBeLessThan(150);
  });

  it('grows the ring so 300 agents still do not overlap', () => {
    const big = syntheticCatalog(300);
    const layout = computeLayout({ catalog: big, focusDepartmentId: 'd', visibleAgentIds: null });
    const agents = layout.nodes.filter((n) => n.kind === 'agent');

    // Adjacent nodes on the ring are the only ones that can collide.
    const byAngle = [...agents].sort((a, b) => a.angle - b.angle);
    for (let i = 1; i < byAngle.length; i += 1) {
      const a = byAngle[i - 1];
      const b = byAngle[i];
      if (!a || !b) continue;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.radius + b.radius);
    }
  });

  it('scales to 1,000 agents without falling over', () => {
    const huge = syntheticCatalog(1000);
    const started = performance.now();
    const layout = computeLayout({ catalog: huge, focusDepartmentId: 'd', visibleAgentIds: null });
    const elapsed = performance.now() - started;

    expect(layout.nodes.filter((n) => n.kind === 'agent')).toHaveLength(1000);
    expect(elapsed).toBeLessThan(600);
  });

  it('computes a highlight closure in linear time on a deep chain', () => {
    const deep = syntheticCatalog(1000);
    const started = performance.now();
    upstreamClosure(deep, 'a996');
    expect(performance.now() - started).toBeLessThan(50);
  });
});
