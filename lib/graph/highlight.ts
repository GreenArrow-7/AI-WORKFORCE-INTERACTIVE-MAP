import type { Catalog } from '@/lib/catalog';
import type { AgentId } from '@/lib/schemas';
import { BRAIN_NODE_ID, type GraphLayout } from './types';

export interface HighlightSet {
  nodes: ReadonlySet<string>;
  edges: ReadonlySet<string>;
}

/** Every agent this one transitively depends on. Memoised by the caller. */
export function upstreamClosure(catalog: Catalog, agentId: AgentId): Set<AgentId> {
  const seen = new Set<AgentId>();
  const stack: AgentId[] = [agentId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const agent = catalog.indexes.agentById.get(current);
    if (!agent) continue;
    for (const dep of agent.dependencies) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      stack.push(dep);
    }
  }

  return seen;
}

/** Every agent that transitively depends on this one. */
export function downstreamClosure(catalog: Catalog, agentId: AgentId): Set<AgentId> {
  const seen = new Set<AgentId>();
  const stack: AgentId[] = [agentId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const dependent of catalog.indexes.dependentsByAgent.get(current) ?? []) {
      if (seen.has(dependent)) continue;
      seen.add(dependent);
      stack.push(dependent);
    }
  }

  return seen;
}

/**
 * The nodes and edges to emphasise for the node under the cursor or selection.
 *
 * For an agent this is the agent, its full upstream dependency closure, and the
 * hierarchy path back to the Company Brain — which is exactly the set that
 * answers "where does this sit, and what does it need first?" (§31, §32).
 */
export function computeHighlight(
  layout: GraphLayout,
  catalog: Catalog,
  activeNodeId: string | null,
): HighlightSet | null {
  if (!activeNodeId) return null;
  const active = layout.nodeById.get(activeNodeId);
  if (!active) return null;

  const nodes = new Set<string>([active.id]);
  const edges = new Set<string>();

  // Walk up the hierarchy to the brain, lighting each link on the way.
  let cursor = active;
  while (cursor.parentId) {
    const parent = layout.nodeById.get(cursor.parentId);
    if (!parent) break;
    nodes.add(parent.id);
    edges.add(`e-${parent.id}-${cursor.id}`);
    cursor = parent;
  }
  nodes.add(BRAIN_NODE_ID);

  if (active.kind === 'agent') {
    const upstream = upstreamClosure(catalog, active.id);
    for (const id of upstream) {
      if (!layout.nodeById.has(id)) continue;
      nodes.add(id);
    }
    // Dependency edges wholly inside the highlighted set.
    for (const edge of layout.edges) {
      if (edge.kind !== 'dependency') continue;
      if (nodes.has(edge.source) && nodes.has(edge.target)) edges.add(edge.id);
    }
  }

  return { nodes, edges };
}

/**
 * Applies a highlight by writing data attributes onto the affected DOM nodes.
 *
 * Highlighting changes the appearance of most nodes on screen. Doing that
 * through React would re-render every node on every hover; this touches only the
 * elements whose state actually changed, so the cost is O(changed) rather than
 * O(nodes). The dimming itself is pure CSS (§27, §31).
 */
export class HighlightController {
  private root: Element | null = null;
  private current: HighlightSet | null = null;

  attach(root: Element | null): void {
    if (this.root && this.root !== root) this.apply(null);
    this.root = root;
  }

  apply(next: HighlightSet | null): void {
    const root = this.root;
    if (!root) {
      this.current = next;
      return;
    }

    const prevNodes = this.current?.nodes ?? EMPTY;
    const prevEdges = this.current?.edges ?? EMPTY;
    const nextNodes = next?.nodes ?? EMPTY;
    const nextEdges = next?.edges ?? EMPTY;

    for (const id of prevNodes) if (!nextNodes.has(id)) clear(root, 'node', id);
    for (const id of prevEdges) if (!nextEdges.has(id)) clear(root, 'edge', id);
    for (const id of nextNodes) if (!prevNodes.has(id)) mark(root, 'node', id);
    for (const id of nextEdges) if (!prevEdges.has(id)) mark(root, 'edge', id);

    if (next) root.setAttribute('data-highlighting', 'true');
    else root.removeAttribute('data-highlighting');

    this.current = next;
  }

  destroy(): void {
    this.apply(null);
    this.root = null;
  }
}

const EMPTY: ReadonlySet<string> = new Set<string>();

function selector(kind: 'node' | 'edge', id: string): string {
  // CSS.escape guards against ids that would otherwise break the selector.
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id;
  return `[data-${kind}-id="${escaped}"]`;
}

function mark(root: Element, kind: 'node' | 'edge', id: string): void {
  root.querySelector(selector(kind, id))?.setAttribute('data-hl', 'on');
}

function clear(root: Element, kind: 'node' | 'edge', id: string): void {
  root.querySelector(selector(kind, id))?.removeAttribute('data-hl');
}
