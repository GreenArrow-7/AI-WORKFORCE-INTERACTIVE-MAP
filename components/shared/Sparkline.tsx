interface SparklineProps {
  values: readonly number[];
  width?: number;
  height?: number;
  tone?: string;
  className?: string;
}

/** Tiny trend line. Decorative — the figure beside it carries the information. */
export function Sparkline({ values, width = 56, height = 16, tone, className }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((value, index) => `${(index * step).toFixed(1)},${(height - ((value - min) / span) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden focusable="false">
      <polyline
        points={points}
        fill="none"
        stroke={tone ?? 'var(--text-muted)'}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
