'use client';

import { useMemo } from 'react';
import { parseMarkdown } from '@/lib/skills/render';

/**
 * Renders generated Markdown as React elements.
 *
 * Everything is rendered as text nodes — no `dangerouslySetInnerHTML` anywhere —
 * so a skill file can never inject markup, even if one day it comes from an
 * imported or user-authored source.
 */
export function MarkdownPreview({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  return (
    <div className="space-y-3 text-xs leading-relaxed">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'frontmatter':
            return (
              <dl
                key={index}
                className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded border border-line-subtle bg-bg-inset px-2.5 py-2 font-mono text-2xs"
              >
                {block.lines.map((line, i) => {
                  const separator = line.indexOf(':');
                  const key = separator === -1 ? line : line.slice(0, separator);
                  const value = separator === -1 ? '' : line.slice(separator + 1).trim();
                  return (
                    <div key={i} className="contents">
                      <dt className="text-fg-muted">{key}</dt>
                      <dd className="text-fg-secondary">{value}</dd>
                    </div>
                  );
                })}
              </dl>
            );

          case 'heading': {
            const size =
              block.level === 1 ? 'text-sm font-semibold text-fg' : 'text-xs font-semibold text-fg-secondary';
            return (
              <p key={index} className={`${size} ${block.level > 1 ? 'pt-1' : ''}`}>
                {block.text}
              </p>
            );
          }

          case 'paragraph':
            return (
              <p key={index} className="text-fg-secondary">
                {block.text}
              </p>
            );

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag
                key={index}
                className={`space-y-1 pl-4 text-fg-secondary ${block.ordered ? 'list-decimal' : 'list-disc'}`}
              >
                {block.items.map((item, i) => (
                  <li key={i} className="marker:text-fg-muted">
                    {item}
                  </li>
                ))}
              </ListTag>
            );
          }

          case 'code':
            return (
              <pre
                key={index}
                className="overflow-x-auto rounded border border-line-subtle bg-bg-inset p-2.5 font-mono text-2xs leading-relaxed text-fg-secondary"
              >
                <code>{block.lines.join('\n')}</code>
              </pre>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
