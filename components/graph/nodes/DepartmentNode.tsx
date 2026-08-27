'use client';

import { memo } from 'react';
import { accentVar, percent } from '@/lib/ui/tokens';
import { resolveIcon } from '@/components/shared/DataIcon';
import type { GraphNode } from '@/lib/graph/types';
import { NodeShell, type NodeInteraction } from './node-shell';

interface DepartmentNodeProps extends NodeInteraction {
  node: GraphNode;
  selected: boolean;
  /** 0–1 share of this department's agents that are live. */
  progress: number;
  liveCount: number;
  totalCount: number;
  /** Lucide icon name from the department record, resolved via an allow-list. */
  icon: string;
}

/**
 * A department: accent ring, completion arc, name, agent count and percentage
 * (§6). The arc is the same information as the percentage, so the figure is
 * never carried by colour alone.
 */
export const DepartmentNode = memo(function DepartmentNode({
  node,
  selected,
  progress,
  liveCount,
  totalCount,
  icon,
  onActivate,
  onHoverChange,
}: DepartmentNodeProps) {
  const Icon = resolveIcon(icon);
  const r = node.radius;
  const arcR = r + 7;
  const circumference = 2 * Math.PI * arcR;
  const accent = accentVar(node.accent);

  return (
    <NodeShell
      node={node}
      selected={selected}
      ariaLabel={`${node.label} department. ${liveCount} of ${totalCount} agents live, ${percent(progress)}. Open department.`}
      onActivate={onActivate}
      onHoverChange={onHoverChange}
    >
      <circle r={arcR} fill="none" stroke="var(--border)" strokeWidth={2} />
      {progress > 0 && (
        <circle
          r={arcR}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * progress).toFixed(2)} ${circumference.toFixed(2)}`}
          transform="rotate(-90)"
        />
      )}

      <circle r={r} className="graph-dept-core" style={{ ['--node-accent' as string]: accent }} />
      <g transform="translate(-11,-11)" className="graph-dept-icon" aria-hidden>
        <Icon width={22} height={22} stroke={accent} strokeWidth={1.6} />
      </g>

      <text className="graph-label graph-label-dept" y={arcR + 20} textAnchor="middle">
        {node.label}
      </text>
      <text className="graph-sublabel" y={arcR + 34} textAnchor="middle">
        {node.sublabel} · {percent(progress)}
      </text>
    </NodeShell>
  );
});
