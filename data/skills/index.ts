import type { Skill } from '@/lib/schemas';
import { salesSkills } from './sales';
import { dealsSkills } from './deals';
import { marketingSkills } from './marketing';
import { operationsSkills } from './operations';
import { intelligenceSkills } from './intelligence';
import { customerSkills } from './customer';
import { backOfficeSkills } from './back-office';

/**
 * Skill files carry no `fileContent`: the Markdown shown in the drawer is
 * rendered from these structured fields by `lib/skills/render.ts`. Authoring
 * both would guarantee they drift.
 */
export const skills: Skill[] = [
  ...salesSkills,
  ...dealsSkills,
  ...marketingSkills,
  ...operationsSkills,
  ...intelligenceSkills,
  ...customerSkills,
  ...backOfficeSkills,
];
