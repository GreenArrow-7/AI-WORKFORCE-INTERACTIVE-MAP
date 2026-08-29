'use client';

import { catalog } from '@/lib/catalog';
import { AGENT_STATUS_LABEL, AUTONOMY_LABEL } from '@/lib/schemas';
import { statusOf } from '@/lib/progress/compute';
import { useWorkforceStore } from '@/stores/workforce-store';

/**
 * The hierarchical text equivalent of the map (§28).
 *
 * A pan-and-zoom SVG cannot be made fully navigable by assistive technology, so
 * the same information is also present as nested lists. It is visually hidden
 * but focusable and fully in the accessibility tree — not a summary of the
 * graph, but the graph's actual content.
 */
export function GraphTextAlternative() {
  const agentStates = useWorkforceStore((s) => s.agentStates);
  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const selectAgent = useWorkforceStore((s) => s.selectAgent);

  const departments = focusedDepartmentId
    ? catalog.departments.filter((d) => d.id === focusedDepartmentId)
    : catalog.departments;

  return (
    <nav aria-label="Map contents, as a list" className="sr-only-focusable absolute left-2 top-2 z-40">
      <h2>Map contents</h2>
      <p>
        {catalog.companyBrain?.name ?? 'Company Brain'} is the shared context every agent reads from. It connects to{' '}
        {catalog.departments.length} departments.
      </p>
      <ul>
        {departments.map((department) => {
          const functions = catalog.indexes.functionsByDepartment.get(department.id) ?? [];
          return (
            <li key={department.id}>
              <button type="button" onClick={() => focusDepartment(department.id)}>
                {department.name} department
              </button>
              <ul>
                {functions.map((fn) => {
                  const agents = catalog.indexes.agentsByFunction.get(fn.id) ?? [];
                  return (
                    <li key={fn.id}>
                      {fn.name} function
                      <ul>
                        {agents.map((agent) => (
                          <li key={agent.id}>
                            <button
                              type="button"
                              onClick={() => {
                                focusDepartment(agent.departmentId);
                                selectAgent(agent.id);
                              }}
                            >
                              {agent.name}. {AUTONOMY_LABEL[agent.autonomy]}.{' '}
                              {AGENT_STATUS_LABEL[statusOf(agent.id, agentStates)]}.
                              {agent.dependencies.length > 0
                                ? ` Depends on ${agent.dependencies
                                    .map((id) => catalog.indexes.agentById.get(id)?.name ?? id)
                                    .join(', ')}.`
                                : ' No dependencies.'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
