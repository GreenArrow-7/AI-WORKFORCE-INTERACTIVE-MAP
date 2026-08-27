import { z } from 'zod';
import { idSchema, nonEmpty, slugSchema } from './common';

/**
 * The middle tier of the hierarchy: a cluster of agents inside a department that
 * share a job to be done (e.g. Sales → Prospecting).
 */
export const functionGroupSchema = z.object({
  id: idSchema,
  departmentId: idSchema,
  name: nonEmpty.max(60),
  slug: slugSchema,
  description: nonEmpty.max(400),
  order: z.number().int().nonnegative(),
});

export type FunctionGroup = z.infer<typeof functionGroupSchema>;
