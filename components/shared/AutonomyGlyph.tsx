import type { Autonomy } from '@/lib/schemas';
import { AUTONOMY_STYLE } from '@/lib/ui/tokens';
import { cn } from '@/lib/utils/cn';

interface AutonomyGlyphProps {
  autonomy: Autonomy;
  size?: number;
  tone?: string;
  className?: string;
}

/**
 * Autonomy as fill and stroke rather than colour: hollow-dashed for human-led,
 * hollow-solid for assisted, filled for autonomous (§10).
 */
export function AutonomyGlyph({ autonomy, size = 12, tone, className }: AutonomyGlyphProps) {
  const style = AUTONOMY_STYLE[autonomy];
  const colour = tone ?? 'var(--text-secondary)';
  const r = size / 2 - 1.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={style.label}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill={colour}
        fillOpacity={style.fill}
        stroke={colour}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.dash ?? undefined}
      />
    </svg>
  );
}
