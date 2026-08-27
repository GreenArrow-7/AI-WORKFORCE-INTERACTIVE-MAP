// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageRepository, MemoryRepository, STORAGE_KEY, isCompatibleVersion } from '@/lib/storage';
import { emptySnapshot } from '@/lib/schemas';

const NOW = '2026-01-15T09:30:00.000Z';

describe('LocalStorageRepository', () => {
  const repo = new LocalStorageRepository();

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reports absent when nothing has been saved', () => {
    expect(repo.loadDetailed()).toEqual({ snapshot: null, reason: 'absent' });
  });

  it('round-trips a snapshot', async () => {
    const snapshot = emptySnapshot(NOW);
    await repo.save(snapshot);
    expect(await repo.load()).toEqual(snapshot);
  });

  it('recovers from unparseable JSON rather than throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ this is not json');
    const result = repo.loadDetailed();
    expect(result.snapshot).toBeNull();
    expect(result.reason).toBe('corrupt');
  });

  it('recovers from a truncated write', async () => {
    await repo.save(emptySnapshot(NOW));
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? '';
    window.localStorage.setItem(STORAGE_KEY, stored.slice(0, stored.length - 12));
    expect(repo.loadDetailed().reason).toBe('corrupt');
  });

  it('rejects JSON of the wrong shape as corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: '1.0' }));
    expect(repo.loadDetailed().reason).toBe('corrupt');
  });

  it('refuses a snapshot from an incompatible future version', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptySnapshot(NOW), version: '9.0' }));
    expect(repo.loadDetailed().reason).toBe('unsupported-version');
  });

  it('clears cleanly', async () => {
    await repo.save(emptySnapshot(NOW));
    await repo.clear();
    expect(await repo.load()).toBeNull();
  });

  it('keeps different keys isolated', async () => {
    const other = new LocalStorageRepository('aiwm.test.other');
    await repo.save(emptySnapshot(NOW));
    expect(await other.load()).toBeNull();
  });
});

describe('isCompatibleVersion', () => {
  it('accepts the current major line and refuses others', () => {
    expect(isCompatibleVersion('1.0')).toBe(true);
    expect(isCompatibleVersion('1.7')).toBe(true);
    expect(isCompatibleVersion('2.0')).toBe(false);
    expect(isCompatibleVersion('nonsense')).toBe(false);
  });
});

describe('MemoryRepository', () => {
  it('satisfies the same interface', async () => {
    const repo = new MemoryRepository();
    expect(await repo.load()).toBeNull();
    await repo.save(emptySnapshot(NOW));
    expect(await repo.load()).not.toBeNull();
    await repo.clear();
    expect(await repo.load()).toBeNull();
  });
});
