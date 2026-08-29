'use client';

import type { AgentStatus } from '@/lib/schemas';
import { AGENT_STATUS_LABEL, AUTONOMY_LABEL } from '@/lib/schemas';
import type { GraphNode } from '@/lib/graph/types';
import { catalog } from '@/lib/catalog';
import { AutonomyGlyph } from '@/components/shared/AutonomyGlyph';
import { StatusDot } from '@/components/shared/StatusDot';

export interface TooltipTarget {
  node: GraphNode;
  status: AgentStatus | null;
  screenX: number;
  screenY: number;
}

/**
 * Compact hover card: name, function, autonomy, status (§31). Deliberately not
 * the drawer — hovering must never open the full panel.
 *
 * `aria-hidden` because every fact here is already in the node's own
 * `aria-label`; announcing it twice is noise.
 */
export function GraphTooltip({ target }: { target: TooltipTarget | null }) {
  if (!target) return null;
  const { node, status } = target;
  const agent = node.kind === 'agent' ? catalog.indexes.agentById.get(node.id) : undefined;
  const fn = agent ? catalog.indexes.functionById.get(agent.functionId) : undefined;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
      style={{ left: target.screenX, top: target.screenY - 22 }}
    >
      <div className="glass max-w-[16rem] rounded-lg px-2.5 py-2 shadow-[var(--shadow-md)]">
        <p className="truncate text-xs font-medium text-fg">{node.label}</p>
        {fn && <p className="truncate text-2xs text-fg-muted">{fn.name}</p>}
        {node.kind !== 'agent' && node.sublabel && (
          <p className="truncate text-2xs text-fg-muted">{node.sublabel}</p>
        )}

        {agent && (
          <div className="mt-1.5 flex items-center gap-3 border-t border-line-subtle pt-1.5">
            <span className="flex items-center gap-1 text-2xs text-fg-secondary">
              <AutonomyGlyph autonomy={agent.autonomy} size={9} />
              {AUTONOMY_LABEL[agent.autonomy]}
            </span>
            {status && (
              <span className="flex items-center gap-1 text-2xs text-fg-secondary">
                <StatusDot status={status} size={9} labelled={false} />
                {AGENT_STATUS_LABEL[status]}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
