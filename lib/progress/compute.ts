import type { Catalog } from '@/lib/catalog';
import {
  AGENT_STATUS_ORDER,
  type Agent,
  type AgentId,
  type AgentStatus,
  type DepartmentId,
  type FunctionId,
  type UserAgentState,
} from '@/lib/schemas';

export type AgentStateMap = Readonly<Record<AgentId, UserAgentState>>;

export type StatusCounts = Record<AgentStatus, number>;

export interface ProgressSummary {
  counts: StatusCounts;
  total: number;
  /** Share of agents marked live, 0–1. `0` when there are no agents. */
  completion: number;
  /** Share started in any form (planned, building or live), 0–1. */
  engaged: number;
}

export interface ProgressRollup {
  company: ProgressSummary;
  byDepartment: ReadonlyMap<DepartmentId, ProgressSummary>;
  byFunction: ReadonlyMap<FunctionId, ProgressSummary>;
}

/** An agent with no stored state has not been started. */
export function statusOf(agentId: AgentId, states: AgentStateMap): AgentStatus {
  return states[agentId]?.status ?? 'not_started';
}

function emptyCounts(): StatusCounts {
  return { not_started: 0, planned: 0, building: 0, live: 0 };
}

function summarise(agents: readonly Agent[], states: AgentStateMap): ProgressSummary {
  const counts = emptyCounts();
  for (const agent of agents) counts[statusOf(agent.id, states)] += 1;
  const total = agents.length;
  const engagedCount = counts.planned + counts.building + counts.live;
  return {
    counts,
    total,
    completion: total === 0 ? 0 : counts.live / total,
    engaged: total === 0 ? 0 : engagedCount / total,
  };
}

/**
 * Rolls progress up the hierarchy in a single pass over the agent list.
 *
 * Pure and memoisable: the result depends only on the catalogue and the state
 * map, so a status change recomputes this once rather than per subscriber.
 */
export function computeProgress(catalog: Catalog, states: AgentStateMap): ProgressRollup {
  const byDepartment = new Map<DepartmentId, ProgressSummary>();
  const byFunction = new Map<FunctionId, ProgressSummary>();

  for (const department of catalog.departments) {
    byDepartment.set(department.id, summarise(catalog.indexes.agentsByDepartment.get(department.id) ?? [], states));
  }
  for (const fn of catalog.functionGroups) {
    byFunction.set(fn.id, summarise(catalog.indexes.agentsByFunction.get(fn.id) ?? [], states));
  }

  return { company: summarise(catalog.agents, states), byDepartment, byFunction };
}

export interface Recommendation {
  agent: Agent;
  /** Agents that become unblocked once this one is live. */
  unlocks: number;
  /** Longest dependency chain behind it; lower is more foundational. */
  depth: number;
  reason: string;
}

/**
 * Answers "what should I build first?".
 *
 * Only agents whose dependencies are all live are recommended — suggesting
 * something that cannot yet be built is worse than suggesting nothing. Among
 * those, the ranking prefers agents that unblock the most work, then the more
 * foundational ones, then the author's own recommended order.
 */
export function recommendNextDeployments(
  catalog: Catalog,
  states: AgentStateMap,
  limit = 3,
): Recommendation[] {
  const ready: Recommendation[] = [];

  for (const agent of catalog.agents) {
    if (statusOf(agent.id, states) === 'live') continue;

    const blockers = agent.dependencies.filter((id) => statusOf(id, states) !== 'live');
    if (blockers.length > 0) continue;

    const unlocks = countUnlocked(catalog, states, agent.id);
    const depth = catalog.indexes.depthByAgent.get(agent.id) ?? 0;
    ready.push({ agent, unlocks, depth, reason: reasonFor(agent, unlocks, depth) });
  }

  ready.sort(
    (a, b) =>
      b.unlocks - a.unlocks ||
      a.depth - b.depth ||
      a.agent.recommendedOrder - b.agent.recommendedOrder ||
      a.agent.name.localeCompare(b.agent.name),
  );

  return ready.slice(0, limit);
}

/** How many not-yet-live agents have all their other dependencies already live. */
function countUnlocked(catalog: Catalog, states: AgentStateMap, agentId: AgentId): number {
  const dependents = catalog.indexes.dependentsByAgent.get(agentId) ?? [];
  let count = 0;
  for (const id of dependents) {
    if (statusOf(id, states) === 'live') continue;
    const dependent = catalog.indexes.agentById.get(id);
    if (!dependent) continue;
    const otherBlockers = dependent.dependencies.filter(
      (dep) => dep !== agentId && statusOf(dep, states) !== 'live',
    );
    if (otherBlockers.length === 0) count += 1;
  }
  return count;
}

function reasonFor(agent: Agent, unlocks: number, depth: number): string {
  if (unlocks > 0) {
    return `Unblocks ${unlocks} downstream agent${unlocks === 1 ? '' : 's'}`;
  }
  if (depth === 0 && agent.dependencies.length === 0) {
    return 'Foundational — depends only on the Company Brain';
  }
  return 'All upstream dependencies are live';
}

/** Dependencies that are not yet live, i.e. what is actually blocking this agent. */
export function blockersFor(agent: Agent, catalog: Catalog, states: AgentStateMap): Agent[] {
  return agent.dependencies
    .filter((id) => statusOf(id, states) !== 'live')
    .map((id) => catalog.indexes.agentById.get(id))
    .filter((a): a is Agent => a !== undefined);
}

/** Ordered status list, exported so selectors and UI iterate in one order. */
export const STATUS_SEQUENCE = AGENT_STATUS_ORDER;
