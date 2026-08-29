import {
  agents,
  commandCenters,
  companyBrain,
  departments,
  functionGroups,
  skills,
  tools,
} from '@/data';
import { loadCatalog } from './load';
import type { Catalog } from './types';

/**
 * The canonical catalogue: validated once, indexed once, immutable thereafter.
 * Never carries user state — rollout status lives in the Zustand store (§35).
 */
export const catalog: Catalog = loadCatalog({
  departments,
  functionGroups,
  agents,
  skills,
  tools,
  commandCenters,
  companyBrain,
});

export { loadCatalog };
export type * from './types';
