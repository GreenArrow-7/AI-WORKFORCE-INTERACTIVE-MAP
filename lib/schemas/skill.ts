import { z } from 'zod';
import { bulletsSchema, idSchema, nonEmpty, slugSchema } from './common';

/**
 * A single capability an agent needs. The Markdown file shown in the drawer is
 * *generated* from these structured fields (see `lib/skills/render.ts`) unless
 * `fileContent` explicitly overrides it — authoring the same skill twice would
 * guarantee the two copies drift.
 *
 * Linkage note: an agent's skills come from `Agent.skills`, NOT from this
 * `agentId`. `agentId` records the agent the skill was authored for; a skill may
 * be referenced by several agents (voice conformance, for example, is shared by
 * every writing agent) and duplicating it per agent would be duplicated data.
 */
export const skillSchema = z.object({
  id: idSchema,
  /** The agent this skill was authored for. See the linkage note above. */
  agentId: idSchema,
  name: nonEmpty.max(70),
  slug: slugSchema,
  description: nonEmpty.max(400),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'must be semver, e.g. 1.0.0'),

  /** Ordered instruction steps that become the body of the skill file. */
  instructions: z.array(nonEmpty).min(1).max(24),
  inputs: bulletsSchema,
  outputs: bulletsSchema,
  tools: z.array(idSchema).max(12),

  examplePrompt: nonEmpty.max(1200),
  exampleOutput: nonEmpty.max(2000),

  /** Escape hatch for hand-authored Markdown. Omit to have it generated. */
  fileContent: z.string().optional(),
});

export type Skill = z.infer<typeof skillSchema>;
