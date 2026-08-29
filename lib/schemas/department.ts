import { z } from 'zod';
import { bulletsSchema, idSchema, nonEmpty, slugSchema } from './common';

/**
 * Accent is a *token name*, never a colour literal — themes resolve it to a CSS
 * variable so a department can be recoloured without touching components (§33).
 */
export const accentSchema = z.enum([
  'amber',
  'violet',
  'cyan',
  'emerald',
  'rose',
  'indigo',
  'slate',
]);
export type Accent = z.infer<typeof accentSchema>;

export const departmentSchema = z.object({
  id: idSchema,
  name: nonEmpty.max(60),
  slug: slugSchema,
  description: nonEmpty.max(400),
  /** One line on what the department is accountable for. Shown in the drawer. */
  mission: nonEmpty.max(240),
  accent: accentSchema,
  /** Lucide icon name, resolved through an allow-list at render time. */
  icon: nonEmpty.max(40),
  order: z.number().int().nonnegative(),
  /** Optional prose bullets describing the outcomes the department owns. */
  outcomes: bulletsSchema.optional(),
});

export type Department = z.infer<typeof departmentSchema>;
