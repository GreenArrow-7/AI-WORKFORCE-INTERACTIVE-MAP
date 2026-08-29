'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useWorkforceStore, type ThemePreference } from '@/stores/workforce-store';
import { cn } from '@/lib/utils/cn';

const OPTIONS: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
];

export function ThemeToggle() {
  const theme = useWorkforceStore((s) => s.workspace.theme);
  const setTheme = useWorkforceStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded border border-line bg-bg-inset p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'rounded p-1 transition-colors duration-[var(--dur-fast)]',
            theme === value ? 'bg-surface-hover text-fg' : 'text-fg-muted hover:text-fg-secondary',
          )}
        >
          <Icon size={13} aria-hidden />
        </button>
      ))}
    </div>
  );
}
