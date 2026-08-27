import type { Catalog } from '@/lib/catalog';
import type { Agent, CommandCenter, Metric } from '@/lib/schemas';

/**
 * Deterministic pseudo-randomness.
 *
 * Sample data must be identical on the server and the client or hydration
 * breaks, and identical between renders or the dashboards flicker. Values are
 * therefore derived from a hash of a stable string rather than `Math.random`
 * (§39).
 */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function pick<T>(items: readonly T[], seed: string): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(hash(seed) * items.length)];
}

function between(seed: string, min: number, max: number): number {
  return Math.round(min + hash(seed) * (max - min));
}

export type TimeRange = '24h' | '7d' | '30d';

export const TIME_RANGES: readonly TimeRange[] = ['24h', '7d', '30d'];

export const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

/** Multiplier applied to volume metrics for the selected range. */
const RANGE_SCALE: Record<TimeRange, number> = { '24h': 0.05, '7d': 0.3, '30d': 1 };

/**
 * Scales a metric to the selected time range. Rates and currency balances do not
 * scale with the window; volumes do.
 */
export function scaleMetric(metric: Metric, range: TimeRange): Metric {
  if (metric.format === 'percent' || metric.format === 'duration') return metric;
  if (metric.id === 'm-pipeline-value' || metric.id === 'm-arr' || metric.id === 'm-cpl') return metric;
  const scale = RANGE_SCALE[range];
  return { ...metric, value: Math.max(1, Math.round(metric.value * scale)) };
}

export interface ActivityRow {
  agent: Agent;
  runs: number;
  outputs: number;
  /** Share of runs that needed a person, 0–1. */
  escalationRate: number;
  lastRun: string;
}

export interface ApprovalItem {
  id: string;
  agent: Agent;
  summary: string;
  waitingHours: number;
}

