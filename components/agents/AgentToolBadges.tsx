'use client';

import { catalog } from '@/lib/catalog';
import type { ToolId } from '@/lib/schemas';
import { useWorkforceStore } from '@/stores/workforce-store';
import { Badge } from '@/components/shared/Badge';

/**
 * Integration badges. Each one filters the map by that tool, which turns "what
 * does this use?" into "what else uses this?" in one click (§12, §16).
 */
export function AgentToolBadges({ toolIds }: { toolIds: readonly ToolId[] }) {
  const setFilters = useWorkforceStore((s) => s.setFilters);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);

  if (toolIds.length === 0) return <p className="text-xs text-fg-muted">No integrations recorded.</p>;

  return (
    <ul className="flex flex-wrap gap-1">
      {toolIds.map((id) => {
        const tool = catalog.indexes.toolById.get(id);
        if (!tool) return null;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => {
                focusDepartment(null);
                setFilters({ toolIds: [id] });
                window.history.pushState(null, '', '/map');
              }}
              title={`Show every agent that uses ${tool.name}`}
              className="transition-opacity hover:opacity-80"
            >
              <Badge>{tool.name}</Badge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
