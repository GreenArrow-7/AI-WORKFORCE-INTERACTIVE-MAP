'use client';

import { useState } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { AGENT_STATUS_LABEL, type Agent, type AgentStatus } from '@/lib/schemas';
import { useWorkforceStore } from '@/stores/workforce-store';
import { Badge } from '@/components/shared/Badge';
import { StatusDot } from '@/components/shared/StatusDot';
import { AgentStatusSelector } from '@/components/agents/AgentStatusSelector';
import { cn } from '@/lib/utils/cn';

interface RolloutAgentRowProps {
  agent: Agent;
  status: AgentStatus;
  /** Dependency depth: 0 builds first, higher builds later. */
  wave: number;
  accent: string;
}

/**
 * One agent in a lane.
 *
 * Progressive disclosure (§21): the row shows what it replaces and its
 * deployment wave; expanding adds what it does, why a human stays involved, the
 * manual → autonomous path, its skills and tools, and status controls. The full
 * detail still lives in the shared drawer, one click away.
 */
export function RolloutAgentRow({ agent, status, wave, accent }: RolloutAgentRowProps) {
  const [open, setOpen] = useState(false);
  const selectAgent = useWorkforceStore((s) => s.selectAgent);

  const fn = catalog.indexes.functionById.get(agent.functionId);
  const department = catalog.indexes.departmentById.get(agent.departmentId);
  const skills = agent.skills.map((id) => catalog.indexes.skillById.get(id)).filter((s) => s !== undefined);

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex items-start gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronRight
            size={12}
            aria-hidden
            className={cn(
              'mt-0.5 shrink-0 text-fg-muted transition-transform duration-[var(--dur-fast)]',
              open && 'rotate-90',
            )}
          />
          <StatusDot status={status} size={12} labelled={false} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-fg">{agent.name}</span>
            <span className="mt-0.5 block truncate text-2xs text-fg-muted">
              {fn?.name} · Wave {wave + 1} · {AGENT_STATUS_LABEL[status]}
            </span>
            {agent.replaces[0] && (
              <span className="mt-1 block truncate text-2xs text-fg-secondary">Replaces: {agent.replaces[0]}</span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            selectAgent(agent.id);
            window.history.pushState(null, '', `/rollout/${department?.slug ?? ''}/${agent.slug}`);
          }}
          aria-label={`Open full details for ${agent.name}`}
          title="Open full details"
          className="shrink-0 rounded p-1 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <ExternalLink size={12} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-line-subtle px-2.5 py-2.5">
          <Detail label="What it does">{agent.description}</Detail>
          <Detail label="Business outcome">{agent.businessOutcome}</Detail>
          <Detail label="Why a human stays involved">
            {agent.humanInLoop.owner}
            {agent.humanInLoop.approvalPoints[0] ? ` — approves: ${agent.humanInLoop.approvalPoints[0]}` : ''}
          </Detail>

          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
              Manual → assisted → autonomous
            </p>
            <ol className="space-y-1">
              {(
                [
                  ['Manual', agent.evolution.manual],
                  ['Assisted', agent.evolution.assisted],
                  ['Autonomous', agent.evolution.autonomous],
                ] as const
              ).map(([label, text]) => (
                <li key={label} className="flex gap-2 text-2xs">
                  <span className="w-16 shrink-0 text-fg-muted">{label}</span>
                  <span className="min-w-0 flex-1 text-fg-secondary">{text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-2xs text-fg-muted">Tools</span>
            {agent.tools.map((id) => {
              const tool = catalog.indexes.toolById.get(id);
              return tool ? <Badge key={id}>{tool.name}</Badge> : null;
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-2xs text-fg-muted">Skills</span>
            {skills.length === 0 ? (
              <span className="text-2xs text-fg-muted">None defined</span>
            ) : (
              skills.map((skill) => (
                <Badge key={skill.id} tone={accent}>
                  {skill.slug}
                </Badge>
              ))
            )}
          </div>

          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">How to run it</p>
            <ul className="space-y-1">
              {agent.buildNotes.map((note, index) => (
                <li key={index} className="flex gap-1.5 text-2xs text-fg-secondary">
                  <span aria-hidden className="mt-[0.35rem] h-1 w-1 shrink-0 rounded-full bg-fg-muted" />
                  <span className="min-w-0">{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <AgentStatusSelector agentId={agent.id} status={status} />
        </div>
      )}
    </li>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-0.5 text-2xs leading-relaxed text-fg-secondary">{children}</p>
    </div>
  );
}
