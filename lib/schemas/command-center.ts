import { z } from 'zod';
import { idSchema, nonEmpty, slugSchema } from './common';

export const metricFormatSchema = z.enum(['currency', 'number', 'percent', 'duration']);
export type MetricFormat = z.infer<typeof metricFormatSchema>;

export const metricSchema = z.object({
  id: idSchema,
  label: nonEmpty.max(60),
  value: z.number(),
  format: metricFormatSchema,
  /** Period-over-period change, as a ratio (0.12 = +12%). */
  delta: z.number().optional(),
  /** Whether a rising value is good; drives the up/down affordance. */
  higherIsBetter: z.boolean().default(true),
  /** Sparkline series, oldest first. */
  series: z.array(z.number()).max(60).optional(),
});
export type Metric = z.infer<typeof metricSchema>;

export const widgetKindSchema = z.enum([
  'metric-row',
  'agent-activity',
  'approval-queue',
  'risk-alerts',
  'recent-actions',
  'breakdown-bars',
  'trend-chart',
]);
export type WidgetKind = z.infer<typeof widgetKindSchema>;

/**
 * Widgets are declared, not hard-coded: a dashboard is a list of widget records
 * and the renderer maps `kind` to a component. Adding a dashboard is data.
 */
export const widgetSchema = z.object({
  id: idSchema,
  kind: widgetKindSchema,
  title: nonEmpty.max(60),
  /** Grid span out of 12 columns at desktop width. */
  span: z.number().int().min(3).max(12).default(6),
});
export type Widget = z.infer<typeof widgetSchema>;

export const commandCenterSchema = z.object({
  id: idSchema,
  name: nonEmpty.max(60),
  slug: slugSchema,
  description: nonEmpty.max(400),
  icon: nonEmpty.max(40),
  departmentIds: z.array(idSchema).max(12),
  metrics: z.array(metricSchema).max(12),
  widgets: z.array(widgetSchema).max(12),
  order: z.number().int().nonnegative(),
});

export type CommandCenter = z.infer<typeof commandCenterSchema>;
