import type { Bounds } from './types';

export interface CameraState {
  /** Screen-space translation. */
  x: number;
  y: number;
  /** Scale. Graph point (gx,gy) renders at (gx*k + x, gy*k + y). */
  k: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const ZOOM_LIMITS = { min: 0.12, max: 3.2 } as const;

const DEFAULT_DURATION = 560;

function clampScale(k: number): number {
  return Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, k));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Owns the map's viewport transform.
 *
 * The camera is deliberately **not** React state. It lives here and is applied
 * by writing `transform` straight onto one `<g>` element, so panning and zooming
 * cost one attribute write per frame and zero React renders no matter how many
 * nodes are on screen (§27).
 *
 * Subscribers exist only for chrome that genuinely needs the value (the zoom
 * readout), and are notified at most once per frame.
 */
export class CameraController {
  private state: CameraState = { x: 0, y: 0, k: 1 };
  private from: CameraState = { x: 0, y: 0, k: 1 };
  private to: CameraState = { x: 0, y: 0, k: 1 };
  private animStart = 0;
  private animDuration = 0;
  private animating = false;
  private frame: number | null = null;

  private target: SVGGElement | null = null;
  private viewport: Viewport = { width: 1, height: 1 };
  private listeners = new Set<(state: CameraState) => void>();
  private notifyQueued = false;

  attach(element: SVGGElement | null): void {
    this.target = element;
    this.apply();
  }

  setViewport(viewport: Viewport): void {
    this.viewport = { width: Math.max(viewport.width, 1), height: Math.max(viewport.height, 1) };
  }

  getViewport(): Viewport {
    return this.viewport;
  }

  getState(): CameraState {
    return { ...this.state };
  }

