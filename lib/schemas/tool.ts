import { z } from 'zod';
import { idSchema, nonEmpty } from './common';

export const toolCategorySchema = z.enum([
  'crm',
  'communication',
  'documents',
  'data',
  'marketing',
  'finance',
  'support',
  'engineering',
  'analytics',
]);
export type ToolCategory = z.infer<typeof toolCategorySchema>;

/**
 * Tools are a closed registry rather than free strings so that the tool filter
 * and the badge rendering share one vocabulary and cannot drift.
 */
export const toolSchema = z.object({
  id: idSchema,
  name: nonEmpty.max(48),
  category: toolCategorySchema,
});

export type Tool = z.infer<typeof toolSchema>;
