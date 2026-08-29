'use client';

import { useMemo } from 'react';
import { catalog } from '@/lib/catalog';
import type { Agent, AgentId } from '@/lib/schemas';
import { statusOf } from '@/lib/progress/compute';
import { isFilterActive, useWorkforceStore, type Filters } from '@/stores/workforce-store';

/** True when the agent satisfies every active facet. */
export function matchesFilters(agent: Agent, filters: Filters, status: string): boolean {
  if (filters.departmentIds.length > 0 && !filters.departmentIds.includes(agent.departmentId)) return false;
  if (filters.functionIds.length > 0 && !filters.functionIds.includes(agent.functionId)) return false;
  if (filters.autonomy.length > 0 && !filters.autonomy.includes(agent.autonomy)) return false;
  if (filters.status.length > 0 && !(filters.status as string[]).includes(status)) return false;
  if (filters.toolIds.length > 0 && !agent.tools.some((id) => filters.toolIds.includes(id))) return false;
  if (filters.hasSkills && agent.skills.length === 0) return false;
  if (filters.hasDependencies && agent.dependencies.length === 0) return false;
  return true;
}

/**
 * The agent ids currently passing the filters, or `null` when no filter is
 * active.
 *
 * `null` rather than "every id" is deliberate: it lets the layout skip the
 * per-agent membership check entirely in the common case, and makes "unfiltered"
 * a distinct, cheap state.
 */
export function useVisibleAgentIds(): ReadonlySet<AgentId> | null {
  const filters = useWorkforceStore((s) => s.filters);
  const states = useWorkforceStore((s) => s.agentStates);

  return useMemo(() => {
    if (!isFilterActive(filters)) return null;
    const visible = new Set<AgentId>();
    for (const agent of catalog.agents) {
      if (matchesFilters(agent, filters, statusOf(agent.id, states))) visible.add(agent.id);
    }
    return visible;
  }, [filters, states]);
}

/** A stable string that changes only when the filtered set could change. */
export function useFilterSignature(): string {
  const filters = useWorkforceStore((s) => s.filters);
  return useMemo(() => JSON.stringify(filters), [filters]);
}
