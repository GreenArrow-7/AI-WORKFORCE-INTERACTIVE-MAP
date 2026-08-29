'use client';

import { catalog } from '@/lib/catalog';
import { useRouteSync } from '@/lib/hooks/use-route-sync';
import { useIsSmallViewport } from '@/lib/hooks/use-viewport';
import { useWorkforceStore } from '@/stores/workforce-store';
import { WorkforceMap } from '@/components/graph/WorkforceMap';
import { MobileMapView } from '@/components/mobile/MobileMapView';
import { AgentDrawer } from '@/components/agents/AgentDrawer';
import { BrainDrawer } from '@/components/brain/BrainDrawer';

/**
 * The map, at every one of its URLs.
 *
 * A single optional catch-all route so that `/map`, `/map/sales` and
 * `/map/sales/outreach-writer` are all the *same* page component: entering a
 * department animates the camera rather than remounting anything (§7, §29).
 */
export default function MapPage() {
  useRouteSync('map');

  const isSmall = useIsSmallViewport();
  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const openBrain = useWorkforceStore((s) => s.openBrain);
  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);
  const brainOpen = useWorkforceStore((s) => s.brainOpen);

  const closeAgent = (): void => {
    const department = focusedDepartmentId
      ? catalog.indexes.departmentById.get(focusedDepartmentId)
      : undefined;
    selectAgent(null);
    window.history.pushState(null, '', department ? `/map/${department.slug}` : '/map');
  };

  const closeBrain = (): void => {
    openBrain(false);
    window.history.pushState(null, '', '/map');
  };

  return (
    <div className="relative h-full w-full">
      {/* Layout is switched by CSS so the first paint is right on any device;
          once mounted, the hidden branch is unmounted so neither costs anything
          it does not need to (§26). */}
      {isSmall !== true && (
        <div className="hidden h-full w-full md:block">
          <WorkforceMap />
        </div>
      )}

      {isSmall !== false && (
        <div className="h-full w-full md:hidden">
          <MobileMapView />
        </div>
      )}

      <AgentDrawer onClose={closeAgent} />
      {brainOpen && <BrainDrawer onClose={closeBrain} />}
    </div>
  );
}
