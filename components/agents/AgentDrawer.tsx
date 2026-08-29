'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, GitBranch } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { statusOf } from '@/lib/progress/compute';
import { renderSkillFile, skillFilename } from '@/lib/skills/render';
import { copyText, downloadText } from '@/lib/export/snapshot';
import { useWorkforceStore } from '@/stores/workforce-store';
import { Drawer, DrawerList, DrawerSection } from '@/components/shared/Drawer';
import { AgentHeader } from './AgentHeader';
import { AgentStatusSelector } from './AgentStatusSelector';
import { AgentDependencies } from './AgentDependencies';
import { AgentToolBadges } from './AgentToolBadges';
import { AgentHumanInLoop } from './AgentHumanInLoop';
import { AgentSkills } from './AgentSkills';

interface AgentDrawerProps {
  /** Where closing should return to. The map steps back, rollout just closes. */
  onClose: () => void;
}

/**
 * The agent inspector (§12).
 *
 * One component, shared by the map and the rollout view — both read the same
 * agent record, so there is no second copy of any of this to drift.
 */
export function AgentDrawer({ onClose }: AgentDrawerProps) {
  const selectedAgentId = useWorkforceStore((s) => s.selectedAgentId);
  const agentStates = useWorkforceStore((s) => s.agentStates);
  const setNotes = useWorkforceStore((s) => s.setNotes);
  const [copied, setCopied] = useState(false);
  const dependenciesRef = useRef<HTMLDivElement>(null);

  const agent = selectedAgentId ? catalog.indexes.agentById.get(selectedAgentId) : undefined;
  const status = agent ? statusOf(agent.id, agentStates) : 'not_started';

  const skills = useMemo(
    () => (agent ? agent.skills.map((id) => catalog.indexes.skillById.get(id)).filter((s) => s !== undefined) : []),
    [agent],
  );

  // Every skill file concatenated, for the drawer-level copy/download actions.
  const combinedSkillFile = useMemo(
    () => skills.map((skill) => renderSkillFile(skill, catalog)).join('\n\n---\n\n'),
    [skills],
  );

  const handleCopySkills = async (): Promise<void> => {
    if (skills.length === 0) return;
    const ok = await copyText(combinedSkillFile);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDownloadSkills = (): void => {
    const first = skills[0];
    if (!first) return;
    const filename = skills.length === 1 ? skillFilename(first) : `${agent?.slug ?? 'agent'}-skills.md`;
    downloadText(filename, combinedSkillFile, 'text/markdown');
  };

  return (
    <Drawer
      open={Boolean(agent)}
      onClose={onClose}
      title={agent ? `${agent.name} details` : 'Agent details'}
      header={agent ? <AgentHeader agent={agent} /> : null}
      footer={
        agent ? (
          <div className="space-y-2">
            <AgentStatusSelector agentId={agent.id} status={status} />
            <div className="flex items-center gap-1.5">
              <FooterAction
                icon={copied ? Check : Copy}
                label={copied ? 'Copied' : 'Copy skill'}
                onClick={() => void handleCopySkills()}
                disabled={skills.length === 0}
              />
              <FooterAction
                icon={Download}
                label="Download .md"
                onClick={handleDownloadSkills}
                disabled={skills.length === 0}
              />
              <FooterAction
                icon={GitBranch}
                label="Dependencies"
                onClick={() => dependenciesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                disabled={agent.dependencies.length === 0}
              />
            </div>
          </div>
        ) : null
      }
    >
      {agent && (
        <div className="space-y-3.5">
          <DrawerSection title="Summary">
            <p className="text-xs text-fg-secondary">{agent.shortDescription}</p>
          </DrawerSection>

          <DrawerSection title="What it does">
            <p className="text-xs leading-relaxed text-fg-secondary">{agent.description}</p>
          </DrawerSection>

          <DrawerSection title="Business outcome">
            <p className="text-xs leading-relaxed text-fg-secondary">{agent.businessOutcome}</p>
          </DrawerSection>

          <DrawerSection title="Replaces or reduces">
            <DrawerList items={agent.replaces} />
          </DrawerSection>

          <DrawerSection title="Inputs">
            <DrawerList items={agent.inputs} />
          </DrawerSection>

          <DrawerSection title="Outputs">
            <DrawerList items={agent.outputs} />
          </DrawerSection>

          <DrawerSection title="Tools">
            <AgentToolBadges toolIds={agent.tools} />
          </DrawerSection>

          <DrawerSection title="Human in the loop">
            <AgentHumanInLoop humanInLoop={agent.humanInLoop} />
          </DrawerSection>

          <div ref={dependenciesRef} className="scroll-mt-2">
            <DrawerSection title="Dependencies">
              <AgentDependencies agent={agent} />
            </DrawerSection>
          </div>

          <DrawerSection title="Manual → assisted → autonomous">
            <ol className="space-y-1.5">
              {(
                [
                  ['Manual today', agent.evolution.manual],
                  ['With assistance', agent.evolution.assisted],
                  ['Fully autonomous', agent.evolution.autonomous],
                ] as const
              ).map(([label, text]) => (
                <li key={label}>
                  <p className="text-2xs text-fg-muted">{label}</p>
                  <p className="text-xs text-fg-secondary">{text}</p>
                </li>
              ))}
            </ol>
          </DrawerSection>

          <DrawerSection title="Deployment notes">
            <DrawerList items={agent.buildNotes} />
          </DrawerSection>

          <DrawerSection title={skills.length === 1 ? 'Skill file' : 'Skill files'}>
            <AgentSkills skillIds={agent.skills} />
          </DrawerSection>

          <DrawerSection title="Your notes">
            <textarea
              key={agent.id}
              defaultValue={agentStates[agent.id]?.notes ?? ''}
              onBlur={(event) => setNotes(agent.id, event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Anything your team needs to remember about this one…"
              aria-label={`Notes for ${agent.name}`}
              className="w-full resize-y rounded border border-line bg-bg-inset px-2 py-1.5 text-xs text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-line-strong"
            />
          </DrawerSection>
        </div>
      )}
    </Drawer>
  );
}

function FooterAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-1 items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-2xs text-fg-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon size={12} aria-hidden />
      {label}
    </button>
  );
}
