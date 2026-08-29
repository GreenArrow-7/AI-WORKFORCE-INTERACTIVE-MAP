'use client';

import { AUTONOMY_LABEL, MATURITY_LABEL, type Agent } from '@/lib/schemas';
import { catalog } from '@/lib/catalog';
import { accentVar } from '@/lib/ui/tokens';
import { AutonomyGlyph } from '@/components/shared/AutonomyGlyph';
import { Badge } from '@/components/shared/Badge';

/** Name, where it sits, how autonomous it is, how proven it is (§12). */
export function AgentHeader({ agent }: { agent: Agent }) {
  const department = catalog.indexes.departmentById.get(agent.departmentId);
  const fn = catalog.indexes.functionById.get(agent.functionId);
  const accent = accentVar(department?.accent);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-2xs text-fg-muted">
        <span aria-hidden className="h-2.5 w-0.5 rounded-full" style={{ backgroundColor: accent }} />
        <span style={{ color: accent }}>{department?.name ?? 'Unknown department'}</span>
        <span aria-hidden>›</span>
        <span>{fn?.name ?? 'Unknown function'}</span>
      </p>

      <h2 className="mt-1 text-balance text-sm font-semibold leading-snug text-fg">{agent.name}</h2>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge tone={accent}>
          <AutonomyGlyph autonomy={agent.autonomy} size={9} tone={accent} />
          {AUTONOMY_LABEL[agent.autonomy]}
        </Badge>
        <Badge>{MATURITY_LABEL[agent.maturity]}</Badge>
        {agent.dependencies.length > 0 && (
          <Badge>
            {agent.dependencies.length} dependenc{agent.dependencies.length === 1 ? 'y' : 'ies'}
          </Badge>
        )}
      </div>
    </div>
  );
}
