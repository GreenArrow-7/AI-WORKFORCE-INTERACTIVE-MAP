import type { FunctionGroup } from '@/lib/schemas';

/** Three functions per department. Order drives angular placement in the tree. */
export const functionGroups: FunctionGroup[] = [
  // Sales
  { id: 'fn-prospecting', departmentId: 'dep-sales', name: 'Prospecting', slug: 'prospecting', order: 0, description: 'Builds and maintains the list of accounts and people worth approaching.' },
  { id: 'fn-account-research', departmentId: 'dep-sales', name: 'Research', slug: 'research', order: 1, description: 'Turns a name on a list into a account you actually understand.' },
  { id: 'fn-outreach', departmentId: 'dep-sales', name: 'Outreach', slug: 'outreach', order: 2, description: 'Writes, sequences and follows up on first-touch conversations.' },

  // Deals
  { id: 'fn-qualification', departmentId: 'dep-deals', name: 'Qualification', slug: 'qualification', order: 0, description: 'Decides which opportunities deserve the team’s time, and why.' },
  { id: 'fn-proposals', departmentId: 'dep-deals', name: 'Proposals', slug: 'proposals', order: 1, description: 'Assembles quotes, proposals and the supporting material around them.' },
  { id: 'fn-deal-desk', departmentId: 'dep-deals', name: 'Deal Desk', slug: 'deal-desk', order: 2, description: 'Pricing checks, approvals, redlines and getting to signature.' },

  // Marketing
  { id: 'fn-content', departmentId: 'dep-marketing', name: 'Content', slug: 'content', order: 0, description: 'Produces and repurposes published material on a reliable cadence.' },
  { id: 'fn-demand', departmentId: 'dep-marketing', name: 'Demand', slug: 'demand', order: 1, description: 'Runs campaigns and reports honestly on what they produced.' },
  { id: 'fn-lifecycle', departmentId: 'dep-marketing', name: 'Lifecycle', slug: 'lifecycle', order: 2, description: 'Nurture, segmentation and the messages that follow a signal.' },

  // Operations
  { id: 'fn-process', departmentId: 'dep-operations', name: 'Process', slug: 'process', order: 0, description: 'Documents how work is actually done and keeps that current.' },
  { id: 'fn-delivery', departmentId: 'dep-operations', name: 'Delivery', slug: 'delivery', order: 1, description: 'Tracks commitments, schedules and the risk of missing them.' },
  { id: 'fn-supply', departmentId: 'dep-operations', name: 'Supply', slug: 'supply', order: 2, description: 'Vendors, purchase orders and the admin that surrounds them.' },

  // Intelligence
  { id: 'fn-market', departmentId: 'dep-intelligence', name: 'Market', slug: 'market', order: 0, description: 'Watches the category, the buyers and where the money is moving.' },
  { id: 'fn-competitive', departmentId: 'dep-intelligence', name: 'Competitive', slug: 'competitive', order: 1, description: 'Tracks competitor moves and keeps the battlecards honest.' },
  { id: 'fn-analytics', departmentId: 'dep-intelligence', name: 'Analytics', slug: 'analytics', order: 2, description: 'Explains the company’s own numbers, not just charts them.' },

  // Customer
  { id: 'fn-onboarding', departmentId: 'dep-customer', name: 'Onboarding', slug: 'onboarding', order: 0, description: 'Gets a new account from signature to first real value.' },
  { id: 'fn-support', departmentId: 'dep-customer', name: 'Support', slug: 'support', order: 1, description: 'Answers, triages and resolves day-to-day customer questions.' },
  { id: 'fn-retention', departmentId: 'dep-customer', name: 'Retention', slug: 'retention', order: 2, description: 'Spots renewal risk early and prepares the conversation.' },

  // Back Office
  { id: 'fn-finance', departmentId: 'dep-back-office', name: 'Finance', slug: 'finance', order: 0, description: 'Invoices, reconciliation, expenses and the month-end close.' },
  { id: 'fn-people', departmentId: 'dep-back-office', name: 'People', slug: 'people', order: 1, description: 'Hiring admin, onboarding paperwork and internal answers.' },
  { id: 'fn-compliance', departmentId: 'dep-back-office', name: 'Compliance', slug: 'compliance', order: 2, description: 'Policy, evidence collection and keeping audits uneventful.' },
];
