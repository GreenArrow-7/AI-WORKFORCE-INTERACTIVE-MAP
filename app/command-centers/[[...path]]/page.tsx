'use client';

import { catalog } from '@/lib/catalog';
import { useRouteSync } from '@/lib/hooks/use-route-sync';
import { useWorkforceStore } from '@/stores/workforce-store';
import { CommandCenterGrid } from '@/components/command-centers/CommandCenterGrid';
import { Dashboard } from '@/components/command-centers/Dashboard';
import { AgentDrawer } from '@/components/agents/AgentDrawer';

/** Command centers: the grid, or one dashboard (§22, §29). */
export default function CommandCentersPage() {
  useRouteSync('command-centers');

  const commandCenterId = useWorkforceStore((s) => s.commandCenterId);
  const setCommandCenter = useWorkforceStore((s) => s.setCommandCenter);
  const selectAgent = useWorkforceStore((s) => s.selectAgent);

  const centre = commandCenterId
    ? catalog.commandCenters.find((item) => item.id === commandCenterId)
    : undefined;

  return (
    <div className="relative h-full w-full">
      {centre ? (
        <Dashboard
          centre={centre}
          onBack={() => {
            setCommandCenter(null);
            window.history.pushState(null, '', '/command-centers');
          }}
        />
      ) : (
        <CommandCenterGrid />
      )}
      <AgentDrawer onClose={() => selectAgent(null)} />
    </div>
  );
}
