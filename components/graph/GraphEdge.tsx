'use client';

import { memo } from 'react';
import type { GraphEdge as GraphEdgeModel } from '@/lib/graph/types';

/**
 * One connector. Edges are static for a given layout, so this is memoised and
 * the active/dimmed appearance is driven entirely by CSS reacting to the
 * `data-hl` attribute the highlight controller writes.
 */
export const GraphEdgeLine = memo(function GraphEdgeLine({ edge }: { edge: GraphEdgeModel }) {
  return (
    <path
      data-edge-id={edge.id}
      data-edge-kind={edge.kind}
      className={edge.kind === 'hierarchy' ? 'graph-edge graph-edge-hierarchy' : 'graph-edge graph-edge-dependency'}
      d={edge.path}
      fill="none"
    />
  );
});
