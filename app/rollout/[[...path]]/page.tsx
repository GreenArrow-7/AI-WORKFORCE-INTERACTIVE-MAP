'use client';

import { useEffect } from 'react';
import { catalog } from '@/lib/catalog';
import { useRouteSync } from '@/lib/hooks/use-route-sync';
import { useWorkforceStore } from '@/stores/workforce-store';
import { RolloutView } from '@/components/rollout/RolloutView';
import { AgentDrawer } from '@/components/agents/AgentDrawer';

/**
 * The rollout view at every one of its URLs (§29). Uses the same catch-all
 * arrangement as the map so switching department never remounts the view.
 */
export default function RolloutPage() {
  useRouteSync('rollout');

  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);

  const close = (): void => {
    const department = focusedDepartmentId ? catalog.indexes.departmentById.get(focusedDepartmentId) : undefined;
    selectAgent(null);
    window.history.pushState(null, '', department ? `/rollout/${department.slug}` : '/rollout');
  };

  // Escape closes the drawer here; there is no camera to step back through.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const state = useWorkforceStore.getState();
      if (event.key !== 'Escape' || state.searchOpen || !state.selectedAgentId) return;
      close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="relative h-full w-full">
      <RolloutView />
      <AgentDrawer onClose={close} />
    </div>
  );
}
