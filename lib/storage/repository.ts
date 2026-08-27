import type { WorkspaceSnapshot } from '@/lib/schemas';

/**
 * The seam between user state and where it is stored.
 *
 * `LocalStorageRepository` implements it today. A `SupabaseRepository` can
 * implement the same three methods later with no change to the store or to any
 * component — which is the entire reason the indirection exists (§11, §35).
 */
export interface WorkforceRepository {
  load(): Promise<WorkspaceSnapshot | null>;
  save(snapshot: WorkspaceSnapshot): Promise<void>;
  clear(): Promise<void>;
}

/** Why a load returned nothing. Surfaced to the user for `corrupt` only. */
export type LoadFailureReason = 'absent' | 'corrupt' | 'unsupported-version' | 'unavailable';

export interface LoadResult {
  snapshot: WorkspaceSnapshot | null;
  reason: LoadFailureReason | null;
}
