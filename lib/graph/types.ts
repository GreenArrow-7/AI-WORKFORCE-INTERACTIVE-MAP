import type { Accent, Autonomy, DepartmentId } from '@/lib/schemas';

export type GraphMode = 'overview' | 'department';

export type GraphNodeKind = 'brain' | 'department' | 'function' | 'agent';

/**
 * How a node's label is drawn.
 *
 * `radial` rotates the label along its own radius — the only treatment that
 * scales to hundreds of siblings, since the labels fan out with the ring. Its
 * cost is that a label at the very bottom of the circle ends up vertical.
 * `horizontal` stays upright and is markedly easier to read, but only fits
 * where the ring is sparse enough that neighbours will not collide.
 */
export type LabelMode = 'radial' | 'horizontal';

/**
 * A positioned node. Coordinates are in graph space, which is unbounded and
 * independent of the viewport — the camera is what maps graph space to screen.
 */
export interface GraphNode {
  /** Unique within a layout. Equal to the catalogue id except for the brain. */
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Secondary line: agent count, function name, autonomy — depends on kind. */
  sublabel: string | null;
  x: number;
  y: number;
  radius: number;
  /** Angle from the layout origin, radians. Drives label side and text anchor. */
  angle: number;
  departmentId: DepartmentId | null;
  accent: Accent | null;
  autonomy: Autonomy | null;
  parentId: string | null;
  labelMode: LabelMode;
}

export type GraphEdgeKind = 'hierarchy' | 'dependency';

export interface GraphEdge {
  id: string;
  kind: GraphEdgeKind;
  source: string;
  target: string;
  /** Pre-computed SVG path. Computing it in the layout keeps render dumb. */
  path: string;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GraphLayout {
  mode: GraphMode;
  /** Department the layout is focused on, or null in overview. */
  focusId: DepartmentId | null;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  bounds: Bounds;
  nodeById: ReadonlyMap<string, GraphNode>;
}

/** The id the Company Brain node occupies in every layout. */
export const BRAIN_NODE_ID = 'company-brain';
