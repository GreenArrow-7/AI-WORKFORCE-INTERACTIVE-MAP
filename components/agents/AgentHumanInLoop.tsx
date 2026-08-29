import type { HumanInLoop } from '@/lib/schemas';
import { DrawerList } from '@/components/shared/Drawer';

/**
 * Who stays involved, when approval is needed, what stays human-owned (§12).
 * Three fields rather than one paragraph, because they are three questions.
 */
export function AgentHumanInLoop({ humanInLoop }: { humanInLoop: HumanInLoop }) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-2xs text-fg-muted">Stays involved</p>
        <p className="text-xs text-fg-secondary">{humanInLoop.owner}</p>
      </div>
      <div>
        <p className="mb-1 text-2xs text-fg-muted">Approval needed</p>
        <DrawerList items={humanInLoop.approvalPoints} />
      </div>
      <div>
        <p className="mb-1 text-2xs text-fg-muted">Remains human-owned</p>
        <DrawerList items={humanInLoop.retainedByHumans} />
      </div>
    </div>
  );
}
