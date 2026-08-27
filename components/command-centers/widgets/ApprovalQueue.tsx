'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { ApprovalItem } from '@/lib/dashboards/sample';
import { useWorkforceStore } from '@/stores/workforce-store';

/**
 * Work waiting on a person (§23).
 *
 * Genuinely interactive: clearing an item removes it and the count updates. The
 * decision is local to the demo — this dashboard reports on agents, it does not
 * approve anything on their behalf.
 */
export function ApprovalQueue({ items }: { items: readonly ApprovalItem[] }) {
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const remaining = items.filter((item) => !cleared.has(item.id));

  const clear = (id: string): void => setCleared((prev) => new Set(prev).add(id));

  if (remaining.length === 0) {
    return <p className="py-4 text-center text-2xs text-fg-muted">Nothing waiting on a human right now.</p>;
  }

  return (
    <ul className="space-y-1">
      {remaining.map((item) => (
        <li key={item.id} className="flex items-start gap-2 rounded border border-line-subtle px-2 py-1.5">
          <span className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => selectAgent(item.agent.id)}
              className="block truncate text-2xs font-medium text-fg-secondary transition-colors hover:text-fg"
            >
              {item.agent.name}
            </button>
            <span className="block truncate text-2xs text-fg-muted">{item.summary}</span>
          </span>
          <span className="shrink-0 font-mono text-2xs text-fg-muted">{item.waitingHours}h</span>
          <span className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => clear(item.id)}
              aria-label={`Approve: ${item.summary}`}
              className="rounded p-1 text-fg-muted transition-colors hover:bg-surface-hover"
              style={{ color: 'var(--positive)' }}
            >
              <Check size={11} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => clear(item.id)}
              aria-label={`Dismiss: ${item.summary}`}
              className="rounded p-1 text-fg-muted transition-colors hover:bg-surface-hover"
            >
              <X size={11} aria-hidden />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
