'use client';

import { memo } from 'react';
import { AGENT_STATUS_LABEL, AUTONOMY_LABEL, type AgentStatus, type Autonomy } from '@/lib/schemas';
import { AUTONOMY_STYLE, accentVar, statusVar } from '@/lib/ui/tokens';
import type { GraphNode } from '@/lib/graph/types';
import {
  NodeShell,
  radialLabelTransform,
  radialTextPlacement,
  type NodeInteraction,
} from './node-shell';

interface AgentNodeProps extends NodeInteraction {
  node: GraphNode;
  selected: boolean;
  status: AgentStatus;
}

/**
 * An agent.
 *
 * Two independent, non-colour channels carry the two independent facts (§10,
 * §11): the *body* encodes autonomy through fill and dash — hollow-dashed for
 * human-led, hollow for assisted, filled for autonomous — and the *ring* around
 * it encodes rollout status as a filled fraction, closing to a full ring with a
 * tick when live.
 */
export const AgentNode = memo(function AgentNode({
  node,
  selected,
  status,
  onActivate,
  onHoverChange,
}: AgentNodeProps) {
  const autonomy: Autonomy = node.autonomy ?? 'assisted';
  const style = AUTONOMY_STYLE[autonomy];
  const accent = accentVar(node.accent);
  // Which orientation reads better is a property of the ring, so the layout
  // decides it; the node just draws what it was handed.
  const upright = node.labelMode === 'horizontal' ? radialTextPlacement(node, 11) : null;
  const radial = upright ? null : radialLabelTransform(node, 11);

  const r = node.radius;
  const ringR = r + 4.5;
  const circumference = 2 * Math.PI * ringR;
  const ringFraction = status === 'live' ? 1 : status === 'building' ? 0.6 : status === 'planned' ? 0.25 : 0;

  return (
    <NodeShell
      node={node}
      selected={selected}
      ariaLabel={`${node.label}. ${AUTONOMY_LABEL[autonomy]}. ${AGENT_STATUS_LABEL[status]}. Open details.`}
      onActivate={onActivate}
      onHoverChange={onHoverChange}
    >
      {/* Enlarged, invisible hit target: a 14px circle is hard to click. */}
      <circle r={r + 11} fill="transparent" />

      {ringFraction > 0 && (
        <circle
          r={ringR}
          fill="none"
          stroke={statusVar(status)}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * ringFraction).toFixed(2)} ${circumference.toFixed(2)}`}
          transform="rotate(-90)"
          className="graph-status-ring"
        />
      )}

      <circle
        r={r}
        className="graph-agent-core"
        style={{ ['--node-accent' as string]: accent }}
        fill={accent}
        fillOpacity={style.fill}
        stroke={accent}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.dash ?? undefined}
      />

      {status === 'live' && (
        <path
          d={`M${-r * 0.42},${r * 0.04} L${-r * 0.1},${r * 0.36} L${r * 0.46},${-r * 0.34}`}
          fill="none"
          stroke={style.fill > 0.5 ? 'var(--bg)' : statusVar('live')}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {upright ? (
        <text
          className="graph-label graph-label-agent"
          x={upright.x}
          y={upright.y}
          textAnchor={upright.anchor}
          dominantBaseline="middle"
        >
          {node.label}
        </text>
      ) : (
        radial && (
          <g transform={radial.transform}>
            <text
              className="graph-label graph-label-agent"
              textAnchor={radial.anchor}
              dominantBaseline="middle"
            >
              {node.label}
            </text>
          </g>
        )
      )}
    </NodeShell>
  );
});
