import { z } from 'zod';
import {
  autonomySchema,
  bulletsSchema,
  idSchema,
  maturitySchema,
  nonEmpty,
  slugSchema,
} from './common';

/**
 * The brief asks three distinct questions about human involvement (who stays
 * involved / when approval is needed / what stays human-owned). Three fields
 * answer them, which keeps the block renderable and filterable instead of
 * collapsing into one paragraph of prose.
 */
export const humanInLoopSchema = z.object({
  owner: nonEmpty.max(120),
  approvalPoints: bulletsSchema,
  retainedByHumans: bulletsSchema,
});
export type HumanInLoop = z.infer<typeof humanInLoopSchema>;

/**
 * The manual → assisted → autonomous story for a single agent. Rendered by the
 * rollout view (§21); it is data, so it lives on the record rather than being
 * inferred from `autonomy`.
 */
export const evolutionSchema = z.object({
  manual: nonEmpty.max(240),
  assisted: nonEmpty.max(240),
  autonomous: nonEmpty.max(240),
});
export type Evolution = z.infer<typeof evolutionSchema>;

export const agentSchema = z.object({
  id: idSchema,
  departmentId: idSchema,
  functionId: idSchema,
  name: nonEmpty.max(70),
  slug: slugSchema,

  /** One line for tooltips, search results and rollout rows. */
  shortDescription: nonEmpty.max(200),
  /** The "what it does" body of the drawer. */
  description: nonEmpty.max(1200),
  /** The "business outcome" section: the result, not the activity. */
  businessOutcome: nonEmpty.max(400),

  autonomy: autonomySchema,
  maturity: maturitySchema,

  /** Upstream agents that must exist first. Validated for cycles at load time. */
  dependencies: z.array(idSchema).max(12),
  skills: z.array(idSchema).max(12),
  tools: z.array(idSchema).max(12),

  inputs: bulletsSchema,
  outputs: bulletsSchema,
  replaces: bulletsSchema,

  humanInLoop: humanInLoopSchema,
  buildNotes: bulletsSchema,
  evolution: evolutionSchema,

  /**
   * Author's suggested build order within the department. Lower builds earlier.
   * Combined with dependency depth to answer "what should I implement first?".
   */
  recommendedOrder: z.number().int().nonnegative(),
});

export type Agent = z.infer<typeof agentSchema>;
