import { cn } from '@/lib/utils/cn';

interface ProgressBarProps {
  /** 0–1. */
  value: number;
  tone?: string;
  className?: string;
  /** Rendered for screen readers; the bar itself is decorative without it. */
  label: string;
}

export function ProgressBar({ value, tone, className, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn('h-1 w-full overflow-hidden rounded-full bg-bg-inset', className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
        style={{ width: `${pct}%`, backgroundColor: tone ?? 'var(--status-live)' }}
      />
    </div>
  );
}
