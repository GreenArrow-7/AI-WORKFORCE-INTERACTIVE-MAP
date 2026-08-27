'use client';

import { create } from 'zustand';
import { catalog } from '@/lib/catalog';
import {
  emptySnapshot,
  SNAPSHOT_VERSION,
  type AgentId,
  type AgentStatus,
  type Autonomy,
  type DepartmentId,
  type FunctionId,
  type ToolId,
  type UserAgentState,
  type Workspace,
  type WorkspaceSnapshot,
} from '@/lib/schemas';
import { LocalStorageRepository, type WorkforceRepository } from '@/lib/storage';
import type { ViewMode } from '@/lib/routing';

/**
 * Filters are additive within a facet and intersective across facets: an empty
 * array means "this facet does not filter", which keeps "no filters" and "all
 * values selected" from being confusingly different states.
 */
export interface Filters {
  departmentIds: DepartmentId[];
  functionIds: FunctionId[];
  autonomy: Autonomy[];
  status: AgentStatus[];
  toolIds: ToolId[];
  hasSkills: boolean;
  hasDependencies: boolean;
}

export const EMPTY_FILTERS: Filters = {
  departmentIds: [],
  functionIds: [],
  autonomy: [],
  status: [],
  toolIds: [],
  hasSkills: false,
  hasDependencies: false,
};

export function isFilterActive(f: Filters): boolean {
  return (
    f.departmentIds.length > 0 ||
    f.functionIds.length > 0 ||
    f.autonomy.length > 0 ||
    f.status.length > 0 ||
    f.toolIds.length > 0 ||
    f.hasSkills ||
    f.hasDependencies
  );
}

export type ThemePreference = Workspace['theme'];

/** A transient message for the user: import results, recovered storage, etc. */
export interface Notice {
  id: number;
  tone: 'info' | 'success' | 'warning';
  message: string;
}

interface WorkforceState {
  // ---- user state (persisted) -------------------------------------------
  agentStates: Record<AgentId, UserAgentState>;
  workspace: Workspace;

  // ---- view state (session only) ----------------------------------------
  viewMode: ViewMode;
  focusedDepartmentId: DepartmentId | null;
  selectedAgentId: AgentId | null;
  brainOpen: boolean;
  commandCenterId: string | null;
  filters: Filters;
  searchOpen: boolean;
  /** Agent to visually pulse after a search jump. Cleared once consumed. */
  focusRequestId: AgentId | null;
  hydrated: boolean;
  notices: Notice[];

  // ---- actions -----------------------------------------------------------
  hydrate: () => Promise<void>;
  setStatus: (agentId: AgentId, status: AgentStatus) => void;
  setNotes: (agentId: AgentId, notes: string) => void;
  resetProgress: () => void;
  importSnapshot: (snapshot: WorkspaceSnapshot) => { applied: number; skipped: number };
  toSnapshot: () => WorkspaceSnapshot;

  setTheme: (theme: ThemePreference) => void;
  setWorkspaceName: (name: string) => void;

  setViewMode: (mode: ViewMode) => void;
  focusDepartment: (id: DepartmentId | null) => void;
  selectAgent: (id: AgentId | null) => void;
  openBrain: (open: boolean) => void;
  setCommandCenter: (id: string | null) => void;
  requestFocus: (id: AgentId | null) => void;

  setFilters: (update: Partial<Filters>) => void;
  clearFilters: () => void;
  setSearchOpen: (open: boolean) => void;

  pushNotice: (tone: Notice['tone'], message: string) => void;
  dismissNotice: (id: number) => void;
}

let repository: WorkforceRepository = new LocalStorageRepository();

