import type { AgentStatus } from '@/lib/schemas';
import { STATUS_STYLE, statusVar } from '@/lib/ui/tokens';
import { cn } from '@/lib/utils/cn';

interface StatusDotProps {
  status: AgentStatus;
  size?: number;
  className?: string;
  /** Set false when an adjacent label already names the status. */
  labelled?: boolean;
}

/**
 * Status as a ring whose *filled fraction* carries the meaning, so it reads
 * correctly in greyscale and for colour-blind users (§10, §28).
 */
export function StatusDot({ status, size = 12, className, labelled = true }: StatusDotProps) {
  const style = STATUS_STYLE[status];
  const r = size / 2 - 1.25;
  const circumference = 2 * Math.PI * r;
  const tone = statusVar(status);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
      role={labelled ? 'img' : 'presentation'}
      aria-label={labelled ? style.label : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={1.5}
        strokeDasharray={style.dashed ? '2 2' : undefined}
      />
      {style.ring > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill={status === 'live' ? tone : 'none'}
          stroke={tone}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray={`${circumference * style.ring} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      {status === 'live' && (
        <path
          d={`M${size * 0.3},${size * 0.52} L${size * 0.44},${size * 0.66} L${size * 0.71},${size * 0.36}`}
          fill="none"
          stroke="var(--bg)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
