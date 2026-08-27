'use client';

import type { GraphNode } from '@/lib/graph/types';

export interface NodeInteraction {
  onActivate: (node: GraphNode) => void;
  onHoverChange: (node: GraphNode | null) => void;
}

export interface NodeShellProps extends NodeInteraction {
  node: GraphNode;
  selected: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

/**
 * Shared wrapper for every graph node: positioning, hit target, focus,
 * keyboard activation and the `data-node-id` hook the highlight controller
 * writes to.
 *
 * Hover is reported upward but never stored in this component — the highlight
 * is applied imperatively, so hovering re-renders nothing (§27, §31).
 */
export function NodeShell({ node, selected, ariaLabel, children, onActivate, onHoverChange }: NodeShellProps) {
  return (
    <g
      data-node-id={node.id}
      data-kind={node.kind}
      data-selected={selected ? 'true' : undefined}
      className="graph-node"
      transform={`translate(${node.x.toFixed(2)},${node.y.toFixed(2)})`}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      onPointerEnter={() => onHoverChange(node)}
      onPointerLeave={() => onHoverChange(null)}
      onFocus={() => onHoverChange(node)}
      onBlur={() => onHoverChange(null)}
      onClick={(event) => {
        event.stopPropagation();
        onActivate(node);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onActivate(node);
        }
      }}
    >
      {children}
    </g>
  );
}

/**
 * Radial label placement: rotated to sit along its own radius, flipped on the
 * left half so text never reads upside down. This is what lets a ring of
 * hundreds of agents stay legible.
 */
export function radialLabelTransform(node: GraphNode, offset: number): { transform: string; anchor: 'start' | 'end' } {
  const degrees = (node.angle * 180) / Math.PI - 90;
  const flipped = node.x < -0.01;
  return {
    transform: `rotate(${degrees.toFixed(2)}) translate(${(node.radius + offset).toFixed(1)},0)${flipped ? ' rotate(180)' : ''}`,
    anchor: flipped ? 'end' : 'start',
  };
}
