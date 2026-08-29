'use client';

import { memo } from 'react';
import { NodeShell, type NodeInteraction } from './node-shell';
import type { GraphNode } from '@/lib/graph/types';

interface BrainNodeProps extends NodeInteraction {
  node: GraphNode;
  selected: boolean;
}

/**
 * Node zero. Rendered as concentric rings rather than an icon so it reads as the
 * origin of the composition rather than as one more department.
 */
export const BrainNode = memo(function BrainNode({ node, selected, onActivate, onHoverChange }: BrainNodeProps) {
  const r = node.radius;

  return (
    <NodeShell
      node={node}
      selected={selected}
      ariaLabel={`${node.label}. Shared context every agent reads from. Open details.`}
      onActivate={onActivate}
      onHoverChange={onHoverChange}
    >
      <circle r={r + 16} className="graph-brain-halo" />
      <circle r={r} className="graph-brain-core" />
      <circle r={r * 0.66} className="graph-brain-inner" />
      <circle r={r * 0.24} className="graph-brain-dot" />

      <text className="graph-label graph-label-brain" y={r + 22} textAnchor="middle">
        {node.label}
      </text>
      <text className="graph-sublabel" y={r + 36} textAnchor="middle">
        {node.sublabel}
      </text>
    </NodeShell>
  );
});
