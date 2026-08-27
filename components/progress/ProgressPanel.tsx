'use client';

import { ArrowRight } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { recommendNextDeployments } from '@/lib/progress/compute';
import { useProgress } from '@/lib/hooks/use-progress';
import { useWorkforceStore } from '@/stores/workforce-store';
import { accentVar, percent, statusVar } from '@/lib/ui/tokens';
import { AGENT_STATUS_LABEL, AGENT_STATUS_ORDER } from '@/lib/schemas';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { StatusDot } from '@/components/shared/StatusDot';

interface ProgressPanelProps {
  /** Called after a department is chosen, so a popover can close itself. */
  onNavigate?: () => void;
}

/**
 * Company progress with a department breakdown (§17). Clicking a department
 * focuses it on the map.
 */
export function ProgressPanel({ onNavigate }: ProgressPanelProps) {
  const progress = useProgress();
  const states = useWorkforceStore((s) => s.agentStates);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const setViewMode = useWorkforceStore((s) => s.setViewMode);
  const recommendations = recommendNextDeployments(catalog, states, 3);
  const { counts, total, completion } = progress.company;

  const goToDepartment = (id: string, slug: string): void => {
    setViewMode('map');
    focusDepartment(id);
    window.history.pushState(null, '', `/map/${slug}`);
    onNavigate?.();
  };

  return (
    <div className="w-[19rem] space-y-4">
      <section aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="text-xs font-semibold text-fg">
          Workforce progress
        </h2>
        <p className="mt-1 text-2xs text-fg-muted">
          <span className="font-medium text-fg-secondary">{counts.live}</span> of {total} agents live ·{' '}
          {percent(completion)}
        </p>
        <ProgressBar value={completion} className="mt-2" label={`${counts.live} of ${total} agents live`} />

        <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
          {AGENT_STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-1.5 text-2xs text-fg-muted">
              <StatusDot status={status} size={11} labelled={false} />
              <span>{AGENT_STATUS_LABEL[status]}</span>
              <span className="ml-auto font-mono text-fg-secondary">{counts[status]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="breakdown-heading" className="border-t border-line-subtle pt-3">
        <h3 id="breakdown-heading" className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
          By department
        </h3>
        <ul className="mt-2 space-y-1">
          {catalog.departments.map((department) => {
            const summary = progress.byDepartment.get(department.id);
            if (!summary) return null;
            return (
              <li key={department.id}>
                <button
                  type="button"
                  onClick={() => goToDepartment(department.id, department.slug)}
                  className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-hover"
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-0.5 shrink-0 rounded-full"
                    style={{ backgroundColor: accentVar(department.accent) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-2xs text-fg-secondary group-hover:text-fg">
                    {department.name}
                  </span>
                  <span className="font-mono text-2xs text-fg-muted">
                    {summary.counts.live}/{summary.total}
                  </span>
                  <span className="w-12 shrink-0">
                    <ProgressBar
                      value={summary.completion}
                      tone={accentVar(department.accent)}
                      label={`${department.name}: ${summary.counts.live} of ${summary.total} live`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {recommendations.length > 0 && (
        <section aria-labelledby="next-heading" className="border-t border-line-subtle pt-3">
          <h3 id="next-heading" className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
            Recommended next
          </h3>
          <ol className="mt-2 space-y-1.5">
            {recommendations.map((rec) => {
              const department = catalog.indexes.departmentById.get(rec.agent.departmentId);
              return (
                <li key={rec.agent.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('map');
                      focusDepartment(rec.agent.departmentId);
                      useWorkforceStore.getState().selectAgent(rec.agent.id);
                      useWorkforceStore.getState().requestFocus(rec.agent.id);
                      window.history.pushState(null, '', `/map/${department?.slug ?? ''}/${rec.agent.slug}`);
                      onNavigate?.();
                    }}
                    className="group flex w-full items-start gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-hover"
                  >
                    <StatusDot status="not_started" size={11} labelled={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-2xs font-medium text-fg-secondary group-hover:text-fg">
                        {rec.agent.name}
                      </span>
                      <span className="block truncate text-2xs text-fg-muted">{rec.reason}</span>
                    </span>
                    <ArrowRight
                      size={11}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <p className="border-t border-line-subtle pt-2 text-2xs text-fg-muted">
        <span style={{ color: statusVar('live') }}>●</span> Progress is stored in this browser. Export it from the
        workspace menu to keep or share it.
      </p>
    </div>
  );
}
