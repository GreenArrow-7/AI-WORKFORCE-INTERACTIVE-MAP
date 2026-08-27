'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Rendered under the title, inside the sticky header. */
  header?: React.ReactNode;
  /** Rendered in a sticky footer. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * The inspector panel.
 *
 * Deliberately **non-modal**: §12 requires that opening an agent does not leave
 * the graph, so the map stays interactive and focus is not trapped. That also
 * means it is not a `dialog` — it is a labelled `complementary` region, which is
 * what assistive technology should be told it is.
 *
 * Escape is handled by the owning view rather than here, because "go back" means
 * something view-specific: on the map it steps out through agent → department →
 * overview.
 *
 * On small viewports the same component becomes a bottom sheet (§26).
 */
export function Drawer({ open, onClose, title, children, header, footer, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement;
    // Move focus to the panel so keyboard users land inside it, without
    // trapping them there — this panel is not modal.
    const timer = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      clearTimeout(timer);
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement && document.contains(target)) target.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="drawer"
          ref={panelRef}
          tabIndex={-1}
          role="complementary"
          aria-label={title}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.22, 0.61, 0.36, 1] }}
          className={cn(
            'absolute z-30 flex flex-col overflow-hidden border-line bg-surface shadow-[var(--shadow-lg)] outline-none',
            // Bottom sheet below sm, right-hand panel from sm up.
            'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t',
            'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(30rem,42vw)] sm:rounded-none sm:border-l sm:border-t-0',
            className,
          )}
        >
          <header className="sticky top-0 z-10 shrink-0 border-b border-line bg-surface px-4 pb-3 pt-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">{header}</div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="-mr-1 -mt-1 shrink-0 rounded p-1.5 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

          {footer && <footer className="shrink-0 border-t border-line bg-surface px-4 py-3">{footer}</footer>}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Section wrapper used throughout the drawer, so headings stay consistent. */
export function DrawerSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-t border-line-subtle pt-3 first:border-0 first:pt-0', className)}>
      <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
      {children}
    </section>
  );
}

/** Bulleted prose list, the drawer's most common body shape. */
export function DrawerList({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-fg-muted">Not specified.</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li key={index} className="flex gap-1.5 text-xs text-fg-secondary">
          <span aria-hidden className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-fg-muted" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
