'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { useWorkforceStore } from '@/stores/workforce-store';
import { VIEW_MODES, type ViewMode } from '@/lib/routing';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from './ThemeToggle';
import { ProgressIndicator } from './ProgressIndicator';
import { WorkspaceMenu } from './WorkspaceMenu';
import { BrandMark } from './BrandMark';

const VIEW_LABEL: Record<ViewMode, string> = {
  map: 'Map',
  rollout: 'Roll out',
  'command-centers': 'Command centers',
};

export function TopNav() {
  const pathname = usePathname();
  const setSearchOpen = useWorkforceStore((s) => s.setSearchOpen);
  const active = VIEW_MODES.find((mode) => pathname.startsWith(`/${mode}`)) ?? 'map';

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
      <Link
        href="/map"
        className="flex items-center gap-2 rounded px-1 py-1 text-fg transition-colors hover:text-fg"
        aria-label="Atlas — go to the map"
      >
        <BrandMark />
        <span className="text-sm font-semibold tracking-tight">Atlas</span>
      </Link>

      <nav aria-label="Views" className="ml-3 hidden items-center gap-0.5 sm:flex">
        {VIEW_MODES.map((mode) => (
          <Link
            key={mode}
            href={`/${mode}`}
            aria-current={active === mode ? 'page' : undefined}
            className={cn(
              'rounded px-2.5 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-fast)]',
              active === mode
                ? 'bg-surface-hover text-fg'
                : 'text-fg-muted hover:bg-surface-hover hover:text-fg-secondary',
            )}
          >
            {VIEW_LABEL[mode]}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded border border-line bg-bg-inset py-1.5 pl-2 pr-1.5 text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg-secondary"
          aria-label="Search agents, skills and tools"
        >
          <Search size={13} aria-hidden />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden rounded border border-line px-1 font-mono text-2xs text-fg-muted md:inline">
            ⌘K
          </kbd>
        </button>

        <ProgressIndicator />
        <ThemeToggle />
        <WorkspaceMenu />
      </div>
    </header>
  );
}
