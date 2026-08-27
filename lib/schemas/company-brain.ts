import { z } from 'zod';
import { bulletsSchema, idSchema, nonEmpty, slugSchema } from './common';

/**
 * Where a piece of company context came from. The MVP ships only `authored`
 * records, but every section already carries a source so that ingestion
 * (Drive, Notion, PDFs, CRM, transcripts…) is an additive change rather than a
 * schema migration (§14).
 */
export const knowledgeSourceKindSchema = z.enum([
  'authored',
  'document',
  'website',
  'drive',
  'notion',
  'crm',
  'transcript',
  'email',
  'chat',
]);
export type KnowledgeSourceKind = z.infer<typeof knowledgeSourceKindSchema>;

export const knowledgeSourceSchema = z.object({
  id: idSchema,
  kind: knowledgeSourceKindSchema,
  label: nonEmpty.max(120),
  /** Present once a connector actually syncs. Absent for authored context. */
  uri: z.string().max(500).optional(),
  /** ISO-8601. Absent means "never synced". */
  syncedAt: z.string().datetime().optional(),
  status: z.enum(['connected', 'available', 'planned']).default('planned'),
});
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;

export const brainSectionKindSchema = z.enum([
  'company',
  'products',
  'icp',
  'customers',
  'brand-voice',
  'positioning',
  'processes',
  'policies',
  'team',
  'tools',
  'knowledge',
  'documents',
  'examples',
]);
export type BrainSectionKind = z.infer<typeof brainSectionKindSchema>;

export const brainSectionSchema = z.object({
  id: idSchema,
  kind: brainSectionKindSchema,
  title: nonEmpty.max(80),
  summary: nonEmpty.max(600),
  items: bulletsSchema,
  sourceIds: z.array(idSchema).max(12).default([]),
  order: z.number().int().nonnegative(),
});
export type BrainSection = z.infer<typeof brainSectionSchema>;

/**
 * Node zero. Every agent reads context from here, which is why it is modelled as
 * a first-class record rather than a constant inside the graph component.
 */
export const companyBrainSchema = z.object({
  id: idSchema,
  name: nonEmpty.max(80),
  slug: slugSchema,
  tagline: nonEmpty.max(200),
  description: nonEmpty.max(800),
  sections: z.array(brainSectionSchema).max(24),
  sources: z.array(knowledgeSourceSchema).max(32),
});

export type CompanyBrain = z.infer<typeof companyBrainSchema>;
