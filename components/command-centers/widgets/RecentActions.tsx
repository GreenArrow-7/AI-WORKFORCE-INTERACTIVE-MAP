'use client';

import type { ActionItem } from '@/lib/dashboards/sample';

/** A plain feed of what was produced, and when. */
export function RecentActions({ items }: { items: readonly ActionItem[] }) {
  if (items.length === 0) return <p className="py-4 text-center text-2xs text-fg-muted">No recent activity.</p>;

  return (
    <ol className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2">
          <span aria-hidden className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-fg-muted" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-2xs text-fg-secondary">
              <span className="text-fg">{item.agent.name}</span> · {item.action}
            </span>
            <span className="block text-2xs text-fg-muted">{item.when}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
