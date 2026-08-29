import type { Catalog } from '@/lib/catalog';
import type { Agent, AgentId, Autonomy, DepartmentId } from '@/lib/schemas';
import { fuzzyMatchTokens } from './fuzzy';

export type SearchResultKind = 'agent' | 'department' | 'function' | 'skill' | 'tool';

export interface SearchEntry {
  kind: SearchResultKind;
  id: string;
  title: string;
  /** Secondary line: department › function for agents. */
  subtitle: string;
  /** Lowercased haystack the query is matched against. */
  haystack: string;
  /** For agent-navigable results (agents and skills), the agent to open. */
  agentId: AgentId | null;
  departmentId: DepartmentId | null;
  autonomy: Autonomy | null;
  /** Ranking nudge so agents outrank the tool that merely mentions them. */
  weight: number;
}

export interface SearchResult extends SearchEntry {
  score: number;
}

function agentHaystack(agent: Agent, catalog: Catalog): string {
  const department = catalog.indexes.departmentById.get(agent.departmentId);
  const fn = catalog.indexes.functionById.get(agent.functionId);
  const skillNames = agent.skills
    .map((id) => catalog.indexes.skillById.get(id)?.name ?? '')
    .filter(Boolean)
    .join(' ');
  const toolNames = agent.tools
    .map((id) => catalog.indexes.toolById.get(id)?.name ?? '')
    .filter(Boolean)
    .join(' ');

  return [
    agent.name,
    agent.slug,
    agent.shortDescription,
    agent.businessOutcome,
    department?.name ?? '',
    fn?.name ?? '',
    agent.autonomy,
    skillNames,
    toolNames,
    agent.replaces.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Builds the flat index searched by ⌘K.
 *
 * Every searchable thing becomes one entry, and an agent's entry absorbs the
 * names of its skills and tools — so searching "HubSpot" finds the agents that
 * use it, not just the tool itself (§15).
 */
export function buildSearchIndex(catalog: Catalog): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const agent of catalog.agents) {
    const department = catalog.indexes.departmentById.get(agent.departmentId);
    const fn = catalog.indexes.functionById.get(agent.functionId);
    entries.push({
      kind: 'agent',
      id: agent.id,
      title: agent.name,
      subtitle: `${department?.name ?? 'Unknown'} › ${fn?.name ?? 'Unknown'}`,
      haystack: agentHaystack(agent, catalog),
      agentId: agent.id,
      departmentId: agent.departmentId,
      autonomy: agent.autonomy,
      weight: 30,
    });
  }

  for (const department of catalog.departments) {
    const count = catalog.indexes.agentsByDepartment.get(department.id)?.length ?? 0;
    entries.push({
      kind: 'department',
      id: department.id,
      title: department.name,
      subtitle: `Department · ${count} agent${count === 1 ? '' : 's'}`,
      haystack: `${department.name} ${department.slug} ${department.description} ${department.mission}`.toLowerCase(),
      agentId: null,
      departmentId: department.id,
      autonomy: null,
      weight: 20,
    });
  }

  for (const fn of catalog.functionGroups) {
    const department = catalog.indexes.departmentById.get(fn.departmentId);
    entries.push({
      kind: 'function',
      id: fn.id,
      title: fn.name,
      subtitle: `Function · ${department?.name ?? 'Unknown'}`,
      haystack: `${fn.name} ${fn.slug} ${fn.description} ${department?.name ?? ''}`.toLowerCase(),
      agentId: null,
      departmentId: fn.departmentId,
      autonomy: null,
      weight: 12,
    });
  }

  for (const skill of catalog.skills) {
    const agent = catalog.indexes.agentById.get(skill.agentId);
    entries.push({
      kind: 'skill',
      id: skill.id,
      title: skill.name,
      subtitle: `Skill · ${agent?.name ?? 'Unassigned'}`,
      haystack: `${skill.name} ${skill.slug} ${skill.description}`.toLowerCase(),
      agentId: agent?.id ?? null,
      departmentId: agent?.departmentId ?? null,
      autonomy: agent?.autonomy ?? null,
      weight: 10,
    });
  }

  for (const tool of catalog.tools) {
    entries.push({
      kind: 'tool',
      id: tool.id,
      title: tool.name,
      subtitle: `Tool · ${tool.category}`,
      haystack: `${tool.name} ${tool.category}`.toLowerCase(),
      agentId: null,
      departmentId: null,
      autonomy: null,
      weight: 6,
    });
  }

  return entries;
}

/** Ranks the index against a query. An empty query returns nothing, not everything. */
export function searchCatalog(entries: readonly SearchEntry[], query: string, limit = 24): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const results: SearchResult[] = [];
  for (const entry of entries) {
    const match = fuzzyMatchTokens(trimmed, entry.haystack);
    if (!match) continue;
    results.push({ ...entry, score: match.score + entry.weight });
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return results.slice(0, limit);
}
