'use client';

import { catalog } from '@/lib/catalog';
import type { SkillId } from '@/lib/schemas';
import { SkillFilePreview } from '@/components/skill-preview/SkillFilePreview';

/**
 * The agent's skills, each with its generated Markdown file (§13). A skill id
 * with no matching record is skipped rather than rendered as a broken row (§36).
 */
export function AgentSkills({ skillIds }: { skillIds: readonly SkillId[] }) {
  const skills = skillIds.map((id) => catalog.indexes.skillById.get(id)).filter((s) => s !== undefined);

  if (skills.length === 0) {
    return <p className="text-xs text-fg-muted">No skill files defined for this agent yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      {skills.map((skill, index) => (
        <SkillFilePreview key={skill.id} skill={skill} defaultOpen={index === 0 && skills.length === 1} />
      ))}
    </div>
  );
}
