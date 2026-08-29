'use client';

import { Boxes, Bot, FileCode2, Layers, Wrench } from 'lucide-react';
import type { AgentStatus } from '@/lib/schemas';
import type { SearchResult, SearchResultKind } from '@/lib/search';
import { AUTONOMY_LABEL } from '@/lib/schemas';
import { AutonomyGlyph } from '@/components/shared/AutonomyGlyph';
import { StatusDot } from '@/components/shared/StatusDot';
import { cn } from '@/lib/utils/cn';

const KIND_ICON: Record<SearchResultKind, typeof Bot> = {
  agent: Bot,
  department: Boxes,
  function: Layers,
  skill: FileCode2,
  tool: Wrench,
};

interface SearchResultRowProps {
  id: string;
  result: SearchResult;
  active: boolean;
  status: AgentStatus | null;
  onSelect: () => void;
  onHover: () => void;
}

/** One result. Shows agent, department, function, autonomy and status (§15). */
export function SearchResultRow({ id, result, active, status, onSelect, onHover }: SearchResultRowProps) {
  const Icon = KIND_ICON[result.kind];

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      className={cn('mx-1 rounded transition-colors', active && 'bg-surface-hover')}
    >
      <button
        type="button"
        onClick={onSelect}
        tabIndex={-1}
        className="flex w-full items-center gap-2.5 px-2 py-2 text-left"
      >
        <Icon size={13} aria-hidden className="shrink-0 text-fg-muted" />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-fg">{result.title}</span>
          <span className="block truncate text-2xs text-fg-muted">{result.subtitle}</span>
        </span>

        {result.autonomy && (
          <span className="hidden shrink-0 items-center gap-1 sm:flex" title={AUTONOMY_LABEL[result.autonomy]}>
            <AutonomyGlyph autonomy={result.autonomy} size={10} />
            <span className="text-2xs text-fg-muted">{AUTONOMY_LABEL[result.autonomy]}</span>
          </span>
        )}

        {status && <StatusDot status={status} size={11} />}
      </button>
    </li>
  );
}
