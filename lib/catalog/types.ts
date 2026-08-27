import type {
  Agent,
  AgentId,
  CommandCenter,
  CompanyBrain,
  Department,
  DepartmentId,
  FunctionGroup,
  FunctionId,
  Skill,
  SkillId,
  Tool,
  ToolId,
} from '@/lib/schemas';

export type CatalogIssueSeverity = 'dropped' | 'repaired';

/**
 * A record the loader refused to trust. `dropped` means the record is not in the
 * catalogue at all; `repaired` means it is, with the offending reference removed.
 * Either way the rest of the graph renders — one bad record never blanks the map.
 */
export interface CatalogIssue {
  severity: CatalogIssueSeverity;
  /** Which collection the problem was found in. */
  collection: 'department' | 'function' | 'agent' | 'skill' | 'tool' | 'commandCenter' | 'brain';
  /** The record's id where known; the raw index otherwise. */
  ref: string;
  message: string;
}

/** Node depth in the dependency graph. 0 = reads only from the Company Brain. */
export type DependencyDepth = number;

export interface CatalogIndexes {
  departmentById: ReadonlyMap<DepartmentId, Department>;
  departmentBySlug: ReadonlyMap<string, Department>;
  functionById: ReadonlyMap<FunctionId, FunctionGroup>;
  agentById: ReadonlyMap<AgentId, Agent>;
  agentBySlug: ReadonlyMap<string, Agent>;
  skillById: ReadonlyMap<SkillId, Skill>;
  toolById: ReadonlyMap<ToolId, Tool>;
  commandCenterBySlug: ReadonlyMap<string, CommandCenter>;

  functionsByDepartment: ReadonlyMap<DepartmentId, readonly FunctionGroup[]>;
  agentsByDepartment: ReadonlyMap<DepartmentId, readonly Agent[]>;
  agentsByFunction: ReadonlyMap<FunctionId, readonly Agent[]>;
  skillsByAgent: ReadonlyMap<AgentId, readonly Skill[]>;

  /** Reverse of `Agent.dependencies`: who is waiting on this agent. */
  dependentsByAgent: ReadonlyMap<AgentId, readonly AgentId[]>;
  /** Longest dependency chain behind each agent. Drives "build this first". */
  depthByAgent: ReadonlyMap<AgentId, DependencyDepth>;
}

export interface Catalog {
  departments: readonly Department[];
  functionGroups: readonly FunctionGroup[];
  agents: readonly Agent[];
  skills: readonly Skill[];
  tools: readonly Tool[];
  commandCenters: readonly CommandCenter[];
  companyBrain: CompanyBrain | null;
  indexes: CatalogIndexes;
  issues: readonly CatalogIssue[];
}

/** Unvalidated input. Deliberately `unknown` — everything is parsed at the boundary. */
export interface RawCatalogInput {
  departments: unknown;
  functionGroups: unknown;
  agents: unknown;
  skills: unknown;
  tools: unknown;
  commandCenters: unknown;
  companyBrain: unknown;
}
