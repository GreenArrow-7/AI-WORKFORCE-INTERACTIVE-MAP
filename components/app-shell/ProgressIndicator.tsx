'use client';

import { useState } from 'react';
import { useProgress } from '@/lib/hooks/use-progress';
import { percent } from '@/lib/ui/tokens';
import { Popover } from '@/components/shared/Popover';
import { ProgressPanel } from '@/components/progress/ProgressPanel';

/** Compact completion ring in the top bar; opens the full breakdown (§17). */
export function ProgressIndicator() {
  const [open, setOpen] = useState(false);
  const { company } = useProgress();
  const r = 7;
  const circumference = 2 * Math.PI * r;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Workforce progress"
      trigger={
        <button
          type="button"
          className="flex items-center gap-1.5 rounded border border-line bg-bg-inset px-2 py-1 text-2xs text-fg-secondary transition-colors hover:border-line-strong"
          aria-label={`Workforce progress: ${company.counts.live} of ${company.total} agents live, ${percent(company.completion)}`}
        >
          <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden>
            <circle cx="9" cy="9" r={r} fill="none" stroke="var(--border-strong)" strokeWidth={2} />
            <circle
              cx="9"
              cy="9"
              r={r}
              fill="none"
              stroke="var(--status-live)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`${circumference * company.completion} ${circumference}`}
              transform="rotate(-90 9 9)"
              className="transition-[stroke-dasharray] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
            />
          </svg>
          <span className="hidden font-mono lg:inline">
            {company.counts.live}/{company.total}
          </span>
        </button>
      }
    >
      <ProgressPanel onNavigate={() => setOpen(false)} />
    </Popover>
  );
}
