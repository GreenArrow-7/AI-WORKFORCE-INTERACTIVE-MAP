'use client';

import { useEffect } from 'react';
import { useWorkforceStore } from '@/stores/workforce-store';
import { TopNav } from './TopNav';
import { NoticeStack } from './NoticeStack';
import { GlobalSearch } from '@/components/search/GlobalSearch';

/**
 * The frame every view renders inside.
 *
 * Owns exactly three cross-cutting concerns — hydrating persisted state,
 * reflecting the theme preference onto the document, and the ⌘K shortcut — and
 * nothing else. View-specific behaviour belongs to the views.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrate = useWorkforceStore((s) => s.hydrate);
  const theme = useWorkforceStore((s) => s.workspace.theme);
  const setSearchOpen = useWorkforceStore((s) => s.setSearchOpen);

  // Persisted state is applied after mount, never during render, so the first
  // client render matches the server's.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const root = document.documentElement;
    // Dark is the CSS default and needs no attribute.
    if (theme === 'dark') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSearchOpen]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <a
        href="#main"
        className="sr-only-focusable absolute left-3 top-3 z-50 rounded border border-line bg-surface-elevated px-3 py-1.5 text-sm"
      >
        Skip to content
      </a>
      <TopNav />
      <main id="main" className="relative flex-1 overflow-hidden">
        {children}
      </main>
      <GlobalSearch />
      <NoticeStack />
    </div>
  );
}