/** Swap the persistence backend. Used by tests and by a future Supabase client. */
export function setRepository(next: WorkforceRepository): void {
  repository = next;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let noticeSeq = 0;

/**
 * Writes are debounced: clicking through four statuses in a second should cost
 * one write, not four.
 */
function schedulePersist(get: () => WorkforceState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void repository.save(get().toSnapshot());
  }, 250);
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useWorkforceStore = create<WorkforceState>()((set, get) => ({
  // Initial state must be deterministic and identical on server and client:
  // the persisted snapshot is applied in `hydrate`, after mount, so the first
  // client render matches the server's and there is no hydration mismatch (§39).
  agentStates: {},
  workspace: { name: 'My workspace', theme: 'dark' },

  viewMode: 'map',
  focusedDepartmentId: null,
  selectedAgentId: null,
  brainOpen: false,
  commandCenterId: null,
  filters: EMPTY_FILTERS,
  searchOpen: false,
  focusRequestId: null,
  hydrated: false,
  notices: [],

  async hydrate() {
    if (get().hydrated) return;

    let snapshot: WorkspaceSnapshot | null = null;
    let corrupt = false;

    if (repository instanceof LocalStorageRepository) {
      const detailed = repository.loadDetailed();
      snapshot = detailed.snapshot;
      corrupt = detailed.reason === 'corrupt' || detailed.reason === 'unsupported-version';
    } else {
      snapshot = await repository.load();
    }

    // Drop states for agents that no longer exist in the catalogue, so a stale
    // snapshot cannot resurrect a deleted agent into the progress numbers.
    const agentStates: Record<AgentId, UserAgentState> = {};
    if (snapshot) {
      for (const [id, state] of Object.entries(snapshot.agentStatuses)) {
        if (catalog.indexes.agentById.has(id)) agentStates[id] = state;
      }
    }

    set({
      agentStates,
      workspace: snapshot?.workspace ?? get().workspace,
      hydrated: true,
      notices: corrupt
        ? [
            {
              id: (noticeSeq += 1),
              tone: 'warning',
              message: 'Saved progress could not be read and has been reset.',
            },
          ]
        : [],
    });
  },

  setStatus(agentId, status) {
    if (!catalog.indexes.agentById.has(agentId)) return;
    set((s) => ({
      agentStates: {
        ...s.agentStates,
        [agentId]: { agentId, status, notes: s.agentStates[agentId]?.notes, updatedAt: nowIso() },
      },
    }));
    schedulePersist(get);
  },

  setNotes(agentId, notes) {
    if (!catalog.indexes.agentById.has(agentId)) return;
    set((s) => ({
      agentStates: {
        ...s.agentStates,
        [agentId]: {
          agentId,
          status: s.agentStates[agentId]?.status ?? 'not_started',
          notes: notes.trim() === '' ? undefined : notes,
          updatedAt: nowIso(),
        },
      },
    }));
    schedulePersist(get);
  },

  resetProgress() {
    set({ agentStates: {} });
    schedulePersist(get);
  },

  /**
   * Applies an imported snapshot, keeping only states whose agent exists in the
   * current catalogue. Unknown ids are counted and reported rather than stored,
   * so an old or hand-edited export cannot inject phantom agents (§18, §36).
   */
  importSnapshot(snapshot) {
    const agentStates: Record<AgentId, UserAgentState> = {};
    let applied = 0;
    let skipped = 0;

    for (const [id, state] of Object.entries(snapshot.agentStatuses)) {
      if (catalog.indexes.agentById.has(id)) {
        agentStates[id] = { ...state, agentId: id };
        applied += 1;
      } else {
        skipped += 1;
      }
    }

    set((s) => ({
      agentStates,
      workspace: { ...s.workspace, name: snapshot.workspace.name, theme: snapshot.workspace.theme },
    }));
    schedulePersist(get);
    return { applied, skipped };
  },

  toSnapshot() {
    const { agentStates, workspace } = get();
    return {
      version: SNAPSHOT_VERSION,
      workspace,
      agentStatuses: agentStates,
      updatedAt: nowIso(),
    };
  },

  setTheme(theme) {
    set((s) => ({ workspace: { ...s.workspace, theme } }));
    schedulePersist(get);
  },

  setWorkspaceName(name) {
    set((s) => ({ workspace: { ...s.workspace, name } }));
    schedulePersist(get);
  },

  setViewMode(viewMode) {
    set({ viewMode });
  },

  focusDepartment(focusedDepartmentId) {
    // Leaving a department also drops the selection made inside it.
    set((s) => ({
      focusedDepartmentId,
      selectedAgentId: focusedDepartmentId === null ? null : s.selectedAgentId,
      brainOpen: false,
    }));
  },

  selectAgent(selectedAgentId) {
    set({ selectedAgentId, brainOpen: false });
  },

  openBrain(brainOpen) {
    set({ brainOpen, selectedAgentId: brainOpen ? null : get().selectedAgentId });
  },

  setCommandCenter(commandCenterId) {
    set({ commandCenterId });
  },

  requestFocus(focusRequestId) {
    set({ focusRequestId });
  },

  setFilters(update) {
    set((s) => ({ filters: { ...s.filters, ...update } }));
  },

  clearFilters() {
    set({ filters: EMPTY_FILTERS });
  },

  setSearchOpen(searchOpen) {
    set({ searchOpen });
  },

  pushNotice(tone, message) {
    set((s) => ({ notices: [...s.notices, { id: (noticeSeq += 1), tone, message }] }));
  },

  dismissNotice(id) {
    set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
  },
}));

/** Flushes any debounced write immediately. Used before export and on unload. */
export async function flushPersist(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await repository.save(useWorkforceStore.getState().toSnapshot());
}

export { emptySnapshot };
