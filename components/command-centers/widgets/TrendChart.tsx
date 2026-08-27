'use client';

import { useMemo, useState } from 'react';
import type { Metric } from '@/lib/schemas';
import { formatMetric } from '@/lib/dashboards/sample';
import { cn } from '@/lib/utils/cn';

/**
 * A real, interactive chart: pick a metric, hover a point to read it.
 * Interactivity is the point of §23 — a static image would not demonstrate the
 * product.
 */
export function TrendChart({ metrics, tone }: { metrics: readonly Metric[]; tone: string }) {
  const charted = useMemo(() => metrics.filter((m) => (m.series?.length ?? 0) > 1), [metrics]);
  const [selectedId, setSelectedId] = useState(charted[0]?.id ?? '');
  const [hover, setHover] = useState<number | null>(null);

  const metric = charted.find((m) => m.id === selectedId) ?? charted[0];
  if (!metric?.series) return <p className="text-2xs text-fg-muted">No series data.</p>;

  const values = metric.series;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 100;
  const height = 34;
  const step = width / (values.length - 1);

  const line = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / span) * height).toFixed(2)}`)
    .join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  const activeIndex = hover ?? values.length - 1;
  const activeValue = values[activeIndex] ?? 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {charted.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={option.id === metric.id}
            onClick={() => {
              setSelectedId(option.id);
              setHover(null);
            }}
            className={cn(
              'rounded border px-1.5 py-0.5 text-2xs transition-colors',
              option.id === metric.id
                ? 'border-line-strong bg-surface-hover text-fg'
                : 'border-line-subtle text-fg-muted hover:text-fg-secondary',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="font-mono text-sm text-fg">
        {formatMetric({ ...metric, value: activeValue })}
        <span className="ml-2 text-2xs text-fg-muted">
          point {activeIndex + 1} of {values.length}
        </span>
      </p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="mt-2 h-24 w-full"
        role="img"
        aria-label={`${metric.label} over ${values.length} periods, from ${formatMetric({ ...metric, value: values[0] ?? 0 })} to ${formatMetric({ ...metric, value: values[values.length - 1] ?? 0 })}`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          setHover(Math.max(0, Math.min(values.length - 1, Math.round(ratio * (values.length - 1)))));
        }}
      >
        <polygon points={area} fill={tone} fillOpacity={0.1} />
        <polyline
          points={line}
          fill="none"
          stroke={tone}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={activeIndex * step}
          x2={activeIndex * step}
          y1={0}
          y2={height}
          stroke="var(--border-strong)"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={activeIndex * step}
          cy={height - ((activeValue - min) / span) * height}
          r={1.6}
          fill={tone}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
