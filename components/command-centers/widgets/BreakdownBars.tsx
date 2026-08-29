import type { BreakdownBar } from '@/lib/dashboards/sample';
import { ProgressBar } from '@/components/shared/ProgressBar';

/** Horizontal comparison. Values are labelled, so the bars are never the only cue. */
export function BreakdownBars({ bars }: { bars: readonly BreakdownBar[] }) {
  if (bars.length === 0) return <p className="py-4 text-center text-2xs text-fg-muted">Nothing to break down.</p>;

  return (
    <ul className="space-y-2">
      {bars.map((bar) => (
        <li key={bar.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-2xs text-fg-secondary">{bar.label}</span>
            <span className="shrink-0 font-mono text-2xs text-fg-muted">
              {bar.value}
              <span className="text-fg-muted">/{bar.max}</span>
            </span>
          </div>
          <ProgressBar
            value={bar.max === 0 ? 0 : bar.value / bar.max}
            tone={bar.tone}
            label={`${bar.label}: ${bar.value} of ${bar.max}`}
          />
        </li>
      ))}
    </ul>
  );
}
