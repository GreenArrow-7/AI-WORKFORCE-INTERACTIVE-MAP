'use client';

import { catalog } from '@/lib/catalog';
import type { KnowledgeSource } from '@/lib/schemas';
import { Drawer, DrawerList, DrawerSection } from '@/components/shared/Drawer';
import { Badge } from '@/components/shared/Badge';

const SOURCE_STATUS_TONE: Record<KnowledgeSource['status'], string> = {
  connected: 'var(--positive)',
  available: 'var(--caution)',
  planned: 'var(--text-muted)',
};

const SOURCE_STATUS_LABEL: Record<KnowledgeSource['status'], string> = {
  connected: 'Connected',
  available: 'Available',
  planned: 'Planned',
};

/**
 * Node zero's own detail experience (§14).
 *
 * Sections and sources are data, so connecting a real ingestion path later means
 * adding sources — not rewriting this component.
 */
export function BrainDrawer({ onClose }: { onClose: () => void }) {
  const brain = catalog.companyBrain;
  const open = Boolean(brain);

  const sourceById = new Map((brain?.sources ?? []).map((source) => [source.id, source]));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Company Brain"
      header={
        brain ? (
          <div>
            <p className="text-2xs text-fg-muted">Node zero</p>
            <h2 className="mt-1 text-sm font-semibold text-fg">{brain.name}</h2>
            <p className="mt-1 text-2xs text-fg-muted">{brain.tagline}</p>
          </div>
        ) : null
      }
    >
      {brain && (
        <div className="space-y-3.5">
          <DrawerSection title="What this is">
            <p className="text-xs leading-relaxed text-fg-secondary">{brain.description}</p>
          </DrawerSection>

          {brain.sections.map((section) => (
            <DrawerSection key={section.id} title={section.title}>
              <p className="mb-1.5 text-xs text-fg-secondary">{section.summary}</p>
              <DrawerList items={section.items} />
              {section.sourceIds.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1">
                  {section.sourceIds.map((id) => {
                    const source = sourceById.get(id);
                    if (!source) return null;
                    return (
                      <li key={id}>
                        <Badge tone={SOURCE_STATUS_TONE[source.status]} title={SOURCE_STATUS_LABEL[source.status]}>
                          {source.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DrawerSection>
          ))}

          <DrawerSection title="Knowledge sources">
            <p className="mb-2 text-xs text-fg-secondary">
              Context is authored today. Each connector below is modelled already, so ingestion is an added source
              rather than a schema change.
            </p>
            <ul className="space-y-1">
              {brain.sources.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center gap-2 rounded border border-line-subtle px-2 py-1.5"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: SOURCE_STATUS_TONE[source.status] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-fg-secondary">{source.label}</span>
                  <span className="shrink-0 text-2xs text-fg-muted">{SOURCE_STATUS_LABEL[source.status]}</span>
                </li>
              ))}
            </ul>
          </DrawerSection>
        </div>
      )}
    </Drawer>
  );
}
