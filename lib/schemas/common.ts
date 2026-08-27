import { z } from 'zod';

/**
 * Identifiers are plain strings by design: they are authored by hand in `data/`
 * and appear in URLs and exported JSON. The value of branding them does not
 * outweigh the friction it adds to every seed record.
 */
export type DepartmentId = string;
export type FunctionId = string;
export type AgentId = string;
export type SkillId = string;
export type ToolId = string;
export type CommandCenterId = string;

/** Non-empty trimmed prose. */
export const nonEmpty = z.string().trim().min(1);

/** URL-safe identifier: lowercase words joined by single hyphens. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase hyphenated slug');

export const idSchema = nonEmpty.max(80);

/** A short list of prose bullets, as used by inputs/outputs/replaces/buildNotes. */
export const bulletsSchema = z.array(nonEmpty).max(24);

/**
 * How much of the work the agent is trusted to do on its own. This is a property
 * of the agent as designed — it is NOT the user's rollout progress. See
 * `lib/schemas/user-state.ts` for that, which is deliberately a different module.
 */
export const autonomySchema = z.enum(['human-led', 'assisted', 'autonomous']);
export type Autonomy = z.infer<typeof autonomySchema>;

/** How proven the pattern is in the wider market. Informs sequencing, not status. */
export const maturitySchema = z.enum(['concept', 'emerging', 'proven']);
export type Maturity = z.infer<typeof maturitySchema>;

export const AUTONOMY_ORDER: readonly Autonomy[] = ['human-led', 'assisted', 'autonomous'];

export const AUTONOMY_LABEL: Record<Autonomy, string> = {
  'human-led': 'Human-led',
  assisted: 'Human-assisted',
  autonomous: 'Fully autonomous',
};

export const MATURITY_LABEL: Record<Maturity, string> = {
  concept: 'Concept',
  emerging: 'Emerging',
  proven: 'Proven',
};
