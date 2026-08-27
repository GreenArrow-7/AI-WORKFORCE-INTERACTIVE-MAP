import { describe, expect, it } from 'vitest';
import { catalog } from '@/lib/catalog';
import { parseMarkdown, renderSkillFile, skillFilename } from '@/lib/skills/render';

const skill = catalog.skills[0];

describe('renderSkillFile', () => {
  it('renders every authored skill without throwing', () => {
    for (const s of catalog.skills) {
      const md = renderSkillFile(s, catalog);
      expect(md.length).toBeGreaterThan(80);
    }
  });

  it('opens with front matter naming the skill, version and agent', () => {
    expect(skill).toBeDefined();
    if (!skill) return;
    const md = renderSkillFile(skill, catalog);
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain(`name: ${skill.slug}`);
    expect(md).toContain(`version: ${skill.version}`);
  });

  it('includes the instructions as a numbered list', () => {
    expect(skill).toBeDefined();
    if (!skill) return;
    const md = renderSkillFile(skill, catalog);
    expect(md).toContain('## Instructions');
    expect(md).toContain(`1. ${skill.instructions[0]}`);
  });

  it('resolves tool ids to names rather than printing the id', () => {
    const withTools = catalog.skills.find((s) => s.tools.length > 0);
    expect(withTools).toBeDefined();
    if (!withTools) return;
    const md = renderSkillFile(withTools, catalog);
    const toolName = catalog.indexes.toolById.get(withTools.tools[0] ?? '')?.name;
    expect(toolName).toBeDefined();
    if (toolName) expect(md).toContain(toolName);
    expect(md).not.toContain('tl-');
  });

  it('honours an explicit fileContent override', () => {
    expect(skill).toBeDefined();
    if (!skill) return;
    expect(renderSkillFile({ ...skill, fileContent: '# Hand written' }, catalog)).toBe('# Hand written');
  });

  it('names the file after the slug', () => {
    expect(skill).toBeDefined();
    if (!skill) return;
    expect(skillFilename(skill)).toBe(`${skill.slug}.md`);
  });
});

describe('parseMarkdown', () => {
  it('tokenises every generated skill file into renderable blocks', () => {
    for (const s of catalog.skills) {
      const blocks = parseMarkdown(renderSkillFile(s, catalog));
      expect(blocks.length).toBeGreaterThan(4);
      expect(blocks[0]?.kind).toBe('frontmatter');
      expect(blocks.some((b) => b.kind === 'heading')).toBe(true);
      expect(blocks.some((b) => b.kind === 'code')).toBe(true);
    }
  });

  it('keeps fenced code verbatim, including blank lines', () => {
    const blocks = parseMarkdown('```text\nline one\n\nline three\n```');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ kind: 'code', language: 'text', lines: ['line one', '', 'line three'] });
  });

  it('distinguishes ordered from unordered lists', () => {
    expect(parseMarkdown('- a\n- b')[0]).toEqual({ kind: 'list', ordered: false, items: ['a', 'b'] });
    expect(parseMarkdown('1. a\n2. b')[0]).toEqual({ kind: 'list', ordered: true, items: ['a', 'b'] });
  });

  it('reads heading levels', () => {
    expect(parseMarkdown('# One')[0]).toEqual({ kind: 'heading', level: 1, text: 'One' });
    expect(parseMarkdown('## Two')[0]).toEqual({ kind: 'heading', level: 2, text: 'Two' });
  });

  it('only treats front matter as front matter when it opens the document', () => {
    expect(parseMarkdown('# Title\n\n---\nnot: frontmatter\n---')[0]?.kind).toBe('heading');
  });

  it('handles empty and whitespace input', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('\n\n  \n')).toEqual([]);
  });

  it('produces no raw HTML block type, so nothing can be injected', () => {
    const blocks = parseMarkdown('<script>alert(1)</script>\n\n<img onerror=x>');
    // Angle brackets survive as text in a paragraph; there is no html block kind.
    expect(blocks.every((b) => b.kind !== ('html' as never))).toBe(true);
    expect(blocks[0]?.kind).toBe('paragraph');
  });

  it('never loses an unterminated code fence', () => {
    const blocks = parseMarkdown('```text\nunterminated');
    expect(blocks[0]).toEqual({ kind: 'code', language: 'text', lines: ['unterminated'] });
  });
});
