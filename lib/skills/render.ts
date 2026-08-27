import type { Catalog } from '@/lib/catalog';
import type { Skill } from '@/lib/schemas';

/**
 * Renders a skill as the Markdown file an implementer would actually check into
 * a repository.
 *
 * Generated rather than authored: `Skill.fileContent` exists as an override, but
 * leaving it unset means the file can never drift from the structured record it
 * describes (§13).
 */
export function renderSkillFile(skill: Skill, catalog: Catalog): string {
  if (skill.fileContent) return skill.fileContent;

  const agent = catalog.indexes.agentById.get(skill.agentId);
  const toolNames = skill.tools
    .map((id) => catalog.indexes.toolById.get(id)?.name)
    .filter((name): name is string => Boolean(name));

  const lines: string[] = [];

  lines.push('---');
  lines.push(`name: ${skill.slug}`);
  lines.push(`version: ${skill.version}`);
  if (agent) lines.push(`agent: ${agent.slug}`);
  if (toolNames.length > 0) lines.push(`tools: [${toolNames.join(', ')}]`);
  lines.push('---');
  lines.push('');

  lines.push(`# ${skill.name}`);
  lines.push('');
  lines.push(skill.description);
  lines.push('');

  lines.push('## Instructions');
  lines.push('');
  skill.instructions.forEach((instruction, index) => {
    lines.push(`${index + 1}. ${instruction}`);
  });
  lines.push('');

  if (skill.inputs.length > 0) {
    lines.push('## Inputs');
    lines.push('');
    for (const input of skill.inputs) lines.push(`- ${input}`);
    lines.push('');
  }

  if (skill.outputs.length > 0) {
    lines.push('## Outputs');
    lines.push('');
    for (const output of skill.outputs) lines.push(`- ${output}`);
    lines.push('');
  }

  if (toolNames.length > 0) {
    lines.push('## Tools');
    lines.push('');
    for (const tool of toolNames) lines.push(`- ${tool}`);
    lines.push('');
  }

  lines.push('## Example');
  lines.push('');
  lines.push('**Prompt**');
  lines.push('');
  lines.push('```text');
  lines.push(skill.examplePrompt);
  lines.push('```');
  lines.push('');
  lines.push('**Output**');
  lines.push('');
  lines.push('```text');
  lines.push(skill.exampleOutput);
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

export function skillFilename(skill: Skill): string {
  return `${skill.slug}.md`;
}

/* ---------------------------------------------------------------------------
   Minimal Markdown tokeniser for the preview
   ------------------------------------------------------------------------ */

export type MarkdownBlock =
  | { kind: 'frontmatter'; lines: string[] }
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string; lines: string[] };

/**
 * Tokenises exactly the subset of Markdown `renderSkillFile` emits.
 *
 * A full Markdown renderer would be a dependency and an XSS surface for the sake
 * of five block types we generate ourselves. This produces structured blocks
 * that React renders as elements, so no HTML is ever injected (§13, §36).
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  // Front matter, only when it opens the document.
  if (lines[0]?.trim() === '---') {
    const collected: string[] = [];
    index = 1;
    while (index < lines.length && lines[index]?.trim() !== '---') {
      collected.push(lines[index] ?? '');
      index += 1;
    }
    index += 1;
    blocks.push({ kind: 'frontmatter', lines: collected });
  }

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (trimmed === '') {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const collected: string[] = [];
      index += 1;
      while (index < lines.length && (lines[index] ?? '').trim() !== '```') {
        collected.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      blocks.push({ kind: 'code', language, lines: collected });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      blocks.push({ kind: 'heading', level: (level === 1 ? 1 : level === 2 ? 2 : 3), text: heading[2] ?? '' });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = (lines[index] ?? '').trim();
        const isItem = ordered ? /^\d+\.\s+/.test(candidate) : /^[-*]\s+/.test(candidate);
        if (!isItem) break;
        items.push(candidate.replace(/^([-*]|\d+\.)\s+/, ''));
        index += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index] ?? '';
      if (candidate.trim() === '' || candidate.trim().startsWith('```') || /^#{1,3}\s/.test(candidate.trim())) break;
      paragraph.push(candidate.trim());
      index += 1;
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}
