import type { Agent } from '@/lib/schemas';
import { salesAgents } from './sales';
import { dealsAgents } from './deals';
import { marketingAgents } from './marketing';
import { operationsAgents } from './operations';
import { intelligenceAgents } from './intelligence';
import { customerAgents } from './customer';
import { backOfficeAgents } from './back-office';

/**
 * The full authored catalogue. Split per department so no single file grows
 * unmanageable; the loader neither knows nor cares how it is split.
 */
export const agents: Agent[] = [
  ...salesAgents,
  ...dealsAgents,
  ...marketingAgents,
  ...operationsAgents,
  ...intelligenceAgents,
  ...customerAgents,
  ...backOfficeAgents,
];
