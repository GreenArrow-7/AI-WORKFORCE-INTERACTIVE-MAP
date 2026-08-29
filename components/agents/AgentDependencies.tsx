'use client';

import { ArrowUpRight } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import type { Agent, AgentStatus } from '@/lib/schemas';
import { AGENT_STATUS_LABEL } from '@/lib/schemas';
import { statusOf } from '@/lib/progress/compute';
import { useWorkforceStore } from '@/stores/workforce-store';
import { StatusDot } from '@/components/shared/StatusDot';

/**
 * Upstream agents, and downstream ones this unblocks.
 *
 * Each row is a link into the graph rather than a label, which is what makes the
 * deployment order explorable instead of merely described (§9).
 */
export function AgentDependencies({ agent }: { agent: Agent }) {
  const agentStates = useWorkforceStore((s) => s.agentStates);
  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const requestFocus = useWorkforceStore((s) => s.requestFocus);

  const upstream = agent.dependencies
    .map((id) => catalog.indexes.agentById.get(id))
    .filter((a): a is Agent => a !== undefined);
  const downstream = (catalog.indexes.dependentsByAgent.get(agent.id) ?? [])
    .map((id) => catalog.indexes.agentById.get(id))
    .filter((a): a is Agent => a !== undefined);

  const go = (target: Agent): void => {
    const department = catalog.indexes.departmentById.get(target.departmentId);
    focusDepartment(target.departmentId);
    selectAgent(target.id);
    requestFocus(target.id);
    window.history.pushState(null, '', `/map/${department?.slug ?? ''}/${target.slug}`);
  };

  if (upstream.length === 0 && downstream.length === 0) {
    return (
      <p className="text-xs text-fg-muted">
        No agent dependencies. This one reads context from the Company Brain and can be built first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {upstream.length > 0 && (
        <div>
          <p className="mb-1 text-2xs text-fg-muted">Needs these first</p>
          <ul className="space-y-0.5">
            {upstream.map((dependency) => (
              <DependencyRow
                key={dependency.id}
                agent={dependency}
                status={statusOf(dependency.id, agentStates)}
                onClick={() => go(dependency)}
              />
            ))}
          </ul>
        </div>
      )}

      {downstream.length > 0 && (
        <div>
          <p className="mb-1 text-2xs text-fg-muted">Unblocks</p>
          <ul className="space-y-0.5">
            {downstream.map((dependent) => (
              <DependencyRow
                key={dependent.id}
                agent={dependent}
                status={statusOf(dependent.id, agentStates)}
                onClick={() => go(dependent)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DependencyRow({
  agent,
  status,
  onClick,
}: {
  agent: Agent;
  status: AgentStatus;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-hover"
      >
        <StatusDot status={status} size={11} labelled={false} />
        <span className="min-w-0 flex-1 truncate text-xs text-fg-secondary group-hover:text-fg">{agent.name}</span>
        <span className="shrink-0 text-2xs text-fg-muted">{AGENT_STATUS_LABEL[status]}</span>
        <ArrowUpRight
          size={11}
          aria-hidden
          className="shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>
    </li>
  );
}
