import { z } from 'zod';
import {
  agentSchema,
  commandCenterSchema,
  companyBrainSchema,
  departmentSchema,
  functionGroupSchema,
  skillSchema,
  toolSchema,
  type Agent,
  type AgentId,
  type CommandCenter,
  type CompanyBrain,
  type Department,
  type FunctionGroup,
  type Skill,
  type Tool,
} from '@/lib/schemas';
import type { Catalog, CatalogIssue, CatalogIndexes, RawCatalogInput } from './types';

interface Collected<T> {
  records: T[];
  issues: CatalogIssue[];
}

/**
 * Parses a list of unknown records, quarantining the ones that fail rather than
 * throwing. Duplicate ids and slugs are treated as authoring errors: the first
 * record wins and later ones are dropped, so behaviour is deterministic.
 */
function collect<T extends { id: string; slug?: string }>(
  raw: unknown,
  schema: z.ZodType<T>,
  collection: CatalogIssue['collection'],
): Collected<T> {
  const issues: CatalogIssue[] = [];
  if (!Array.isArray(raw)) {
    return {
      records: [],
      issues: [{ severity: 'dropped', collection, ref: '(root)', message: 'expected an array of records' }],
    };
  }

  const records: T[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  raw.forEach((candidate, index) => {
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      const ref = readId(candidate) ?? `index ${index}`;
      issues.push({
        severity: 'dropped',
        collection,
        ref,
        message: parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; '),
      });
      return;
    }

    const record = parsed.data;
    if (seenIds.has(record.id)) {
      issues.push({ severity: 'dropped', collection, ref: record.id, message: 'duplicate id' });
      return;
    }
    if (record.slug !== undefined && seenSlugs.has(record.slug)) {
      issues.push({ severity: 'dropped', collection, ref: record.id, message: `duplicate slug "${record.slug}"` });
      return;
    }

    seenIds.add(record.id);
    if (record.slug !== undefined) seenSlugs.add(record.slug);
    records.push(record);
  });

  return { records, issues };
}

