import { z } from 'zod';
import { idSchema } from './common';

/**
 * USER state. Deliberately a separate module from the catalogue schemas so that
 * confusing rollout progress with an agent's designed `autonomy` is a type
 * error rather than a convention (§11, §35). No canonical record ever carries a
 * `status`.
 */
export const agentStatusSchema = z.enum(['not_started', 'planned', 'building', 'live']);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const AGENT_STATUS_ORDER: readonly AgentStatus[] = [
  'not_started',
  'planned',
  'building',
  'live',
];

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  not_started: 'Not started',
  planned: 'Planned',
  building: 'Building',
  live: 'Live',
};

export const userAgentStateSchema = z.object({
  agentId: idSchema,
  status: agentStatusSchema,
  notes: z.string().max(2000).optional(),
  /** ISO-8601 timestamp of the last change. */
  updatedAt: z.string().datetime(),
});
export type UserAgentState = z.infer<typeof userAgentStateSchema>;

export const workspaceSchema = z.object({
  /** Free-text name for the org being mapped. Editable in the workspace menu. */
  name: z.string().max(120).default('My workspace'),
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
});
export type Workspace = z.infer<typeof workspaceSchema>;

/** Bumped whenever the persisted shape changes incompatibly. */
export const SNAPSHOT_VERSION = '1.0';

/**
 * The unit of persistence, export and import. Kept flat and version-stamped so a
 * file exported today can be recognised — or explicitly rejected — later.
 */
export const workspaceSnapshotSchema = z.object({
  version: z.string().min(1),
  workspace: workspaceSchema,
  agentStatuses: z.record(idSchema, userAgentStateSchema),
  updatedAt: z.string().datetime(),
});
export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>;

export function emptySnapshot(now: string): WorkspaceSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    workspace: { name: 'My workspace', theme: 'dark' },
    agentStatuses: {},
    updatedAt: now,
  };
}
