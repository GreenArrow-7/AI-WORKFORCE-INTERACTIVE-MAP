'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { catalog } from '@/lib/catalog';
import { CameraController } from '@/lib/graph/camera';
import { HighlightController, computeHighlight } from '@/lib/graph/highlight';
import { computeLayout } from '@/lib/graph/layout';
import { BRAIN_NODE_ID, type GraphNode } from '@/lib/graph/types';
import { statusOf } from '@/lib/progress/compute';
import { useProgress } from '@/lib/hooks/use-progress';
import { useVisibleAgentIds } from '@/lib/hooks/use-visible-agents';
import { useWorkforceStore } from '@/stores/workforce-store';
import { GraphViewport } from './GraphViewport';
import { GraphEdgeLine } from './GraphEdge';
import { GraphControls } from './GraphControls';
import { GraphTooltip, type TooltipTarget } from './GraphTooltip';
import { GraphBreadcrumb } from './GraphBreadcrumb';
import { GraphTextAlternative } from './GraphTextAlternative';
import { GraphFilters } from './GraphFilters';
import { BrainNode } from './nodes/BrainNode';
import { DepartmentNode } from './nodes/DepartmentNode';
import { FunctionNode } from './nodes/FunctionNode';
import { AgentNode } from './nodes/AgentNode';

/**
 * The interactive map.
 *
 * Holds three kinds of state, and keeps them apart on purpose:
 *   - layout, memoised on (focused department, filter set);
 *   - camera and highlight, in refs, applied straight to the DOM;
 *   - selection, in the store, because the drawer and the URL need it.
 *
 * Panning, zooming and hovering therefore never re-render a node (§27).
 */
