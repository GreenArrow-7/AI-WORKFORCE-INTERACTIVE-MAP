'use client';

import { useMemo } from 'react';
import { catalog } from '@/lib/catalog';
import { AUTONOMY_LABEL, AUTONOMY_ORDER, type Agent, type Autonomy } from '@/lib/schemas';
import { statusOf } from '@/lib/progress/compute';
import { useProgress } from '@/lib/hooks/use-progress';
import { useVisibleAgentIds } from '@/lib/hooks/use-visible-agents';
import { accentVar, percent, AUTONOMY_STYLE } from '@/lib/ui/tokens';
import { useWorkforceStore } from '@/stores/workforce-store';
import { AutonomyGlyph } from '@/components/shared/AutonomyGlyph';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { RolloutAgentRow } from './RolloutAgentRow';

const LANE_HINT: Record<Autonomy, string> = {
  'human-led': 'A person does the work; the agent prepares and checks. Automate the preparation, not the judgement.',
  assisted: 'The agent drafts or decides, a person approves. Most value lands here first.',
  autonomous: 'Runs unattended under agreed rules, with humans auditing rather than approving.',
};

/**
 * The rollout view (§20).
 *
 * The *same* agent records as the map, projected differently: autonomy lanes
 * across, deployment waves down. Nothing here is duplicated data — waves come
 * from the dependency depth the catalogue already computed.
 */
export function RolloutView() {
  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const agentStates = useWorkforceStore((s) => s.agentStates);
  const visibleAgentIds = useVisibleAgentIds();
  const progress = useProgress();

  const department =
    (focusedDepartmentId ? catalog.indexes.departmentById.get(focusedDepartmentId) : undefined) ??
    catalog.departments[0];

  const lanes = useMemo(() => {
    if (!department) return new Map<Autonomy, Agent[]>();
    const all = catalog.indexes.agentsByDepartment.get(department.id) ?? [];
    const visible = visibleAgentIds ? all.filter((a) => visibleAgentIds.has(a.id)) : all;

    const grouped = new Map<Autonomy, Agent[]>();
    for (const autonomy of AUTONOMY_ORDER) grouped.set(autonomy, []);
    for (const agent of visible) grouped.get(agent.autonomy)?.push(agent);

    // Within a lane, order by deployment wave then by the author's own order —
    // reading top to bottom is reading the build sequence.
    for (const list of grouped.values()) {
      list.sort(
        (a, b) =>
          (catalog.indexes.depthByAgent.get(a.id) ?? 0) - (catalog.indexes.depthByAgent.get(b.id) ?? 0) ||
          a.recommendedOrder - b.recommendedOrder ||
          a.name.localeCompare(b.name),
      );
    }
    return grouped;
  }, [department, visibleAgentIds]);

  if (!department) {
    return <p className="p-6 text-sm text-fg-muted">No departments in the catalogue.</p>;
  }

  const accent = accentVar(department.accent);
  const summary = progress.byDepartment.get(department.id);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line bg-surface px-3 py-2">
        <nav aria-label="Departments" className="flex gap-0.5 overflow-x-auto pb-0.5">
          {catalog.departments.map((item) => {
            const active = item.id === department.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  focusDepartment(item.id);
                  window.history.pushState(null, '', `/rollout/${item.slug}`);
                }}
                className="shrink-0 rounded px-2.5 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-fast)]"
                style={
                  active
                    ? { color: accentVar(item.accent), backgroundColor: 'var(--surface-hover)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-b border-line px-4 py-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <span aria-hidden className="h-3 w-0.5 rounded-full" style={{ backgroundColor: accent }} />
          {department.name} rollout
        </h1>
        <p className="mt-0.5 max-w-3xl text-2xs text-fg-muted">{department.description}</p>
        {summary && (
          <div className="mt-2 flex max-w-md items-center gap-2">
            <ProgressBar
              value={summary.completion}
              tone={accent}
              label={`${department.name}: ${summary.counts.live} of ${summary.total} live`}
            />
            <span className="shrink-0 font-mono text-2xs text-fg-muted">
              {summary.counts.live}/{summary.total} · {percent(summary.completion)}
            </span>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="grid gap-3 lg:grid-cols-3">
          {AUTONOMY_ORDER.map((autonomy) => {
            const agents = lanes.get(autonomy) ?? [];
            const style = AUTONOMY_STYLE[autonomy];
            return (
              <section key={autonomy} aria-labelledby={`lane-${autonomy}`} className="min-w-0">
                <header className="mb-2 flex items-baseline gap-2 border-b border-line-subtle pb-1.5">
                  <AutonomyGlyph autonomy={autonomy} size={11} tone={accent} />
                  <h2 id={`lane-${autonomy}`} className="text-2xs font-semibold uppercase tracking-wide text-fg">
                    {AUTONOMY_LABEL[autonomy]}
                  </h2>
                  <span className="ml-auto font-mono text-2xs text-fg-muted">{agents.length}</span>
                </header>
                <p className="mb-2 text-2xs leading-relaxed text-fg-muted">{LANE_HINT[autonomy]}</p>

                {agents.length === 0 ? (
                  <p className="rounded border border-dashed border-line px-2.5 py-3 text-2xs text-fg-muted">
                    No {style.label.toLowerCase()} agents in this department
                    {visibleAgentIds ? ' match the current filters' : ''}.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {agents.map((agent) => (
                      <RolloutAgentRow
                        key={agent.id}
                        agent={agent}
                        status={statusOf(agent.id, agentStates)}
                        wave={catalog.indexes.depthByAgent.get(agent.id) ?? 0}
                        accent={accent}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