  subscribe(listener: (state: CameraState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Screen coordinates → graph coordinates. */
  toGraph(screenX: number, screenY: number): { x: number; y: number } {
    return { x: (screenX - this.state.x) / this.state.k, y: (screenY - this.state.y) / this.state.k };
  }

  private apply(): void {
    if (!this.target) return;
    const { x, y, k } = this.state;
    this.target.setAttribute('transform', `translate(${x.toFixed(3)},${y.toFixed(3)}) scale(${k.toFixed(5)})`);
    this.queueNotify();
  }

  /** Listeners are coalesced to one call per frame; they drive chrome, not nodes. */
  private queueNotify(): void {
    if (this.notifyQueued || this.listeners.size === 0) return;
    this.notifyQueued = true;
    requestAnimationFrame(() => {
      this.notifyQueued = false;
      const snapshot = this.getState();
      for (const listener of this.listeners) listener(snapshot);
    });
  }

  private set(next: CameraState): void {
    this.state = { x: next.x, y: next.y, k: clampScale(next.k) };
    this.apply();
  }

  stop(): void {
    this.animating = false;
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  panBy(dx: number, dy: number): void {
    this.stop();
    this.set({ x: this.state.x + dx, y: this.state.y + dy, k: this.state.k });
  }

  /** Zooms about a screen point, keeping the graph point under it fixed. */
  zoomBy(factor: number, screenX?: number, screenY?: number): void {
    this.stop();
    const ox = screenX ?? this.viewport.width / 2;
    const oy = screenY ?? this.viewport.height / 2;
    const nextK = clampScale(this.state.k * factor);
    if (nextK === this.state.k) return;
    const graph = this.toGraph(ox, oy);
    this.set({ x: ox - graph.x * nextK, y: oy - graph.y * nextK, k: nextK });
  }

  /**
   * Tweens to a target state. Under `prefers-reduced-motion` the tween is
   * skipped entirely rather than shortened — the movement itself is the problem,
   * not its duration (§30).
   */
  animateTo(target: CameraState, duration = DEFAULT_DURATION): void {
    const next = { ...target, k: clampScale(target.k) };
    if (duration <= 0 || prefersReducedMotion()) {
      this.stop();
      this.set(next);
      return;
    }

    this.stop();
    this.from = this.getState();
    this.to = next;
    this.animStart = performance.now();
    this.animDuration = duration;
    this.animating = true;

    const step = (now: number): void => {
      if (!this.animating) return;
      const t = Math.min(1, (now - this.animStart) / this.animDuration);
      const e = easeOutCubic(t);
      this.set({
        x: this.from.x + (this.to.x - this.from.x) * e,
        y: this.from.y + (this.to.y - this.from.y) * e,
        k: this.from.k + (this.to.k - this.from.k) * e,
      });
      if (t < 1) this.frame = requestAnimationFrame(step);
      else {
        this.animating = false;
        this.frame = null;
      }
    };

    this.frame = requestAnimationFrame(step);
  }

  /** Camera state that fits `bounds` in the current viewport with padding. */
  computeFit(bounds: Bounds, padding = 96): CameraState {
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);
    const availableW = Math.max(this.viewport.width - padding * 2, 1);
    const availableH = Math.max(this.viewport.height - padding * 2, 1);
    const k = clampScale(Math.min(availableW / width, availableH / height));
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return { x: this.viewport.width / 2 - cx * k, y: this.viewport.height / 2 - cy * k, k };
  }

  fit(bounds: Bounds, padding = 96, duration = DEFAULT_DURATION): void {
    this.animateTo(this.computeFit(bounds, padding), duration);
  }

  /** Centres a graph point, optionally changing scale. */
  focusOn(graphX: number, graphY: number, scale?: number, duration = DEFAULT_DURATION): void {
    const k = clampScale(scale ?? this.state.k);
    this.animateTo(
      { x: this.viewport.width / 2 - graphX * k, y: this.viewport.height / 2 - graphY * k, k },
      duration,
    );
  }

  /** Immediately adopts a state without animating. Used on first paint. */
  jumpTo(state: CameraState): void {
    this.stop();
    this.set(state);
  }

  destroy(): void {
    this.stop();
    this.listeners.clear();
    this.target = null;
  }
}

/* ---------------------------------------------------------------------------
   Input
   ------------------------------------------------------------------------ */

export interface InteractionHandlers {
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onWheel: (event: WheelEvent) => void;
  destroy: () => void;
}

/**
 * Distinguishes a mouse wheel from a trackpad two-finger scroll.
 *
 * A pinch gesture arrives as a wheel event with `ctrlKey` set — that is always a
 * zoom. Otherwise: a mouse wheel produces large, quantised vertical deltas with
 * no horizontal component, and should zoom; a trackpad produces small or
 * two-dimensional deltas, and should pan. This is the behaviour people expect
 * from a canvas, and it cannot be got from `d3-zoom` without fighting it.
 */
export function isZoomIntent(event: WheelEvent): boolean {
  if (event.ctrlKey || event.metaKey) return true;
  if (event.deltaX !== 0) return false;
  return Number.isInteger(event.deltaY) && Math.abs(event.deltaY) >= 40;
}

export interface BindOptions {
  /** Called when a drag actually moved, so a click handler can be suppressed. */
  onDragEnd?: (moved: boolean) => void;
  /** Pixels of movement before a pointer press counts as a drag, not a click. */
  dragThreshold?: number;
}

/**
 * Binds pan and zoom to an element. Returns a teardown function.
 *
 * Written by hand rather than using `d3-zoom`: we need the wheel heuristic
 * above, keyboard control, and an implementation that does not take ownership of
 * a DOM node React is rendering.
 */
export function bindCameraInteraction(
  element: HTMLElement | SVGElement,
  camera: CameraController,
  options: BindOptions = {},
): () => void {
  const threshold = options.dragThreshold ?? 4;
  let pointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let travelled = 0;

  const onPointerDown = (event: PointerEvent): void => {
    // Primary button only; let right-click through to the browser.
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    travelled = 0;
    element.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    travelled += Math.abs(dx) + Math.abs(dy);
    if (travelled < threshold) return;
    camera.panBy(dx, dy);
  };

  const endDrag = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    element.releasePointerCapture?.(event.pointerId);
    pointerId = null;
    options.onDragEnd?.(travelled >= threshold);
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isZoomIntent(event)) {
      // Normalise line-mode deltas so a wheel notch feels the same everywhere.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const delta = event.deltaY * unit;
      camera.zoomBy(Math.exp(-delta * 0.0016), x, y);
    } else {
      camera.panBy(-event.deltaX, -event.deltaY);
    }
  };

  element.addEventListener('pointerdown', onPointerDown as EventListener);
  element.addEventListener('pointermove', onPointerMove as EventListener);
  element.addEventListener('pointerup', endDrag as EventListener);
  element.addEventListener('pointercancel', endDrag as EventListener);
  element.addEventListener('wheel', onWheel as EventListener, { passive: false });

  return () => {
    element.removeEventListener('pointerdown', onPointerDown as EventListener);
    element.removeEventListener('pointermove', onPointerMove as EventListener);
    element.removeEventListener('pointerup', endDrag as EventListener);
    element.removeEventListener('pointercancel', endDrag as EventListener);
    element.removeEventListener('wheel', onWheel as EventListener);
  };
}
