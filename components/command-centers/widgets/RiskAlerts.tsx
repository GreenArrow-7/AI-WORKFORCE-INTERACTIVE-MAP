'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { RiskItem } from '@/lib/dashboards/sample';
import { cn } from '@/lib/utils/cn';

const SEVERITY_TONE: Record<RiskItem['severity'], string> = {
  high: 'var(--negative)',
  medium: 'var(--caution)',
  low: 'var(--text-muted)',
};

const ORDER: Record<RiskItem['severity'], number> = { high: 0, medium: 1, low: 2 };

/** Risks, filterable by severity. Sorted worst first so triage reads top-down. */
export function RiskAlerts({ items }: { items: readonly RiskItem[] }) {
  const [minimum, setMinimum] = useState<RiskItem['severity'] | 'all'>('all');

  const visible = [...items]
    .filter((item) => minimum === 'all' || ORDER[item.severity] <= ORDER[minimum])
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        {(['all', 'high', 'medium'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={minimum === option}
            onClick={() => setMinimum(option)}
            className={cn(
              'rounded border px-1.5 py-0.5 text-2xs capitalize transition-colors',
              minimum === option
                ? 'border-line-strong bg-surface-hover text-fg'
                : 'border-line-subtle text-fg-muted hover:text-fg-secondary',
            )}
          >
            {option === 'all' ? 'All' : `${option} and above`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-3 text-center text-2xs text-fg-muted">No risks at this level.</p>
      ) : (
        <ul className="space-y-1">
          {visible.map((item) => (
            <li key={item.id} className="flex items-start gap-2 rounded border border-line-subtle px-2 py-1.5">
              <AlertTriangle
                size={11}
                aria-hidden
                className="mt-0.5 shrink-0"
                style={{ color: SEVERITY_TONE[item.severity] }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-2xs font-medium text-fg-secondary">{item.title}</span>
                <span className="block text-2xs text-fg-muted">{item.detail}</span>
              </span>
              <span
                className="shrink-0 text-2xs capitalize"
                style={{ color: SEVERITY_TONE[item.severity] }}
              >
                {item.severity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
