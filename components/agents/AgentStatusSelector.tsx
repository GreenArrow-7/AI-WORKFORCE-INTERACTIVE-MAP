'use client';

import { AGENT_STATUS_LABEL, AGENT_STATUS_ORDER, type AgentId, type AgentStatus } from '@/lib/schemas';
import { statusVar } from '@/lib/ui/tokens';
import { useWorkforceStore } from '@/stores/workforce-store';
import { StatusDot } from '@/components/shared/StatusDot';
import { cn } from '@/lib/utils/cn';

/**
 * Rollout status (§11). This is USER state and is stored separately from the
 * agent record — marking an agent live never mutates the catalogue.
 */
export function AgentStatusSelector({ agentId, status }: { agentId: AgentId; status: AgentStatus }) {
  const setStatus = useWorkforceStore((s) => s.setStatus);

  return (
    <div
      role="radiogroup"
      aria-label="Implementation status"
      className="flex items-center gap-0.5 rounded border border-line bg-bg-inset p-0.5"
    >
      {AGENT_STATUS_ORDER.map((option: AgentStatus) => {
        const selected = option === status;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setStatus(agentId, option)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-2xs transition-colors duration-[var(--dur-fast)]',
              selected ? 'bg-surface-hover text-fg' : 'text-fg-muted hover:text-fg-secondary',
            )}
            style={selected ? { color: statusVar(option) } : undefined}
          >
            <StatusDot status={option} size={11} labelled={false} />
            <span className="whitespace-nowrap">{AGENT_STATUS_LABEL[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
