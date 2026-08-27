import type { Department } from '@/lib/schemas';

/**
 * Placeholder org shape. Names, missions and accents are all data — swapping in
 * a real company's departments is an edit to this file and nothing else.
 */
export const departments: Department[] = [
  {
    id: 'dep-sales',
    name: 'Sales',
    slug: 'sales',
    description:
      'Finds and warms the accounts worth talking to, then keeps the top of the funnel full without burning the team on manual list building.',
    mission: 'Put qualified, well-researched conversations in front of sellers every week.',
    accent: 'amber',
    icon: 'Target',
    order: 0,
    outcomes: [
      'Consistent qualified pipeline coverage',
      'Research depth per account without research hours',
      'Outreach that references something real',
    ],
  },
  {
    id: 'dep-deals',
    name: 'Deals',
    slug: 'deals',
    description:
      'Everything between a first meeting and a signature: qualification rigour, proposal assembly, pricing sanity and the paperwork that follows.',
    mission: 'Move qualified opportunities to signature faster, with fewer avoidable losses.',
    accent: 'violet',
    icon: 'Handshake',
    order: 1,
    outcomes: [
      'Shorter cycle from first meeting to signature',
      'Proposals assembled in minutes, not days',
      'Fewer deals lost to silence',
    ],
  },
  {
    id: 'dep-marketing',
    name: 'Marketing',
    slug: 'marketing',
    description:
      'Turns company knowledge into a steady stream of published, on-brand material and keeps demand programmes measurable.',
    mission: 'Publish more of the right things, on brand, without a bigger content team.',
    accent: 'rose',
    icon: 'Megaphone',
    order: 2,
    outcomes: [
      'A publishing cadence that survives busy quarters',
      'Campaign reporting that arrives on time',
      'Consistent voice across every channel',
    ],
  },
  {
    id: 'dep-operations',
    name: 'Operations',
    slug: 'operations',
    description:
      'The internal machinery: process documentation, delivery tracking, supplier admin and the quiet work that keeps commitments met.',
    mission: 'Keep delivery predictable and take the manual coordination out of it.',
    accent: 'cyan',
    icon: 'Workflow',
    order: 3,
    outcomes: [
      'Fewer missed commitments',
      'Process knowledge that stays current',
      'Supplier admin that runs itself',
    ],
  },
  {
    id: 'dep-intelligence',
    name: 'Intelligence',
    slug: 'intelligence',
    description:
      'Watches the market, the competition and your own numbers, and tells the business what changed and what it means.',
    mission: 'Make sure nobody learns about an important change from a customer first.',
    accent: 'indigo',
    icon: 'Radar',
    order: 4,
    outcomes: [
      'Early warning on competitive and market moves',
      'Metrics explained, not just reported',
      'Decisions backed by current evidence',
    ],
  },
  {
    id: 'dep-customer',
    name: 'Customer',
    slug: 'customer',
    description:
      'Onboarding, day-to-day support and the renewal conversation — the whole life of an account after the deal closes.',
    mission: 'Get customers to value quickly and keep them there.',
    accent: 'emerald',
    icon: 'Users',
    order: 5,
    outcomes: [
      'Faster time to first value',
      'Support that resolves rather than routes',
      'Renewal risk seen early enough to act',
    ],
  },
  {
    id: 'dep-back-office',
    name: 'Back Office',
    slug: 'back-office',
    description:
      'Finance, people operations and compliance: high-volume, rule-bound work where accuracy matters more than creativity.',
    mission: 'Close the books, hire cleanly and stay compliant with less manual handling.',
    accent: 'slate',
    icon: 'Building2',
    order: 6,
    outcomes: [
      'A faster, calmer month-end close',
      'Hiring admin that does not fall on managers',
      'Compliance evidence collected as you go',
    ],
  },
];
