import { describe, expect, it } from 'vitest';
import { catalog } from '@/lib/catalog';
import { buildSummary, parseSnapshot, serialiseSnapshot, snapshotFilename } from '@/lib/export/snapshot';
import { emptySnapshot, type WorkspaceSnapshot } from '@/lib/schemas';

const NOW = '2026-01-15T09:30:00.000Z';

function snapshot(statuses: Record<string, string> = {}): WorkspaceSnapshot {
  return {
    version: '1.0',
    workspace: { name: 'Meridian', theme: 'dark' },
    agentStatuses: Object.fromEntries(
      Object.entries(statuses).map(([id, status]) => [id, { agentId: id, status, updatedAt: NOW }]),
    ),
    updatedAt: NOW,
  } as WorkspaceSnapshot;
}

describe('parseSnapshot', () => {
  it('accepts a snapshot it produced itself', () => {
    const result = parseSnapshot(serialiseSnapshot(snapshot({ 'agt-lead-sourcing': 'live' })));
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.snapshot.agentStatuses)).toEqual(['agt-lead-sourcing']);
  });

  it('accepts an empty snapshot', () => {
    expect(parseSnapshot(serialiseSnapshot(emptySnapshot(NOW))).ok).toBe(true);
  });

  it('rejects text that is not JSON', () => {
    const result = parseSnapshot('not json at all');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid JSON/i);
  });

  it('rejects JSON of the wrong shape', () => {
    const result = parseSnapshot('{"hello":"world"}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not a valid workforce export/i);
  });

  it('rejects an unknown status value rather than storing it', () => {
    const result = parseSnapshot(serialiseSnapshot(snapshot({ 'agt-lead-sourcing': 'deployed-ish' })));
    expect(result.ok).toBe(false);
  });

  it('rejects a future major version', () => {
    const result = parseSnapshot(JSON.stringify({ ...snapshot(), version: '2.0' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not supported/i);
  });

  it('rejects an array at the root', () => {
    expect(parseSnapshot('[]').ok).toBe(false);
  });

  it('never throws, whatever it is given', () => {
    for (const input of ['', 'null', 'undefined', '{', '0', '"x"', '{"agentStatuses":null}']) {
      expect(() => parseSnapshot(input)).not.toThrow();
    }
  });
});

describe('snapshotFilename', () => {
  it('builds a safe, dated filename from the workspace name', () => {
    expect(snapshotFilename(snapshot())).toBe('meridian-ai-workforce-2026-01-15.json');
  });

  it('falls back when the name has no usable characters', () => {
    const s = snapshot();
    s.workspace.name = '///';
    expect(snapshotFilename(s)).toBe('workspace-ai-workforce-2026-01-15.json');
  });
});

describe('buildSummary', () => {
  it('reports the totals for an untouched workspace', () => {
    const summary = buildSummary(catalog, {});
    expect(summary).toContain('AI WORKFORCE STATUS');
    expect(summary).toContain(`${catalog.agents.length} total agents`);
    expect(summary).toContain('0 live');
    expect(summary).toContain(`${catalog.agents.length} not started`);
  });

  it('lists every department with a live count', () => {
    const summary = buildSummary(catalog, {});
    for (const department of catalog.departments) {
      expect(summary).toContain(department.name);
    }
    expect(summary).toMatch(/0\/9 live/);
  });

  it('reflects live agents and recommends what to build next', () => {
    const summary = buildSummary(catalog, {
      'agt-lead-sourcing': { agentId: 'agt-lead-sourcing', status: 'live', updatedAt: NOW },
    });
    expect(summary).toContain('1 live');
    expect(summary).toContain('Recommended next deployments:');
    // Lead Sourcing is live, so it must not be recommended again.
    expect(summary).not.toMatch(/\d\. Lead Sourcing Agent/);
  });
});
