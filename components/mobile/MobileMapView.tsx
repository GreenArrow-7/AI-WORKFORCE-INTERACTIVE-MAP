'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { AGENT_STATUS_LABEL, AUTONOMY_LABEL } from '@/lib/schemas';
import { statusOf } from '@/lib/progress/compute';
import { useProgress } from '@/lib/hooks/use-progress';
import { accentVar, percent } from '@/lib/ui/tokens';
import { useWorkforceStore } from '@/stores/workforce-store';
import { AutonomyGlyph } from '@/components/shared/AutonomyGlyph';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { StatusDot } from '@/components/shared/StatusDot';

/**
 * The mobile alternative to the map (§26).
 *
 * Not a shrunken radial tree — a real drill-down through department → function →
 * agent. It reads the same catalogue and drives the same selection state, so the
 * shared drawer opens as a bottom sheet with no duplicated data.
 */
export function MobileMapView() {
  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const openBrain = useWorkforceStore((s) => s.openBrain);
  const agentStates = useWorkforceStore((s) => s.agentStates);
  const progress = useProgress();

  const department = focusedDepartmentId ? catalog.indexes.departmentById.get(focusedDepartmentId) : undefined;

  if (!department) {
    return (
      <div className="h-full overflow-y-auto px-3 py-3">
        <button
          type="button"
          onClick={() => {
            openBrain(true);
            window.history.pushState(null, '', '/map/brain');
          }}
          className="mb-3 flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-3 py-3 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong">
            <span aria-hidden className="h-2 w-2 rounded-full bg-fg-secondary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-fg">
              {catalog.companyBrain?.name ?? 'Company Brain'}
            </span>
            <span className="block truncate text-2xs text-fg-muted">Shared context every agent reads from</span>
          </span>
          <ChevronRight size={14} aria-hidden className="shrink-0 text-fg-muted" />
        </button>

        <h2 className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Departments</h2>
        <ul className="space-y-1.5">
          {catalog.departments.map((item) => {
            const summary = progress.byDepartment.get(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    focusDepartment(item.id);
                    window.history.pushState(null, '', `/map/${item.slug}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-left"
                >
                  <span
                    aria-hidden
                    className="h-8 w-0.5 shrink-0 rounded-full"
                    style={{ backgroundColor: accentVar(item.accent) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-fg">{item.name}</span>
                    <span className="block truncate text-2xs text-fg-muted">
                      {summary?.counts.live ?? 0}/{summary?.total ?? 0} live · {percent(summary?.completion ?? 0)}
                    </span>
                    <ProgressBar
                      value={summary?.completion ?? 0}
                      tone={accentVar(item.accent)}
                      className="mt-1.5"
                      label={`${item.name} progress`}
                    />
                  </span>
                  <ChevronRight size={14} aria-hidden className="shrink-0 text-fg-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const functions = catalog.indexes.functionsByDepartment.get(department.id) ?? [];

  return (
    <div className="h-full overflow-y-auto px-3 py-3">
      <button
        type="button"
        onClick={() => {
          focusDepartment(null);
          window.history.pushState(null, '', '/map');
        }}
        className="mb-2 flex items-center gap-1 text-2xs text-fg-muted"
      >
        <ChevronLeft size={12} aria-hidden />
        All departments
      </button>

      <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <span
          aria-hidden
          className="h-3 w-0.5 rounded-full"
          style={{ backgroundColor: accentVar(department.accent) }}
        />
        {department.name}
      </h2>
      <p className="mb-3 mt-0.5 text-2xs text-fg-muted">{department.mission}</p>

      <div className="space-y-4">
        {functions.map((fn) => {
          const agents = catalog.indexes.agentsByFunction.get(fn.id) ?? [];
          return (
            <section key={fn.id}>
              <h3 className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">{fn.name}</h3>
              <ul className="space-y-1">
                {agents.map((agent) => {
                  const status = statusOf(agent.id, agentStates);
                  return (
                    <li key={agent.id}>
                      <button
                        type="button"
                        onClick={() => {
                          selectAgent(agent.id);
                          window.history.pushState(null, '', `/map/${department.slug}/${agent.slug}`);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 text-left"
                      >
                        <StatusDot status={status} size={13} labelled={false} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-fg">{agent.name}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-fg-muted">
                            <AutonomyGlyph autonomy={agent.autonomy} size={9} />
                            {AUTONOMY_LABEL[agent.autonomy]}
                            <span aria-hidden>·</span>
                            {AGENT_STATUS_LABEL[status]}
                          </span>
                        </span>
                        <ChevronRight size={13} aria-hidden className="shrink-0 text-fg-muted" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
