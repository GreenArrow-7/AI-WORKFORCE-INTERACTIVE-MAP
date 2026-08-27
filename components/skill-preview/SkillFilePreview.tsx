'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronRight, Copy, Download } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import type { Skill } from '@/lib/schemas';
import { renderSkillFile, skillFilename } from '@/lib/skills/render';
import { copyText, downloadText } from '@/lib/export/snapshot';
import { MarkdownPreview } from './MarkdownPreview';
import { cn } from '@/lib/utils/cn';

/**
 * One skill: collapsed to its name and description, expandable to the full
 * generated Markdown, with copy and download (§13). Files are produced in the
 * browser — no backend involved.
 */
export function SkillFilePreview({ skill, defaultOpen = false }: { skill: Skill; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const markdown = useMemo(() => renderSkillFile(skill, catalog), [skill]);

  const handleCopy = async (): Promise<void> => {
    const ok = await copyText(markdown);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded border border-line-subtle bg-surface">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronRight
            size={12}
            aria-hidden
            className={cn(
              'shrink-0 text-fg-muted transition-transform duration-[var(--dur-fast)]',
              open && 'rotate-90',
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-fg-secondary">{skill.name}</span>
            <span className="block truncate text-2xs text-fg-muted">{skill.description}</span>
          </span>
          <code className="shrink-0 font-mono text-2xs text-fg-muted">v{skill.version}</code>
        </button>

        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={`Copy the ${skill.name} skill file`}
          title="Copy skill file"
          className="shrink-0 rounded p-1 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          {copied ? <Check size={12} aria-hidden style={{ color: 'var(--positive)' }} /> : <Copy size={12} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => downloadText(skillFilename(skill), markdown, 'text/markdown')}
          aria-label={`Download ${skillFilename(skill)}`}
          title="Download .md"
          className="shrink-0 rounded p-1 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <Download size={12} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="border-t border-line-subtle px-2.5 py-2.5">
          <MarkdownPreview source={markdown} />
        </div>
      )}
    </div>
  );
}
