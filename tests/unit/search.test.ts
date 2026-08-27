import { describe, expect, it } from 'vitest';
import { catalog } from '@/lib/catalog';
import { buildSearchIndex, searchCatalog } from '@/lib/search';
import { fuzzyMatch, fuzzyMatchTokens } from '@/lib/search/fuzzy';

const index = buildSearchIndex(catalog);

describe('fuzzyMatch', () => {
  it('matches a subsequence', () => {
    expect(fuzzyMatch('otw', 'outreach writer')).not.toBeNull();
  });

  it('rejects characters that are not present in order', () => {
    expect(fuzzyMatch('zzz', 'outreach writer')).toBeNull();
    expect(fuzzyMatch('rw o', 'outreach writer')).toBeNull();
  });

  it('scores a word-start match above a mid-word one', () => {
    const wordStart = fuzzyMatch('ow', 'outreach writer');
    const midWord = fuzzyMatch('ow', 'follow account');
    expect(wordStart?.score ?? -Infinity).toBeGreaterThan(midWord?.score ?? -Infinity);
  });

  it('scores an exact prefix highest', () => {
    const prefix = fuzzyMatch('out', 'outreach writer');
    const later = fuzzyMatch('out', 'the layout writer');
    expect(prefix?.score ?? -Infinity).toBeGreaterThan(later?.score ?? -Infinity);
  });

  it('requires every token to match', () => {
    expect(fuzzyMatchTokens('outreach writer', 'outreach writer agent')).not.toBeNull();
    expect(fuzzyMatchTokens('outreach zebra', 'outreach writer agent')).toBeNull();
  });

  it('returns an empty match for an empty query rather than failing', () => {
    expect(fuzzyMatch('', 'anything')).toEqual({ score: 0, positions: [] });
  });
});

describe('searchCatalog', () => {
  it('returns nothing for an empty query', () => {
    expect(searchCatalog(index, '')).toEqual([]);
    expect(searchCatalog(index, '   ')).toEqual([]);
  });

  it('finds an agent by name', () => {
    const [first] = searchCatalog(index, 'outreach writer');
    expect(first?.kind).toBe('agent');
    expect(first?.title).toBe('Outreach Writer');
  });

  it('finds agents by a tool they use, not just the tool itself', () => {
    const results = searchCatalog(index, 'hubspot', 50);
    expect(results.some((r) => r.kind === 'tool')).toBe(true);
    expect(results.some((r) => r.kind === 'agent')).toBe(true);
  });

  it('finds an agent through its skill', () => {
    const results = searchCatalog(index, 'buying committee', 50);
    expect(results.some((r) => r.agentId === 'agt-buying-committee')).toBe(true);
  });

  it('finds departments and functions', () => {
    expect(searchCatalog(index, 'back office').some((r) => r.kind === 'department')).toBe(true);
    expect(searchCatalog(index, 'prospecting').some((r) => r.kind === 'function')).toBe(true);
  });

  it('ranks agents above the tool that merely mentions them', () => {
    const results = searchCatalog(index, 'churn');
    expect(results[0]?.kind).toBe('agent');
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(searchCatalog(index, 'qqqzzzxxx')).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(searchCatalog(index, 'a', 5)).toHaveLength(5);
  });

  it('carries the fields a result row needs to render', () => {
    const [first] = searchCatalog(index, 'lead sourcing');
    expect(first?.subtitle).toContain('Sales');
    expect(first?.autonomy).toBeTruthy();
    expect(first?.departmentId).toBe('dep-sales');
  });
});