export interface RiskItem {
  id: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ActionItem {
  id: string;
  agent: Agent;
  action: string;
  when: string;
}

export interface BreakdownBar {
  id: string;
  label: string;
  value: number;
  max: number;
  tone?: string;
}

function agentsFor(catalog: Catalog, centre: CommandCenter): Agent[] {
  const agents = centre.departmentIds.flatMap((id) => catalog.indexes.agentsByDepartment.get(id) ?? []);
  return agents.length > 0 ? agents : [...catalog.agents];
}

const AGO = ['4 min ago', '18 min ago', '41 min ago', '1 h ago', '2 h ago', '3 h ago', '5 h ago', 'yesterday'];

/**
 * Agent activity, drawn from the real catalogue: the rows name agents that
 * actually exist, so the dashboard demonstrates the product rather than
 * decorating it (§23).
 */
export function buildActivity(catalog: Catalog, centre: CommandCenter, range: TimeRange, limit = 6): ActivityRow[] {
  const scale = RANGE_SCALE[range];
  return agentsFor(catalog, centre)
    .filter((agent) => agent.autonomy !== 'human-led')
    .slice(0, limit)
    .map((agent) => {
      const runs = Math.max(1, Math.round(between(`${agent.id}-runs`, 40, 900) * scale));
      return {
        agent,
        runs,
        outputs: Math.max(1, Math.round(runs * (0.6 + hash(`${agent.id}-out`) * 0.4))),
        escalationRate:
          agent.autonomy === 'autonomous' ? hash(`${agent.id}-esc`) * 0.08 : 0.12 + hash(`${agent.id}-esc`) * 0.25,
        lastRun: AGO[Math.floor(hash(`${agent.id}-when`) * AGO.length)] ?? '1 h ago',
      };
    });
}

/** Work genuinely waiting on a person, built from each agent's approval points. */
export function buildApprovals(catalog: Catalog, centre: CommandCenter, limit = 5): ApprovalItem[] {
  return agentsFor(catalog, centre)
    .filter((agent) => agent.humanInLoop.approvalPoints.length > 0)
    .slice(0, limit)
    .map((agent) => ({
      id: `ap-${agent.id}`,
      agent,
      summary: agent.humanInLoop.approvalPoints[0] ?? 'Awaiting review',
      waitingHours: between(`${agent.id}-wait`, 1, 26),
    }));
}

export function buildRisks(catalog: Catalog, centre: CommandCenter, limit = 4): RiskItem[] {
  const agents = agentsFor(catalog, centre);
  const templates: Array<(agent: Agent) => RiskItem> = [
    (agent) => ({
      id: `rk-${agent.id}-a`,
      title: `${agent.name} escalation rate rising`,
      detail: 'More runs are reaching a person than last period. Worth checking the rules before volume grows.',
      severity: 'medium',
    }),
    (agent) => ({
      id: `rk-${agent.id}-b`,
      title: `${agent.name} blocked on a dependency`,
      detail:
        agent.dependencies.length > 0
          ? `Waiting on ${catalog.indexes.agentById.get(agent.dependencies[0] ?? '')?.name ?? 'an upstream agent'}.`
          : 'Waiting on a source system that has not responded today.',
      severity: 'high',
    }),
    (agent) => ({
      id: `rk-${agent.id}-c`,
      title: `${agent.name} output volume down`,
      detail: 'Throughput fell against its own baseline. Usually an input problem rather than the agent.',
      severity: 'low',
    }),
  ];

  return agents.slice(0, limit).map((agent, index) => {
    const template = templates[index % templates.length];
    return template ? template(agent) : { id: `rk-${index}`, title: 'Unknown', detail: '', severity: 'low' };
  });
}

export function buildRecentActions(catalog: Catalog, centre: CommandCenter, limit = 6): ActionItem[] {
  const agents = agentsFor(catalog, centre);
  return agents.slice(0, limit).map((agent, index) => ({
    id: `ac-${agent.id}`,
    agent,
    action: agent.outputs[index % Math.max(agent.outputs.length, 1)] ?? 'Produced output',
    when: AGO[Math.floor(hash(`${agent.id}-act`) * AGO.length)] ?? '1 h ago',
  }));
}

/** For the executive view: live agents per department, which is real user state. */
export function buildBreakdown(
  catalog: Catalog,
  centre: CommandCenter,
  liveByDepartment: ReadonlyMap<string, { live: number; total: number }>,
  accentOf: (departmentId: string) => string,
): BreakdownBar[] {
  const departmentIds =
    centre.departmentIds.length > 0 ? centre.departmentIds : catalog.departments.map((d) => d.id);

  if (centre.slug === 'executive') {
    return departmentIds.map((id) => {
      const stats = liveByDepartment.get(id);
      return {
        id,
        label: catalog.indexes.departmentById.get(id)?.name ?? id,
        value: stats?.live ?? 0,
        max: Math.max(stats?.total ?? 1, 1),
        tone: accentOf(id),
      };
    });
  }

  // Otherwise break down by function within the centre's departments.
  return departmentIds
    .flatMap((id) => catalog.indexes.functionsByDepartment.get(id) ?? [])
    .slice(0, 6)
    .map((fn) => ({
      id: fn.id,
      label: fn.name,
      value: between(`${fn.id}-bd`, 12, 96),
      max: 100,
      tone: accentOf(fn.departmentId),
    }));
}

/** Formats a metric for display. */
export function formatMetric(metric: Metric): string {
  switch (metric.format) {
    case 'currency': {
      const abs = Math.abs(metric.value);
      if (abs >= 1_000_000) return `£${(metric.value / 1_000_000).toFixed(2)}M`;
      if (abs >= 1_000) return `£${(metric.value / 1_000).toFixed(0)}k`;
      return `£${metric.value.toFixed(0)}`;
    }
    case 'percent':
      return `${(metric.value * 100).toFixed(metric.value < 0.1 ? 1 : 0)}%`;
    case 'duration':
      return `${metric.value} d`;
    default:
      return metric.value >= 10_000 ? metric.value.toLocaleString('en-GB') : String(metric.value);
  }
}

export { pick, hash, between };