export function WorkforceMap() {
  const cameraRef = useRef<CameraController>(null);
  if (cameraRef.current === null) cameraRef.current = new CameraController();
  const camera = cameraRef.current;

  const highlightRef = useRef<HighlightController>(null);
  if (highlightRef.current === null) highlightRef.current = new HighlightController();
  const highlight = highlightRef.current;

  const canvasRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipTarget | null>(null);
  const [pulseAt, setPulseAt] = useState<{ x: number; y: number; key: number } | null>(null);

  const focusedDepartmentId = useWorkforceStore((s) => s.focusedDepartmentId);
  const selectedAgentId = useWorkforceStore((s) => s.selectedAgentId);
  const brainOpen = useWorkforceStore((s) => s.brainOpen);
  const focusRequestId = useWorkforceStore((s) => s.focusRequestId);
  const agentStates = useWorkforceStore((s) => s.agentStates);
  const focusDepartment = useWorkforceStore((s) => s.focusDepartment);
  const selectAgent = useWorkforceStore((s) => s.selectAgent);
  const openBrain = useWorkforceStore((s) => s.openBrain);
  const requestFocus = useWorkforceStore((s) => s.requestFocus);

  const visibleAgentIds = useVisibleAgentIds();
  const progress = useProgress();

  const layout = useMemo(
    () => computeLayout({ catalog, focusDepartmentId: focusedDepartmentId, visibleAgentIds }),
    [focusedDepartmentId, visibleAgentIds],
  );

  /* --- camera ---------------------------------------------------------- */

  // Fit whenever the layout changes shape. The department transition is a
  // camera move, not a navigation (§7).
  useEffect(() => {
    const id = requestAnimationFrame(() => camera.fit(layout.bounds, 110));
    return () => cancelAnimationFrame(id);
  }, [camera, layout]);

  const handleResize = useCallback(() => {
    camera.fit(layout.bounds, 110, 0);
  }, [camera, layout]);

  /* --- highlight ------------------------------------------------------- */

  useEffect(() => {
    highlight.attach(canvasRef.current?.querySelector('[data-graph-canvas]') ?? null);
    return () => highlight.destroy();
  }, [highlight, layout]);

  const applyHighlight = useCallback(
    (nodeId: string | null) => {
      highlight.apply(computeHighlight(layout, catalog, nodeId));
    },
    [highlight, layout],
  );

  // Selection highlights persistently; hover overrides it while it lasts.
  useEffect(() => {
    if (hoveredRef.current) return;
    applyHighlight(selectedAgentId ?? (brainOpen ? BRAIN_NODE_ID : null));
  }, [applyHighlight, selectedAgentId, brainOpen]);

  const handleHoverChange = useCallback(
    (node: GraphNode | null) => {
      hoveredRef.current = node?.id ?? null;
      applyHighlight(node?.id ?? selectedAgentId ?? (brainOpen ? BRAIN_NODE_ID : null));

      if (!node || node.kind === 'brain') {
        setTooltip(null);
        return;
      }
      const state = camera.getState();
      setTooltip({
        node,
        status: node.kind === 'agent' ? statusOf(node.id, agentStates) : null,
        screenX: node.x * state.k + state.x,
        screenY: node.y * state.k + state.y,
      });
    },
    [applyHighlight, agentStates, brainOpen, camera, selectedAgentId],
  );

  // The tooltip is positioned once, at hover time. Rather than track the camera
  // per frame, dismiss it as soon as the camera moves.
  useEffect(() => {
    if (!tooltip) return;
    let first = true;
    return camera.subscribe(() => {
      if (first) {
        first = false;
        return;
      }
      setTooltip(null);
    });
  }, [camera, tooltip]);

  /* --- activation ------------------------------------------------------ */

  const handleActivate = useCallback(
    (node: GraphNode) => {
      if (node.kind === 'brain') {
        openBrain(true);
        window.history.pushState(null, '', '/map/brain');
        return;
      }
      if (node.kind === 'department') {
        const department = catalog.indexes.departmentById.get(node.id);
        focusDepartment(node.id);
        window.history.pushState(null, '', `/map/${department?.slug ?? ''}`);
        return;
      }
      if (node.kind === 'agent') {
        const agent = catalog.indexes.agentById.get(node.id);
        const department = agent ? catalog.indexes.departmentById.get(agent.departmentId) : undefined;
        selectAgent(node.id);
        window.history.pushState(null, '', `/map/${department?.slug ?? ''}/${agent?.slug ?? ''}`);
        return;
      }
      // A function node has no drawer of its own; focus the camera on it.
      camera.focusOn(node.x, node.y, Math.max(camera.getState().k, 0.85));
    },
    [camera, focusDepartment, openBrain, selectAgent],
  );

  /* --- search focus ---------------------------------------------------- */

  useEffect(() => {
    if (!focusRequestId) return;
    const node = layout.nodeById.get(focusRequestId);
    if (!node) return;
    camera.focusOn(node.x, node.y, Math.max(camera.getState().k, 0.9));
    setPulseAt({ x: node.x, y: node.y, key: Date.now() });
    requestFocus(null);
    const timer = setTimeout(() => setPulseAt(null), 800);
    return () => clearTimeout(timer);
  }, [camera, focusRequestId, layout, requestFocus]);

  /* --- escape moves backwards (§7) ------------------------------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      const state = useWorkforceStore.getState();
      if (state.searchOpen) return;

      if (state.brainOpen) {
        openBrain(false);
        window.history.pushState(null, '', '/map');
      } else if (state.selectedAgentId) {
        const agent = catalog.indexes.agentById.get(state.selectedAgentId);
        const department = agent ? catalog.indexes.departmentById.get(agent.departmentId) : undefined;
        selectAgent(null);
        window.history.pushState(null, '', `/map/${department?.slug ?? ''}`);
      } else if (state.focusedDepartmentId) {
        focusDepartment(null);
        window.history.pushState(null, '', '/map');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusDepartment, openBrain, selectAgent]);

  /* --- nodes ------------------------------------------------------------ */

  // Node elements are memoised so that hovering — which changes only the
  // tooltip and some DOM attributes — does not recreate 300 React elements.
  const nodeElements = useMemo(
    () =>
      layout.nodes.map((node) => {
        const selected = node.id === selectedAgentId || (node.kind === 'brain' && brainOpen);

        switch (node.kind) {
          case 'brain':
            return (
              <BrainNode
                key={node.id}
                node={node}
                selected={selected}
                onActivate={handleActivate}
                onHoverChange={handleHoverChange}
              />
            );
          case 'department': {
            const summary = progress.byDepartment.get(node.id);
            return (
              <DepartmentNode
                key={node.id}
                node={node}
                selected={selected}
                progress={summary?.completion ?? 0}
                liveCount={summary?.counts.live ?? 0}
                totalCount={summary?.total ?? 0}
                onActivate={handleActivate}
                onHoverChange={handleHoverChange}
              />
            );
          }
          case 'function':
            return (
              <FunctionNode
                key={node.id}
                node={node}
                selected={selected}
                onActivate={handleActivate}
                onHoverChange={handleHoverChange}
              />
            );
          case 'agent':
            return (
              <AgentNode
                key={node.id}
                node={node}
                selected={selected}
                status={statusOf(node.id, agentStates)}
                onActivate={handleActivate}
                onHoverChange={handleHoverChange}
              />
            );
          default:
            return null;
        }
      }),
    [layout, selectedAgentId, brainOpen, progress, agentStates, handleActivate, handleHoverChange],
  );

  const edgeElements = useMemo(
    () => layout.edges.map((edge) => <GraphEdgeLine key={edge.id} edge={edge} />),
    [layout],
  );

  return (
    <div ref={canvasRef} className="relative h-full w-full">
      <GraphViewport
        camera={camera}
        onResize={handleResize}
        ariaLabel={
          layout.mode === 'overview'
            ? 'Company map: the Company Brain and every department'
            : `Department map: functions and agents in ${catalog.indexes.departmentById.get(layout.focusId ?? '')?.name ?? 'the selected department'}`
        }
        onBackgroundClick={() => {
          selectAgent(null);
          openBrain(false);
        }}
      >
        <g className="graph-edges">{edgeElements}</g>
        <g className="graph-nodes">{nodeElements}</g>
        {pulseAt && (
          <circle
            key={pulseAt.key}
            className="graph-focus-pulse"
            cx={pulseAt.x}
            cy={pulseAt.y}
            style={{ ['--pulse-from' as string]: '14', ['--pulse-to' as string]: '44' }}
          />
        )}
      </GraphViewport>

      <GraphBreadcrumb />
      <GraphFilters />
      <GraphControls camera={camera} bounds={layout.bounds} />
      <GraphTooltip target={tooltip} />
      <GraphTextAlternative />
    </div>
  );
}
