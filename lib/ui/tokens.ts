import type { Accent, AgentStatus, Autonomy } from '@/lib/schemas';

/**
 * The one place a token name becomes a CSS variable. Components ask for
 * `accentVar(department.accent)` and never learn what colour that is (§33).
 */
export function accentVar(accent: Accent | null | undefined): string {
  return accent ? `var(--accent-${accent})` : 'var(--text-secondary)';
}

export function statusVar(status: AgentStatus): string {
  return `var(--status-${status.replace('_', '-')})`;
}

/**
 * Autonomy encoded without relying on colour (§10, §28).
 *
 * `fill` and `dash` carry the meaning on the graph — human-led is hollow and
 * dashed, assisted is hollow and solid, autonomous is filled — and `glyph` gives
 * a third, non-visual channel for screen readers and dense list views.
 */
export interface AutonomyStyle {
  /** 0–1 opacity of the node's fill. */
  fill: number;
  /** SVG stroke-dasharray, or null for a solid stroke. */
  dash: string | null;
  strokeWidth: number;
  glyph: string;
  label: string;
}

export const AUTONOMY_STYLE: Record<Autonomy, AutonomyStyle> = {
  'human-led': { fill: 0, dash: '2 3', strokeWidth: 1.25, glyph: '○', label: 'Human-led' },
  assisted: { fill: 0.18, dash: null, strokeWidth: 1.75, glyph: '◐', label: 'Human-assisted' },
  autonomous: { fill: 1, dash: null, strokeWidth: 1.5, glyph: '●', label: 'Fully autonomous' },
};

/**
 * Status encoded without relying on colour. `ring` is the fraction of the
 * progress ring drawn, so status is legible from shape alone.
 */
export interface StatusStyle {
  ring: number;
  glyph: string;
  label: string;
  dashed: boolean;
}

export const STATUS_STYLE: Record<AgentStatus, StatusStyle> = {
  not_started: { ring: 0, glyph: '·', label: 'Not started', dashed: false },
  planned: { ring: 0.25, glyph: '◔', label: 'Planned', dashed: true },
  building: { ring: 0.6, glyph: '◕', label: 'Building', dashed: false },
  live: { ring: 1, glyph: '✓', label: 'Live', dashed: false },
};

/** Lucide icon names allowed in data, so a bad icon name cannot crash a render. */
export const ALLOWED_ICONS = [
  'Target',
  'Handshake',
  'Megaphone',
  'Workflow',
  'Radar',
  'Users',
  'Building2',
  'TrendingUp',
  'Send',
  'PenTool',
  'Receipt',
  'LayoutDashboard',
  'Brain',
  'Boxes',
] as const;

export type AllowedIcon = (typeof ALLOWED_ICONS)[number];

export function isAllowedIcon(name: string): name is AllowedIcon {
  return (ALLOWED_ICONS as readonly string[]).includes(name);
}

/** Formats a 0–1 ratio as a whole percentage. */
export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
