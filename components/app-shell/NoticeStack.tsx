'use client';

import { X } from 'lucide-react';
import { useWorkforceStore } from '@/stores/workforce-store';
import { cn } from '@/lib/utils/cn';

const TONE_CLASS = {
  info: 'border-line text-fg-secondary',
  success: 'border-[color-mix(in_oklab,var(--positive)_40%,transparent)] text-fg',
  warning: 'border-[color-mix(in_oklab,var(--caution)_45%,transparent)] text-fg',
} as const;

/**
 * Transient messages: a corrupted-storage recovery, an import result. Announced
 * politely so screen readers hear them without interrupting (§28).
 */
export function NoticeStack() {
  const notices = useWorkforceStore((s) => s.notices);
  const dismiss = useWorkforceStore((s) => s.dismissNotice);
  if (notices.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2"
    >
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={cn(
            'pointer-events-auto flex items-start gap-2 rounded-lg border bg-surface-elevated px-3 py-2 text-xs shadow-[var(--shadow-lg)]',
            TONE_CLASS[notice.tone],
          )}
        >
          <span className="flex-1">{notice.message}</span>
          <button
            type="button"
            onClick={() => dismiss(notice.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded p-0.5 text-fg-muted transition-colors hover:text-fg"
          >
            <X size={12} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
