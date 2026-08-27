'use client';

import { memo } from 'react';
import { accentVar } from '@/lib/ui/tokens';
import type { GraphNode } from '@/lib/graph/types';
import { NodeShell, radialTextPlacement, type NodeInteraction } from './node-shell';

interface FunctionNodeProps extends NodeInteraction {
  node: GraphNode;
  selected: boolean;
}

/** The middle tier. Small and quiet — it groups, it does not compete. */
export const FunctionNode = memo(function FunctionNode({
  node,
  selected,
  onActivate,
  onHoverChange,
}: FunctionNodeProps) {
  // Only three or four per department, so they can stay upright.
  const label = radialTextPlacement(node, 14);
  const accent = accentVar(node.accent);

  return (
    <NodeShell
      node={node}
      selected={selected}
      ariaLabel={`${node.label} function. ${node.sublabel ?? ''}`}
      onActivate={onActivate}
      onHoverChange={onHoverChange}
    >
      <circle r={node.radius} className="graph-fn-core" style={{ ['--node-accent' as string]: accent }} />
      <circle r={node.radius * 0.34} fill={accent} fillOpacity={0.85} />

      <g transform={`translate(${label.x.toFixed(1)},${label.y.toFixed(1)})`}>
        <text className="graph-label graph-label-fn" textAnchor={label.anchor} dominantBaseline="middle">
          {node.label}
        </text>
        <text className="graph-sublabel graph-sublabel-fn" textAnchor={label.anchor} y={13}>
          {node.sublabel}
        </text>
      </g>
    </NodeShell>
  );
});
