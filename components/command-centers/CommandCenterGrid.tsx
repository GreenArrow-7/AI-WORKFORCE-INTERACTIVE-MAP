'use client';

import { ArrowRight } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import type { CommandCenter } from '@/lib/schemas';
import { formatMetric } from '@/lib/dashboards/sample';
import { accentVar } from '@/lib/ui/tokens';
import { Sparkline } from '@/components/shared/Sparkline';
import { useWorkforceStore } from '@/stores/workforce-store';

/** Preview cards for every command center (§22). */
export function CommandCenterGrid() {
  const setCommandCenter = useWorkforceStore((s) => s.setCommandCenter);

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <header className="mb-4">
        <h1 className="text-sm font-semibold text-fg">Command centers</h1>
        <p className="mt-0.5 max-w-2xl text-2xs text-fg-muted">
          Where the workforce reports in. Each one gathers the output of the agents in its departments into the view a
          team actually runs on.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.commandCenters.map((centre) => (
          <li key={centre.id}>
            <CommandCenterCard
              centre={centre}
              onOpen={() => {
                setCommandCenter(centre.id);
                window.history.pushState(null, '', `/command-centers/${centre.slug}`);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommandCenterCard({ centre, onOpen }: { centre: CommandCenter; onOpen: () => void }) {
  const accent = accentVar(catalog.indexes.departmentById.get(centre.departmentIds[0] ?? '')?.accent);
  const agentCount = centre.departmentIds.reduce(
    (sum, id) => sum + (catalog.indexes.agentsByDepartment.get(id)?.length ?? 0),
    0,
  );
  const headline = centre.metrics.slice(0, 3);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full flex-col rounded-lg border border-line bg-surface p-3 text-left transition-colors duration-[var(--dur-ui)] hover:border-line-strong hover:bg-surface-elevated"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-fg">{centre.name}</span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-fg-muted">{centre.description}</span>
        </span>
        <ArrowRight
          size={13}
          aria-hidden
          className="mt-0.5 shrink-0 text-fg-muted transition-transform duration-[var(--dur-ui)] group-hover:translate-x-0.5"
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line-subtle pt-2.5">
        {headline.map((metric) => (
          <div key={metric.id} className="min-w-0">
            <dt className="truncate text-2xs text-fg-muted">{metric.label}</dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-mono text-xs text-fg-secondary">{formatMetric(metric)}</span>
              {metric.series && <Sparkline values={metric.series} width={28} height={10} tone={accent} />}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-2.5 text-2xs text-fg-muted">
        {centre.departmentIds.length} department{centre.departmentIds.length === 1 ? '' : 's'} · {agentCount} agents
        reporting in
      </p>
    </button>
  );
}