function readId(candidate: unknown): string | null {
  if (typeof candidate !== 'object' || candidate === null) return null;
  const id = (candidate as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

/** Keeps only ids present in `known`, reporting each removal as a repair. */
function keepKnown(
  ids: readonly string[],
  known: ReadonlySet<string>,
  issues: CatalogIssue[],
  collection: CatalogIssue['collection'],
  ref: string,
  label: string,
): string[] {
  const kept: string[] = [];
  for (const id of ids) {
    if (known.has(id)) kept.push(id);
    else issues.push({ severity: 'repaired', collection, ref, message: `unknown ${label} "${id}" removed` });
  }
  return kept;
}

/**
 * Breaks dependency cycles deterministically. Agents are visited in id order and
 * any edge that closes a cycle is dropped, so the same input always produces the
 * same graph. A cycle is an authoring error, not a runtime condition — but it
 * must not hang the layout, so it is repaired rather than thrown.
 */
function breakCycles(agents: Agent[], issues: CatalogIssue[]): Agent[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const state = new Map<AgentId, 'visiting' | 'done'>();
  const removed = new Set<string>();

  const visit = (id: AgentId): void => {
    if (state.get(id) === 'done') return;
    state.set(id, 'visiting');
    const agent = byId.get(id);
    if (agent) {
      for (const dep of agent.dependencies) {
        if (state.get(dep) === 'visiting') {
          removed.add(`${id}->${dep}`);
          issues.push({
            severity: 'repaired',
            collection: 'agent',
            ref: id,
            message: `dependency on "${dep}" removed: it closes a cycle`,
          });
          continue;
        }
        if (byId.has(dep)) visit(dep);
      }
    }
    state.set(id, 'done');
  };

  for (const id of [...byId.keys()].sort()) visit(id);
  if (removed.size === 0) return agents;

  return agents.map((a) => ({
    ...a,
    dependencies: a.dependencies.filter((d) => !removed.has(`${a.id}->${d}`)),
  }));
}

/** Longest path back through `dependencies`. Requires an acyclic graph. */
function computeDepths(agents: readonly Agent[]): Map<AgentId, number> {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const depths = new Map<AgentId, number>();

  const depthOf = (id: AgentId): number => {
    const cached = depths.get(id);
    if (cached !== undefined) return cached;
    const agent = byId.get(id);
    if (!agent || agent.dependencies.length === 0) {
      depths.set(id, 0);
      return 0;
    }
    // Seed before recursing so a residual cycle terminates instead of hanging.
    depths.set(id, 0);
    let max = 0;
    for (const dep of agent.dependencies) {
      if (byId.has(dep)) max = Math.max(max, depthOf(dep) + 1);
    }
    depths.set(id, max);
    return max;
  };

  for (const agent of agents) depthOf(agent.id);
  return depths;
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const existing = map.get(k);
    if (existing) existing.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/**
 * Validates, repairs and indexes the authored catalogue.
 *
 * Never throws. Anything it cannot trust is either dropped or repaired and
 * reported in `issues`, because a single malformed record must not be able to
 * blank the entire map (§36).
 */
export function loadCatalog(raw: RawCatalogInput): Catalog {
  const issues: CatalogIssue[] = [];

  const depts = collect<Department>(raw.departments, departmentSchema, 'department');
  const fns = collect<FunctionGroup>(raw.functionGroups, functionGroupSchema, 'function');
  const rawAgents = collect<Agent>(raw.agents, agentSchema, 'agent');
  const rawSkills = collect<Skill>(raw.skills, skillSchema, 'skill');
  const toolsC = collect<Tool>(raw.tools, toolSchema, 'tool');
  const centres = collect<CommandCenter>(raw.commandCenters, commandCenterSchema, 'commandCenter');
  issues.push(...depts.issues, ...fns.issues, ...rawAgents.issues, ...rawSkills.issues, ...toolsC.issues, ...centres.issues);

  const departmentIds = new Set(depts.records.map((d) => d.id));
  const toolIds = new Set(toolsC.records.map((t) => t.id));

  // A function whose department is missing has nowhere to render; drop it.
  const functionGroups = fns.records.filter((f) => {
    if (departmentIds.has(f.departmentId)) return true;
    issues.push({ severity: 'dropped', collection: 'function', ref: f.id, message: `unknown departmentId "${f.departmentId}"` });
    return false;
  });
  const functionById = new Map(functionGroups.map((f) => [f.id, f]));

  // Same for agents: no valid department + function means no position in the graph.
  const placedAgents = rawAgents.records.filter((a) => {
    if (!departmentIds.has(a.departmentId)) {
      issues.push({ severity: 'dropped', collection: 'agent', ref: a.id, message: `unknown departmentId "${a.departmentId}"` });
      return false;
    }
    const fn = functionById.get(a.functionId);
    if (!fn) {
      issues.push({ severity: 'dropped', collection: 'agent', ref: a.id, message: `unknown functionId "${a.functionId}"` });
      return false;
    }
    if (fn.departmentId !== a.departmentId) {
      issues.push({
        severity: 'dropped',
        collection: 'agent',
        ref: a.id,
        message: `function "${a.functionId}" belongs to a different department`,
      });
      return false;
    }
    return true;
  });

  const agentIds = new Set(placedAgents.map((a) => a.id));
  const skillIds = new Set(rawSkills.records.map((s) => s.id));

  // Dangling references are repaired, not fatal: an agent with one bad tool id is
  // still a useful agent.
  const repairedAgents: Agent[] = placedAgents.map((a) => ({
    ...a,
    dependencies: keepKnown(a.dependencies, agentIds, issues, 'agent', a.id, 'dependency'),
    skills: keepKnown(a.skills, skillIds, issues, 'agent', a.id, 'skill'),
    tools: keepKnown(a.tools, toolIds, issues, 'agent', a.id, 'tool'),
  }));

  const agents = breakCycles(repairedAgents, issues);

  const skills = rawSkills.records.map((s) => ({
    ...s,
    tools: keepKnown(s.tools, toolIds, issues, 'skill', s.id, 'tool'),
  }));

  const commandCenters = centres.records.map((c) => ({
    ...c,
    departmentIds: keepKnown(c.departmentIds, departmentIds, issues, 'commandCenter', c.id, 'department'),
  }));

  const brainParsed = companyBrainSchema.safeParse(raw.companyBrain);
  let companyBrain: CompanyBrain | null = null;
  if (brainParsed.success) {
    companyBrain = brainParsed.data;
  } else {
    issues.push({
      severity: 'dropped',
      collection: 'brain',
      ref: 'companyBrain',
      message: brainParsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  }

  const departments = [...depts.records].sort((a, b) => a.order - b.order);
  const sortedFunctions = [...functionGroups].sort((a, b) => a.order - b.order);
  const sortedAgents = [...agents].sort((a, b) => a.recommendedOrder - b.recommendedOrder || a.name.localeCompare(b.name));

  const dependents = new Map<AgentId, AgentId[]>();
  for (const agent of agents) {
    for (const dep of agent.dependencies) {
      const list = dependents.get(dep);
      if (list) list.push(agent.id);
      else dependents.set(dep, [agent.id]);
    }
  }

  const indexes: CatalogIndexes = {
    departmentById: new Map(departments.map((d) => [d.id, d])),
    departmentBySlug: new Map(departments.map((d) => [d.slug, d])),
    functionById,
    agentById: new Map(agents.map((a) => [a.id, a])),
    agentBySlug: new Map(agents.map((a) => [a.slug, a])),
    skillById: new Map(skills.map((s) => [s.id, s])),
    toolById: new Map(toolsC.records.map((t) => [t.id, t])),
    commandCenterBySlug: new Map(commandCenters.map((c) => [c.slug, c])),
    functionsByDepartment: groupBy(sortedFunctions, (f) => f.departmentId),
    agentsByDepartment: groupBy(sortedAgents, (a) => a.departmentId),
    agentsByFunction: groupBy(sortedAgents, (a) => a.functionId),
    skillsByAgent: groupBy(skills, (s) => s.agentId),
    dependentsByAgent: dependents,
    depthByAgent: computeDepths(agents),
  };

  return {
    departments,
    functionGroups: sortedFunctions,
    agents: sortedAgents,
    skills,
    tools: toolsC.records,
    commandCenters: [...commandCenters].sort((a, b) => a.order - b.order),
    companyBrain,
    indexes,
    issues,
  };
}
