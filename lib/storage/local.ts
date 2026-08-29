import { SNAPSHOT_VERSION, workspaceSnapshotSchema, type WorkspaceSnapshot } from '@/lib/schemas';
import type { LoadResult, WorkforceRepository } from './repository';

export const STORAGE_KEY = 'aiwm.workspace.v1';

/**
 * localStorage-backed persistence for anonymous progress.
 *
 * Every read is validated. Corrupted JSON, a truncated write or a snapshot from
 * an incompatible future version all resolve to "start fresh" rather than
 * throwing — losing progress is bad, but a white screen is worse (§36).
 */
export class LocalStorageRepository implements WorkforceRepository {
  constructor(private readonly key: string = STORAGE_KEY) {}

  private storage(): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      // Accessing localStorage throws outright in some privacy modes.
      return window.localStorage;
    } catch {
      return null;
    }
  }

  /** Load with the failure reason attached, for callers that want to report it. */
  loadDetailed(): LoadResult {
    const store = this.storage();
    if (!store) return { snapshot: null, reason: 'unavailable' };

    let raw: string | null;
    try {
      raw = store.getItem(this.key);
    } catch {
      return { snapshot: null, reason: 'unavailable' };
    }
    if (raw === null) return { snapshot: null, reason: 'absent' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { snapshot: null, reason: 'corrupt' };
    }

    const result = workspaceSnapshotSchema.safeParse(parsed);
    if (!result.success) return { snapshot: null, reason: 'corrupt' };
    if (!isCompatibleVersion(result.data.version)) {
      return { snapshot: null, reason: 'unsupported-version' };
    }
    return { snapshot: result.data, reason: null };
  }

  async load(): Promise<WorkspaceSnapshot | null> {
    return this.loadDetailed().snapshot;
  }

  async save(snapshot: WorkspaceSnapshot): Promise<void> {
    const store = this.storage();
    if (!store) return;
    try {
      store.setItem(this.key, JSON.stringify(snapshot));
    } catch {
      // Quota exceeded or storage disabled mid-session. Progress is not worth
      // interrupting the session over; the next save will retry.
    }
  }

  async clear(): Promise<void> {
    const store = this.storage();
    if (!store) return;
    try {
      store.removeItem(this.key);
    } catch {
      // Nothing useful to do.
    }
  }
}

/**
 * Only the current major line is readable. A snapshot written by a future
 * version is refused rather than half-understood.
 */
export function isCompatibleVersion(version: string): boolean {
  const major = version.split('.')[0];
  const currentMajor = SNAPSHOT_VERSION.split('.')[0];
  return major === currentMajor;
}

/** In-memory implementation used by tests and by server rendering. */
export class MemoryRepository implements WorkforceRepository {
  private snapshot: WorkspaceSnapshot | null = null;

  async load(): Promise<WorkspaceSnapshot | null> {
    return this.snapshot;
  }

  async save(snapshot: WorkspaceSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }

  async clear(): Promise<void> {
    this.snapshot = null;
  }
}
