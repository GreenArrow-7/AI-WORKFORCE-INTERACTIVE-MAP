import { hierarchy, tree, type HierarchyNode } from 'd3-hierarchy';
import type { Catalog } from '@/lib/catalog';
import type { Agent, AgentId, DepartmentId } from '@/lib/schemas';
import {
  BRAIN_NODE_ID,
  type Bounds,
  type GraphEdge,
  type GraphLayout,
  type GraphNode,
  type LabelMode,
} from './types';

/* ---------------------------------------------------------------------------
   Geometry constants. Everything else is derived, so no coordinate is ever
   written into a component (§39).
   ------------------------------------------------------------------------ */

const RADIUS = { brain: 52, department: 40, function: 22, agent: 14 } as const;

/** Minimum arc length between sibling nodes; drives adaptive ring radii. */
const MIN_ARC = { department: 210, agent: 44, function: 120 } as const;

const OVERVIEW_MIN_RING = 340;

/**
 * The department view leaves a 60° wedge free for the Company Brain.
 *
 * Angles run clockwise from the top, so starting the tree at +30° and running
 * 300° puts the gap at the *top* — where the brain actually sits. Starting at
 * -150° would place the gap at the bottom and route the brain's link straight
 * through the agent ring.
 */
const DEPARTMENT_ARC = (300 * Math.PI) / 180;
const DEPARTMENT_ARC_START = (2 * Math.PI - DEPARTMENT_ARC) / 2;
const DEPARTMENT_MIN_AGENT_RING = 300;
const BRAIN_OFFSET_ABOVE = 95;

export interface LayoutInput {
  catalog: Catalog;
  /** null renders the overview; an id renders that department's tree. */
  focusDepartmentId: DepartmentId | null;
  /**
   * Agents to include. `null` means all. Filtering changes the layout input, not
   * the camera, which is why filters never disturb the viewport (§16).
   */
  visibleAgentIds: ReadonlySet<AgentId> | null;
}

/* ---------------------------------------------------------------------------
   Path helpers
   ------------------------------------------------------------------------ */

function polar(angle: number, radius: number): { x: number; y: number } {
  // -90° so index 0 sits at the top rather than at 3 o'clock.
  return { x: Math.cos(angle - Math.PI / 2) * radius, y: Math.sin(angle - Math.PI / 2) * radius };
}

/**
 * Radial link: a cubic whose control points sit at the midpoint radius on each
 * endpoint's own angle. This is the shape `d3.linkRadial` produces, written out
 * so `d3-shape` need not be a dependency.
 */
