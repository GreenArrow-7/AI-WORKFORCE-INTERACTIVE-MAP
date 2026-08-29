'use client';

import { ArrowLeft } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { useProgress } from '@/lib/hooks/use-progress';
import { accentVar, percent } from '@/lib/ui/tokens';
import { useWorkforceStore } from '@/stores/workforce-store';

/**
 * Context header over the map, and the way back out (§7). Escape does the same
 * thing; this is the visible affordance for it.
 */
export function GraphBreadcrumb() {
  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const progress = useProgress();

  const department = focusedDepartmentId ? catalog.indexes.departmentById.get(focusedDepartmentId) : undefined;

  if (!department) {
    return (
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm">
        <h1 className="text-sm font-semibold text-fg">Company map</h1>
        <p className="mt-0.5 text-2xs text-fg-muted">
          {catalog.departments.length} departments · {catalog.agents.length} agents · click a department to open it
        </p>
      </div>
    );
  }

  const summary = progress.byDepartment.get(department.id);

  return (
    <div className="absolute left-4 top-4 z-10 max-w-sm">
      <button
        type="button"
        onClick={() => {
          focusDepartment(null);
          window.history.pushState(null, '', '/map');
        }}
        className="flex items-center gap-1.5 rounded text-2xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={11} aria-hidden />
        All departments
      </button>

      <h1 className="mt-1 flex items-center gap-2 text-sm font-semibold text-fg">
        <span
          aria-hidden
          className="h-3 w-0.5 rounded-full"
          style={{ backgroundColor: accentVar(department.accent) }}
        />
        {department.name}
      </h1>
      <p className="mt-0.5 text-2xs text-fg-muted">
        {summary ? `${summary.counts.live} of ${summary.total} live · ${percent(summary.completion)}` : ''} ·{' '}
        {department.mission}
      </p>
    </div>
  );
}
