'use client';

import { useEffect, useState } from 'react';
import { Crosshair, Maximize2, Minus, Plus } from 'lucide-react';
import type { CameraController } from '@/lib/graph/camera';
import type { Bounds } from '@/lib/graph/types';

interface GraphControlsProps {
  camera: CameraController;
  bounds: Bounds;
}

/**
 * Floating camera controls. Every control is also reachable from the keyboard,
 * and each carries an explicit label because an icon-only control is invisible
 * to a screen reader (§28).
 */
export function GraphControls({ camera, bounds }: GraphControlsProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => camera.subscribe((state) => setScale(state.k)), [camera]);

  return (
    <div className="glass absolute bottom-4 right-4 z-10 flex items-center gap-0.5 rounded-lg p-1 shadow-[var(--shadow-md)]">
      <ControlButton label="Zoom out" onClick={() => camera.zoomBy(1 / 1.35)}>
        <Minus size={13} aria-hidden />
      </ControlButton>

      <span
        className="w-11 select-none text-center font-mono text-2xs text-fg-muted"
        aria-live="off"
        title="Current zoom level"
      >
        {Math.round(scale * 100)}%
      </span>

      <ControlButton label="Zoom in" onClick={() => camera.zoomBy(1.35)}>
        <Plus size={13} aria-hidden />
      </ControlButton>

      <span aria-hidden className="mx-0.5 h-4 w-px bg-line" />

      <ControlButton label="Fit to screen" onClick={() => camera.fit(bounds, 110)}>
        <Maximize2 size={12} aria-hidden />
      </ControlButton>

      <ControlButton
        label="Reset camera"
        onClick={() => camera.animateTo({ x: camera.getViewport().width / 2, y: camera.getViewport().height / 2, k: 1 })}
      >
        <Crosshair size={12} aria-hidden />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded p-1.5 text-fg-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-fg"
    >
      {children}
    </button>
  );
}