function radialLinkPath(a1: number, r1: number, a2: number, r2: number): string {
  const mid = (r1 + r2) / 2;
  const p1 = polar(a1, r1);
  const c1 = polar(a1, mid);
  const c2 = polar(a2, mid);
  const p2 = polar(a2, r2);
  return `M${p1.x.toFixed(2)},${p1.y.toFixed(2)}C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
}

/**
 * Dependency arc between two nodes on (roughly) the same ring, bowed toward the
 * origin. Curvature scales with angular distance so near neighbours get a gentle
 * arc and distant pairs cut across the middle instead of hugging the rim — which
 * is what stops the dependency layer turning into a thicket (§8).
 */
function dependencyArcPath(from: GraphNode, to: GraphNode): string {
  let delta = to.angle - from.angle;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;

  // Bow inward, but never far enough to cross the middle of the composition —
  // that is what turns a dependency layer into a thicket.
  const spread = Math.min(Math.abs(delta) / Math.PI, 1);
  const pull = 0.9 - spread * 0.2;
  const midAngle = from.angle + delta / 2;
  const midRadius = ((Math.hypot(from.x, from.y) + Math.hypot(to.x, to.y)) / 2) * pull;
  const c = polar(midAngle, midRadius);

  return `M${from.x.toFixed(2)},${from.y.toFixed(2)}Q${c.x.toFixed(2)},${c.y.toFixed(2)} ${to.x.toFixed(2)},${to.y.toFixed(2)}`;
}

/**
 * Room a node's label needs beyond its own radius. Without this the camera fits
 * the circles and clips every label, which is what the user actually reads.
 */
const LABEL_ALLOWANCE: Record<GraphNode['kind'], number> = {
  brain: 46,
  department: 46,
  function: 96,
  agent: 132,
};

function boundsOf(nodes: readonly GraphNode[]): Bounds {
  if (nodes.length === 0) return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const reach = n.radius + LABEL_ALLOWANCE[n.kind];
    minX = Math.min(minX, n.x - reach);
    minY = Math.min(minY, n.y - reach);
    maxX = Math.max(maxX, n.x + reach);
    maxY = Math.max(maxY, n.y + reach);
  }
  return { minX, minY, maxX, maxY };
}

/* ---------------------------------------------------------------------------
   Label orientation

   A rotated radial label is the only treatment that scales: labels fan out with
   their ring, so they never collide however many siblings there are. The price
   is that one at the top or bottom of the circle ends up near-vertical, which is
   genuinely hard to read. Upright labels are better there — but only where they
   fit, and whether they fit is geometry rather than taste.
   ------------------------------------------------------------------------ */

/** Agent label line height, from the 10.5px type size, plus breathing room. */
const LABEL_LINE_HEIGHT = 14;

/**
 * Estimated rendered width of a label. The layout is pure and runs with no DOM,
 * so it cannot measure text. The 10.5px agent label measures 5.0–6.1px per
 * character in the browser, so 6.2 sits just above the widest real case: the
 * estimate errs long, which fails safe toward the rotated labels that always fit.
 */
function estimateLabelWidth(text: string): number {
  return text.length * 6.2 + 20;
}

/**
 * Whether every label on a ring can stay upright.
 *
 * Two neighbours can both stay upright only if they are far enough apart
 * horizontally to stand side by side, or far enough apart vertically to sit on
 * separate lines. One crowded pair sends the whole ring back to rotated labels:
 * a ring that mixes the two treatments reads as a bug rather than a decision.
 */
function uprightLabelsFit(angles: readonly number[], radius: number, labelWidth: number): boolean {
  const sorted = [...angles].sort((a, b) => a - b);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous === undefined || current === undefined) continue;
    // Positions are (sin, -cos) · radius, so these are the on-screen gaps.
    const horizontal = Math.abs(Math.sin(current) - Math.sin(previous)) * radius;
    const vertical = Math.abs(Math.cos(current) - Math.cos(previous)) * radius;
    if (horizontal < labelWidth && vertical < LABEL_LINE_HEIGHT) return false;
  }
  return true;
}

/** Ring radius wide enough to give `count` siblings `minArc` of separation. */
function ringRadius(count: number, minArc: number, arcSpan: number, floor: number): number {
  if (count <= 1) return floor;
  return Math.max(floor, (count * minArc) / arcSpan);
}

/* ---------------------------------------------------------------------------
   Overview
   ------------------------------------------------------------------------ */

function overviewLayout(input: LayoutInput): GraphLayout {
  const { catalog, visibleAgentIds } = input;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const brain: GraphNode = {
    id: BRAIN_NODE_ID,
    kind: 'brain',
    label: catalog.companyBrain?.name ?? 'Company Brain',
    sublabel: 'Shared context',
    x: 0,
    y: 0,
    radius: RADIUS.brain,
    angle: 0,
    departmentId: null,
    accent: null,
    autonomy: null,
    parentId: null,
    labelMode: 'horizontal',
  };
  nodes.push(brain);

  const departments = catalog.departments;
  const ring = ringRadius(departments.length, MIN_ARC.department, 2 * Math.PI, OVERVIEW_MIN_RING);

  departments.forEach((department, index) => {
    const angle = (index / Math.max(departments.length, 1)) * 2 * Math.PI;
    const { x, y } = polar(angle, ring);

    const all = catalog.indexes.agentsByDepartment.get(department.id) ?? [];
    const visible = visibleAgentIds ? all.filter((a) => visibleAgentIds.has(a.id)) : all;

    nodes.push({
      id: department.id,
      kind: 'department',
      label: department.name,
      sublabel: `${visible.length} agent${visible.length === 1 ? '' : 's'}`,
      x,
      y,
      radius: RADIUS.department,
      angle,
      departmentId: department.id,
      accent: department.accent,
      autonomy: null,
      parentId: BRAIN_NODE_ID,
      labelMode: 'horizontal',
    });

    edges.push({
      id: `e-${BRAIN_NODE_ID}-${department.id}`,
      kind: 'hierarchy',
      source: BRAIN_NODE_ID,
      target: department.id,
      path: radialLinkPath(angle, RADIUS.brain, angle, ring - RADIUS.department),
    });
  });

  return {
    mode: 'overview',
    focusId: null,
    nodes,
    edges,
    bounds: boundsOf(nodes),
    nodeById: new Map(nodes.map((n) => [n.id, n])),
  };
}

/* ---------------------------------------------------------------------------
   Department tree
   ------------------------------------------------------------------------ */

interface TreeDatum {
  id: string;
  kind: 'department' | 'function' | 'agent';
  label: string;
  sublabel: string | null;
  agent: Agent | null;
  children: TreeDatum[];
}

function departmentLayout(input: LayoutInput): GraphLayout {
  const { catalog, focusDepartmentId, visibleAgentIds } = input;
  const department = focusDepartmentId ? catalog.indexes.departmentById.get(focusDepartmentId) : undefined;
  if (!department) return overviewLayout({ ...input, focusDepartmentId: null });

  const functions = catalog.indexes.functionsByDepartment.get(department.id) ?? [];

  const functionData: TreeDatum[] = functions.map((fn) => {
    const all = catalog.indexes.agentsByFunction.get(fn.id) ?? [];
    const visible = visibleAgentIds ? all.filter((a) => visibleAgentIds.has(a.id)) : all;
    return {
      id: fn.id,
      kind: 'function',
      label: fn.name,
      sublabel: `${visible.length} agent${visible.length === 1 ? '' : 's'}`,
      agent: null,
      children: visible.map((agent) => ({
        id: agent.id,
        kind: 'agent' as const,
        label: agent.name,
        sublabel: fn.name,
        agent,
        children: [],
      })),
    };
  });

  const visibleAgentCount = functionData.reduce((sum, f) => sum + f.children.length, 0);

  const root: TreeDatum = {
    id: department.id,
    kind: 'department',
    // A graph label has to be a figure, not a sentence — the mission belongs in
    // the breadcrumb and the drawer, where there is room to read it.
    label: department.name,
    sublabel: `${functionData.length} functions · ${visibleAgentCount} agents`,
    agent: null,
    children: functionData,
  };
  const agentRing = ringRadius(visibleAgentCount, MIN_ARC.agent, DEPARTMENT_ARC, DEPARTMENT_MIN_AGENT_RING);
  const functionRing = Math.max(
    ringRadius(functionData.length, MIN_ARC.function, DEPARTMENT_ARC, agentRing * 0.5),
    agentRing * 0.46,
  );

  // d3-hierarchy is used purely as a calculator: it assigns angular positions,
  // and we convert them to cartesian ourselves. It never touches the DOM.
  const rootNode = hierarchy<TreeDatum>(root, (d) => d.children);
  const layoutTree = tree<TreeDatum>()
    .size([DEPARTMENT_ARC, 1])
    // Cousins get twice the gap of siblings, which is what visually groups the
    // agents under their function without drawing a container around them.
    .separation((a, b) => (a.parent === b.parent ? 1 : 2));
  layoutTree(rootNode);

  // Decided here rather than in the node component because only the layout knows
  // how crowded the ring is (§2: the component stays dumb).
  const agentAngles = rootNode
    .leaves()
    .filter((leaf) => leaf.data.kind === 'agent')
    .map((leaf) => DEPARTMENT_ARC_START + ((leaf as HierarchyNode<TreeDatum> & { x?: number }).x ?? 0));
  const widestAgentLabel = functionData.reduce(
    (widest, fn) => fn.children.reduce((w, child) => Math.max(w, estimateLabelWidth(child.label)), widest),
    0,
  );
  const agentLabelMode: LabelMode = uprightLabelsFit(agentAngles, agentRing, widestAgentLabel)
    ? 'horizontal'
    : 'radial';

  const radiusForDepth = (depth: number): number =>
    depth === 0 ? 0 : depth === 1 ? functionRing : agentRing;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const brain: GraphNode = {
    id: BRAIN_NODE_ID,
    kind: 'brain',
    label: catalog.companyBrain?.name ?? 'Company Brain',
    sublabel: 'Shared context',
    x: 0,
    y: -(agentRing + BRAIN_OFFSET_ABOVE),
    radius: RADIUS.brain * 0.78,
    angle: 0,
    departmentId: null,
    accent: null,
    autonomy: null,
    parentId: null,
    labelMode: 'horizontal',
  };
  nodes.push(brain);

  rootNode.each((node: HierarchyNode<TreeDatum> & { x?: number; y?: number }) => {
    const datum = node.data;
    const depth = node.depth;
    const angle = depth === 0 ? 0 : DEPARTMENT_ARC_START + (node.x ?? 0);
    const radius = radiusForDepth(depth);
    const { x, y } = depth === 0 ? { x: 0, y: 0 } : polar(angle, radius);

    nodes.push({
      id: datum.id,
      kind: datum.kind,
      label: datum.label,
      sublabel: datum.sublabel,
      x,
      y,
      radius: datum.kind === 'department' ? RADIUS.department : datum.kind === 'function' ? RADIUS.function : RADIUS.agent,
      angle,
      departmentId: department.id,
      accent: department.accent,
      autonomy: datum.agent?.autonomy ?? null,
      parentId: node.parent?.data.id ?? BRAIN_NODE_ID,
      // Only the agent ring is dense enough for orientation to be a question.
      labelMode: datum.kind === 'agent' ? agentLabelMode : 'horizontal',
    });

    const parent = node.parent as (HierarchyNode<TreeDatum> & { x?: number }) | null;
    if (parent) {
      const parentAngle = parent.depth === 0 ? angle : DEPARTMENT_ARC_START + (parent.x ?? 0);
      const parentRadius = radiusForDepth(parent.depth);
      const parentNodeRadius = parent.data.kind === 'department' ? RADIUS.department : RADIUS.function;
      const childNodeRadius = datum.kind === 'function' ? RADIUS.function : RADIUS.agent;
      edges.push({
        id: `e-${parent.data.id}-${datum.id}`,
        kind: 'hierarchy',
        source: parent.data.id,
        target: datum.id,
        path: radialLinkPath(
          parentAngle,
          parentRadius + (parent.depth === 0 ? parentNodeRadius : parentNodeRadius),
          angle,
          radius - childNodeRadius,
        ),
      });
    }
  });

  // Brain → department. Drawn as a plain vertical curve since the brain sits
  // outside the radial system.
  edges.push({
    id: `e-${BRAIN_NODE_ID}-${department.id}`,
    kind: 'hierarchy',
    source: BRAIN_NODE_ID,
    target: department.id,
    path: `M0,${(brain.y + brain.radius).toFixed(2)}C0,${(brain.y / 2).toFixed(2)} 0,${(brain.y / 4).toFixed(2)} 0,${(-RADIUS.department).toFixed(2)}`,
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Dependency edges, but only between agents both visible in this layout.
  for (const node of nodes) {
    if (node.kind !== 'agent') continue;
    const agent = catalog.indexes.agentById.get(node.id);
    if (!agent) continue;
    for (const depId of agent.dependencies) {
      const from = nodeById.get(depId);
      if (!from || from.kind !== 'agent') continue;
      edges.push({
        id: `d-${depId}-${node.id}`,
        kind: 'dependency',
        source: depId,
        target: node.id,
        path: dependencyArcPath(from, node),
      });
    }
  }

  return {
    mode: 'department',
    focusId: department.id,
    nodes,
    edges,
    bounds: boundsOf(nodes),
    nodeById,
  };
}

/**
 * Computes a full layout.
 *
 * Pure: the same input always produces the same output, which is what makes it
 * safe to memoise on `(focusDepartmentId, filter signature)` and recompute only
 * when one of those actually changes (§27).
 */
export function computeLayout(input: LayoutInput): GraphLayout {
  return input.focusDepartmentId ? departmentLayout(input) : overviewLayout(input);
}
