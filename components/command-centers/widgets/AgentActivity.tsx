'use client';

import type { ActivityRow } from '@/lib/dashboards/sample';
import { AUTONOMY_LABEL } from '@/lib/schemas';
import { AutonomyGlyph } from '@/components/shared/AutonomyGlyph';
import { useWorkforceStore } from '@/stores/workforce-store';

/** What the agents actually did. Names link back into the map. */
export function AgentActivity({ rows }: { rows: readonly ActivityRow[] }) {
  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);

  if (rows.length === 0) {
    return <p className="py-4 text-center text-2xs text-fg-muted">No autonomous or assisted agents here yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[26rem] text-2xs">
        <thead>
          <tr className="border-b border-line-subtle text-left text-fg-muted">
            <th scope="col" className="pb-1 font-medium">Agent</th>
            <th scope="col" className="pb-1 text-right font-medium">Runs</th>
            <th scope="col" className="pb-1 text-right font-medium">Outputs</th>
            <th scope="col" className="pb-1 text-right font-medium">To a human</th>
            <th scope="col" className="pb-1 text-right font-medium">Last run</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.agent.id} className="border-b border-line-subtle last:border-0">
              <td className="py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    focusDepartment(row.agent.departmentId);
                    selectAgent(row.agent.id);
                  }}
                  className="flex items-center gap-1.5 text-fg-secondary transition-colors hover:text-fg"
                  title={AUTONOMY_LABEL[row.agent.autonomy]}
                >
                  <AutonomyGlyph autonomy={row.agent.autonomy} size={9} />
                  <span className="truncate">{row.agent.name}</span>
                </button>
              </td>
              <td className="py-1.5 text-right font-mono text-fg-secondary">{row.runs.toLocaleString('en-GB')}</td>
              <td className="py-1.5 text-right font-mono text-fg-secondary">{row.outputs.toLocaleString('en-GB')}</td>
              <td className="py-1.5 text-right font-mono text-fg-muted">{(row.escalationRate * 100).toFixed(0)}%</td>
              <td className="py-1.5 text-right text-fg-muted">{row.lastRun}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
