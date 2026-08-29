'use client';

import {
  Boxes,
  Brain,
  Building2,
  Handshake,
  LayoutDashboard,
  Megaphone,
  PenTool,
  Radar,
  Receipt,
  Send,
  Target,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { isAllowedIcon } from '@/lib/ui/tokens';

/**
 * Resolves an icon name held in data to a component.
 *
 * Goes through an allow-list rather than a dynamic lookup so that a typo in a
 * seed file renders a sensible fallback instead of crashing the graph (§36).
 */
const REGISTRY: Record<string, LucideIcon> = {
  Target,
  Handshake,
  Megaphone,
  Workflow,
  Radar,
  Users,
  Building2,
  TrendingUp,
  Send,
  PenTool,
  Receipt,
  LayoutDashboard,
  Brain,
  Boxes,
};

export function resolveIcon(name: string): LucideIcon {
  return (isAllowedIcon(name) ? REGISTRY[name] : undefined) ?? Boxes;
}
