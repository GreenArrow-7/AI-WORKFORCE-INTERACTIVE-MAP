'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { Metric } from '@/lib/schemas';
import { formatMetric, scaleMetric, type TimeRange } from '@/lib/dashboards/sample';
import { Sparkline } from '@/components/shared/Sparkline';

/** Headline figures, with the direction judged against `higherIsBetter`. */
export function MetricRow({ metrics, range }: { metrics: readonly Metric[]; range: TimeRange }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((raw) => {
        const metric = scaleMetric(raw, range);
        const delta = metric.delta ?? 0;
        const good = delta === 0 ? null : delta > 0 === metric.higherIsBetter;
        const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
        const tone = good === null ? 'var(--text-muted)' : good ? 'var(--positive)' : 'var(--negative)';

        return (
          <li key={metric.id} className="rounded-lg border border-line bg-surface px-2.5 py-2">
            <p className="truncate text-2xs text-fg-muted">{metric.label}</p>
            <p className="mt-0.5 font-mono text-sm text-fg">{formatMetric(metric)}</p>
            <div className="mt-1 flex items-center justify-between gap-1">
              <span className="flex items-center gap-0.5 text-2xs" style={{ color: tone }}>
                <Icon size={10} aria-hidden />
                {delta === 0 ? 'flat' : `${Math.abs(delta * 100).toFixed(0)}%`}
              </span>
              {metric.series && <Sparkline values={metric.series} tone={tone} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
