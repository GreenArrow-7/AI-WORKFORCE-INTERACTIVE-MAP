'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { AGENT_STATUS_LABEL, AGENT_STATUS_ORDER, AUTONOMY_LABEL, type Autonomy } from '@/lib/schemas';
import { AUTONOMY_ORDER } from '@/lib/schemas/common';
import { accentVar } from '@/lib/ui/tokens';
import { useVisibleAgentIds } from '@/lib/hooks/use-visible-agents';
import { isFilterActive, useWorkforceStore } from '@/stores/workforce-store';
import { Popover } from '@/components/shared/Popover';
import { cn } from '@/lib/utils/cn';

/**
 * Filters (§16).
 *
 * Changing a filter only changes the layout's input — the camera is untouched,
 * so the viewport survives every filter change.
 */
export function GraphFilters() {
  const [open, setOpen] = useState(false);
  const filters = useWorkforceStore((s) => s.filters);
  const setFilters = useWorkforceStore((s) => s.setFilters);
  const clearFilters = useWorkforceStore((s) => s.clearFilters);
  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);
  const visible = useVisibleAgentIds();
  const active = isFilterActive(filters);

  const functions = focusedDepartmentId
    ? (catalog.indexes.functionsByDepartment.get(focusedDepartmentId) ?? [])
    : catalog.functionGroups;

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
      {active && (
        <div className="glass flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-2xs text-fg-secondary">
          <span>
            {visible?.size ?? catalog.agents.length} of {catalog.agents.length} agents
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded p-0.5 text-fg-muted transition-colors hover:text-fg"
            aria-label="Clear all filters"
          >
            <X size={11} aria-hidden />
          </button>
        </div>
      )}

      <Popover
        open={open}
        onOpenChange={setOpen}
        label="Filters"
        trigger={
          <button
            type="button"
            aria-label={active ? 'Filters (active)' : 'Filters'}
            className={cn(
              'glass flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-2xs transition-colors',
              active ? 'text-fg' : 'text-fg-muted hover:text-fg-secondary',
            )}
          >
            <Filter size={12} aria-hidden />
            Filters
            {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--focus-ring)]" />}
          </button>
        }
      >
        <div className="max-h-[70vh] w-[20rem] space-y-3 overflow-y-auto pr-1">
          <FacetGroup label="Department">
            {catalog.departments.map((department) => (
              <Chip
                key={department.id}
                selected={filters.departmentIds.includes(department.id)}
                tone={accentVar(department.accent)}
                onClick={() => setFilters({ departmentIds: toggle(filters.departmentIds, department.id) })}
              >
                {department.name}
              </Chip>
            ))}
          </FacetGroup>

          <FacetGroup label="Autonomy">
            {AUTONOMY_ORDER.map((autonomy: Autonomy) => (
              <Chip
                key={autonomy}
                selected={filters.autonomy.includes(autonomy)}
                onClick={() => setFilters({ autonomy: toggle(filters.autonomy, autonomy) })}
              >
                {AUTONOMY_LABEL[autonomy]}
              </Chip>
            ))}
          </FacetGroup>

          <FacetGroup label="Implementation status">
            {AGENT_STATUS_ORDER.map((status) => (
              <Chip
                key={status}
                selected={filters.status.includes(status)}
                onClick={() => setFilters({ status: toggle(filters.status, status) })}
              >
                {AGENT_STATUS_LABEL[status]}
              </Chip>
            ))}
          </FacetGroup>

          <FacetGroup label={focusedDepartmentId ? 'Function (this department)' : 'Function'}>
            {functions.map((fn) => (
              <Chip
                key={fn.id}
                selected={filters.functionIds.includes(fn.id)}
                onClick={() => setFilters({ functionIds: toggle(filters.functionIds, fn.id) })}
              >
                {fn.name}
              </Chip>
            ))}
          </FacetGroup>

          <FacetGroup label="Tool">
            {catalog.tools.map((tool) => (
              <Chip
                key={tool.id}
                selected={filters.toolIds.includes(tool.id)}
                onClick={() => setFilters({ toolIds: toggle(filters.toolIds, tool.id) })}
              >
                {tool.name}
              </Chip>
            ))}
          </FacetGroup>

          <FacetGroup label="Has">
            <Chip selected={filters.hasSkills} onClick={() => setFilters({ hasSkills: !filters.hasSkills })}>
              Skill file
            </Chip>
            <Chip
              selected={filters.hasDependencies}
              onClick={() => setFilters({ hasDependencies: !filters.hasDependencies })}
            >
              Dependencies
            </Chip>
          </FacetGroup>

          {active && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded border border-line px-2 py-1.5 text-2xs text-fg-secondary transition-colors hover:bg-surface-hover"
            >
              Clear all filters
            </button>
          )}
        </div>
      </Popover>
    </div>
  );
}

function FacetGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line-subtle pb-3 last:border-0 last:pb-0">
      <legend className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-muted">{label}</legend>
      <div className="flex flex-wrap gap-1">{children}</div>
    </fieldset>
  );
}

function Chip({
  selected,
  tone,
  onClick,
  children,
}: {
  selected: boolean;
  tone?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'rounded border px-1.5 py-0.5 text-2xs transition-colors duration-[var(--dur-fast)]',
        selected
          ? 'border-line-strong bg-surface-hover text-fg'
          : 'border-line-subtle text-fg-muted hover:border-line hover:text-fg-secondary',
      )}
      style={selected && tone ? { borderColor: tone, color: tone } : undefined}
    >
      {children}
    </button>
  );
}
