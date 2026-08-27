import { cn } from '@/lib/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  /** A CSS colour value, normally from `accentVar` or `statusVar`. */
  tone?: string;
  className?: string;
  title?: string;
}

/** Small, quiet label. Used for tools, autonomy and maturity. */
export function Badge({ children, tone, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium',
        'border-line-subtle bg-surface-elevated text-fg-secondary',
        className,
      )}
      style={tone ? { color: tone, borderColor: `color-mix(in oklab, ${tone} 32%, transparent)` } : undefined}
    >
      {children}
    </span>
  );
}
