'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { buildSearchIndex, searchCatalog, type SearchResult } from '@/lib/search';
import { useWorkforceStore } from '@/stores/workforce-store';
import { SearchResultRow } from './SearchResultRow';

/**
 * ⌘K palette (§15).
 *
 * The index is built once from the catalogue, which is immutable, so it is
 * module-level rather than per-render — even at a thousand agents this is a few
 * hundred kilobytes of strings built exactly once.
 */
const index = buildSearchIndex(catalog);

export function GlobalSearch() {
  const open = useWorkforceStore((s) => s.searchOpen);
  const setSearchOpen = useWorkforceStore((s) => s.setSearchOpen);
  const setViewMode = useWorkforceStore((s) => s.setViewMode);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const requestFocus = useWorkforceStore((s) => s.requestFocus);
  const states = useWorkforceStore((s) => s.agentStates);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchCatalog(index, query), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  /**
   * Selecting a result closes the palette, switches to the owning department,
   * selects the agent and asks the graph to animate to it. The graph consumes
   * `focusRequestId` and clears it.
   */
  const choose = (result: SearchResult): void => {
    setSearchOpen(false);

    if (result.kind === 'tool') {
      // A tool has no place on the map; filter the map by it instead.
      setViewMode('map');
      useWorkforceStore.getState().setFilters({ toolIds: [result.id] });
      window.history.pushState(null, '', '/map');
      return;
    }

    setViewMode('map');

    if (result.agentId) {
      const agent = catalog.indexes.agentById.get(result.agentId);
      if (!agent) return;
      const department = catalog.indexes.departmentById.get(agent.departmentId);
      focusDepartment(agent.departmentId);
      selectAgent(agent.id);
      requestFocus(agent.id);
      window.history.pushState(null, '', `/map/${department?.slug ?? ''}/${agent.slug}`);
      return;
    }

    if (result.departmentId) {
      const department = catalog.indexes.departmentById.get(result.departmentId);
      focusDepartment(result.departmentId);
      selectAgent(null);
      window.history.pushState(null, '', `/map/${department?.slug ?? ''}`);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) choose(result);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setSearchOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface-elevated shadow-[var(--shadow-lg)]"
          aria-label="Search agents, skills and tools"
        >
          <Dialog.Title className="sr-only-focusable">Search</Dialog.Title>
          <Dialog.Description className="sr-only-focusable">
            Search across departments, functions, agents, skills and tools.
          </Dialog.Description>

          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={14} aria-hidden className="shrink-0 text-fg-muted" />
            {/* A command palette that does not focus its input on open is broken. */}
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search agents, skills, tools…"
              aria-label="Search query"
              aria-controls="search-results"
              aria-activedescendant={results[activeIndex] ? `search-result-${activeIndex}` : undefined}
              role="combobox"
              aria-expanded={results.length > 0}
              className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
            />
            <kbd className="hidden shrink-0 rounded border border-line px-1 font-mono text-2xs text-fg-muted sm:inline">
              esc
            </kbd>
          </div>

          {query.trim().length > 0 && results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-fg-muted">
              Nothing matches “{query.trim()}”. Try a department, an agent, a skill or a tool.
            </p>
          )}

          {results.length > 0 && (
            <ul
              ref={listRef}
              id="search-results"
              role="listbox"
              aria-label="Search results"
              className="max-h-[52vh] overflow-y-auto py-1"
            >
              {results.map((result, i) => (
                <SearchResultRow
                  key={`${result.kind}-${result.id}`}
                  id={`search-result-${i}`}
                  result={result}
                  active={i === activeIndex}
                  status={result.agentId ? (states[result.agentId]?.status ?? 'not_started') : null}
                  onSelect={() => choose(result)}
                  onHover={() => setActiveIndex(i)}
                />
              ))}
            </ul>
          )}

          {query.trim().length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-fg-muted">
              Search {catalog.agents.length} agents, {catalog.skills.length} skills and {catalog.tools.length} tools.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
