'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import type { CommandCenter, Widget } from '@/lib/schemas';
import {
  TIME_RANGES,
  TIME_RANGE_LABEL,
  buildActivity,
  buildApprovals,
  buildBreakdown,
  buildRecentActions,
  buildRisks,
  type TimeRange,
} from '@/lib/dashboards/sample';
import { useProgress } from '@/lib/hooks/use-progress';
import { accentVar } from '@/lib/ui/tokens';
import { MetricRow } from './widgets/MetricRow';
import { TrendChart } from './widgets/TrendChart';
import { BreakdownBars } from './widgets/BreakdownBars';
import { ApprovalQueue } from './widgets/ApprovalQueue';
import { RiskAlerts } from './widgets/RiskAlerts';
import { AgentActivity } from './widgets/AgentActivity';
import { RecentActions } from './widgets/RecentActions';
import { cn } from '@/lib/utils/cn';

const SPAN_CLASS: Record<number, string> = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  12: 'lg:col-span-12',
};

/**
 * Renders a dashboard from its widget declarations (§22, §23).
 *
 * The layout is data: `kind` selects a component and `span` selects a width, so
 * adding a dashboard means adding a record to `data/commandCenters.ts` — not
 * writing another React screen.
 */
export function Dashboard({ centre, onBack }: { centre: CommandCenter; onBack: () => void }) {
  const [range, setRange] = useState<TimeRange>('7d');
  const progress = useProgress();

  const accent = accentVar(catalog.indexes.departmentById.get(centre.departmentIds[0] ?? '')?.accent);

  const liveByDepartment = useMemo(() => {
    const map = new Map<string, { live: number; total: number }>();
    for (const [id, summary] of progress.byDepartment) {
      map.set(id, { live: summary.counts.live, total: summary.total });
    }
    return map;
  }, [progress]);

  const data = useMemo(
    () => ({
      activity: buildActivity(catalog, centre, range),
      approvals: buildApprovals(catalog, centre),
      risks: buildRisks(catalog, centre),
      recent: buildRecentActions(catalog, centre),
      breakdown: buildBreakdown(catalog, centre, liveByDepartment, (id) =>
        accentVar(catalog.indexes.departmentById.get(id)?.accent),
      ),
    }),
    [centre, range, liveByDepartment],
  );

  const renderWidget = (widget: Widget): React.ReactNode => {
    switch (widget.kind) {
      case 'metric-row':
        return <MetricRow metrics={centre.metrics} range={range} />;
      case 'trend-chart':
        return <TrendChart metrics={centre.metrics} tone={accent} />;
      case 'breakdown-bars':
        return <BreakdownBars bars={data.breakdown} />;
      case 'approval-queue':
        return <ApprovalQueue items={data.approvals} />;
      case 'risk-alerts':
        return <RiskAlerts items={data.risks} />;
      case 'agent-activity':
        return <AgentActivity rows={data.activity} />;
      case 'recent-actions':
        return <RecentActions items={data.recent} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-2xs text-fg-muted transition-colors hover:text-fg-secondary"
        >
          <ArrowLeft size={11} aria-hidden />
          All command centers
        </button>

        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <span aria-hidden className="h-3 w-0.5 rounded-full" style={{ backgroundColor: accent }} />
              {centre.name}
            </h1>
            <p className="mt-0.5 max-w-2xl text-2xs text-fg-muted">{centre.description}</p>
          </div>

          <div role="radiogroup" aria-label="Time range" className="flex items-center gap-0.5 rounded border border-line bg-bg-inset p-0.5">
            {TIME_RANGES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={range === option}
                aria-label={TIME_RANGE_LABEL[option]}
                onClick={() => setRange(option)}
                className={cn(
                  'rounded px-2 py-1 text-2xs transition-colors duration-[var(--dur-fast)]',
                  range === option ? 'bg-surface-hover text-fg' : 'text-fg-muted hover:text-fg-secondary',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-12">
        {centre.widgets.map((widget) => (
          <section
            key={widget.id}
            aria-labelledby={`widget-${widget.id}`}
            className={cn(
              'min-w-0 rounded-lg border border-line bg-surface p-3',
              SPAN_CLASS[widget.span] ?? 'lg:col-span-6',
              widget.kind === 'metric-row' && 'border-0 bg-transparent p-0',
            )}
          >
            {widget.kind !== 'metric-row' && (
              <h2
                id={`widget-${widget.id}`}
                className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted"
              >
                {widget.title}
              </h2>
            )}
            {widget.kind === 'metric-row' && (
              <h2 id={`widget-${widget.id}`} className="sr-only-focusable">
                {widget.title}
              </h2>
            )}
            {renderWidget(widget)}
          </section>
        ))}
      </div>

      <p className="px-4 pb-6 text-2xs text-fg-muted">
        Figures are sample data for a fictional company. Agent names, activity and approval items are drawn from the
        live catalogue, so these dashboards move with it.
      </p>
    </div>
  );
}
