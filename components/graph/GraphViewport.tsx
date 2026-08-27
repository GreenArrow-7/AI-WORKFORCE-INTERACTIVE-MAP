'use client';

import { useEffect, useRef } from 'react';
import { bindCameraInteraction, type CameraController } from '@/lib/graph/camera';
import { cn } from '@/lib/utils/cn';

/** Scale thresholds at which detail is dropped. Applied via a data attribute. */
const ZOOM_BANDS = [
  { max: 0.34, band: 'far' },
  { max: 0.62, band: 'mid' },
  { max: Infinity, band: 'near' },
] as const;

function bandFor(scale: number): string {
  return ZOOM_BANDS.find((b) => scale < b.max)?.band ?? 'near';
}

interface GraphViewportProps {
  camera: CameraController;
  children: React.ReactNode;
  /** Fires only for presses that did not turn into a drag. */
  onBackgroundClick?: () => void;
  /** Called whenever the element resizes, so the caller can refit. */
  onResize?: (width: number, height: number) => void;
  className?: string;
  ariaLabel: string;
}

/**
 * The pan/zoom surface.
 *
 * Deliberately domain-free: it knows about a camera, a size and a level of
 * detail, and nothing about agents. React renders this element once; every
 * subsequent pan and zoom is a single attribute write on the inner `<g>` by the
 * camera, with no re-render at any depth (§27).
 */
export function GraphViewport({
  camera,
  children,
  onBackgroundClick,
  onResize,
  className,
  ariaLabel,
}: GraphViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    const scene = sceneRef.current;
    if (!host || !scene) return;

    camera.attach(scene);
    const detach = bindCameraInteraction(host, camera, {
      onDragEnd: (moved) => {
        draggedRef.current = moved;
      },
    });

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      camera.setViewport({ width: rect.width, height: rect.height });
      onResize?.(rect.width, rect.height);
    });
    observer.observe(host);

    const rect = host.getBoundingClientRect();
    camera.setViewport({ width: rect.width, height: rect.height });

    // Level of detail is a data attribute, updated at most once per frame and
    // only when the band actually changes. No React involvement.
    let currentBand = '';
    const unsubscribe = camera.subscribe((state) => {
      const next = bandFor(state.k);
      if (next === currentBand) return;
      currentBand = next;
      svgRef.current?.setAttribute('data-zoom-band', next);
    });

    return () => {
      unsubscribe();
      observer.disconnect();
      detach();
      camera.attach(null);
    };
  }, [camera, onResize]);

  return (
    <div
      ref={hostRef}
      className={cn('relative h-full w-full touch-none select-none overflow-hidden bg-graph-grid', className)}
      onClick={() => {
        // A press that panned is not a click on the background.
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onBackgroundClick?.();
      }}
    >
      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        data-graph-canvas
        data-zoom-band="near"
        role="img"
        aria-label={ariaLabel}
      >
        <g ref={sceneRef}>{children}</g>
      </svg>
    </div>
  );
}
