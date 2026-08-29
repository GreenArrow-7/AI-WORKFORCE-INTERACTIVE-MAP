'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils/cn';

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  label: string;
  /** Controlled mode, so callers can close the popover after acting. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Thin wrapper over Radix Popover. Radix is used for the focus management and
 * dismissal behaviour, not for its styling — the surface is ours.
 */
export function Popover({
  trigger,
  children,
  align = 'end',
  className,
  label,
  open,
  onOpenChange,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={8}
          aria-label={label}
          className={cn(
            'z-50 rounded-lg border border-line bg-surface-elevated p-3 shadow-[var(--shadow-lg)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            className,
          )}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
