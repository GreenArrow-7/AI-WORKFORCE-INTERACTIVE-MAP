import type { Catalog } from '@/lib/catalog';
import { computeProgress, recommendNextDeployments, type AgentStateMap } from '@/lib/progress/compute';
import { workspaceSnapshotSchema, type WorkspaceSnapshot } from '@/lib/schemas';

export interface ImportSuccess {
  ok: true;
  snapshot: WorkspaceSnapshot;
}

export interface ImportFailure {
  ok: false;
  /** Human-readable reason, safe to show directly. */
  error: string;
}

export type ImportResult = ImportSuccess | ImportFailure;

/**
 * Parses an uploaded or pasted snapshot.
 *
 * Imported JSON is never trusted: it is parsed, then validated against the same
 * schema used for persistence, and only then handed to the store — which does a
 * second pass to drop states for agents that do not exist (§18, §36).
 */
export function parseSnapshot(raw: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  const parsed = workspaceSnapshotSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join('.') || 'the file';
    return { ok: false, error: `Not a valid workforce export — ${where}: ${first?.message ?? 'unrecognised shape'}.` };
  }

  const major = parsed.data.version.split('.')[0];
  if (major !== '1') {
    return { ok: false, error: `Export version ${parsed.data.version} is not supported by this build.` };
  }

  return { ok: true, snapshot: parsed.data };
}

export function serialiseSnapshot(snapshot: WorkspaceSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/** Filename that sorts chronologically and survives a shared drive. */
export function snapshotFilename(snapshot: WorkspaceSnapshot): string {
  const date = snapshot.updatedAt.slice(0, 10);
  const name = snapshot.workspace.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${name || 'workspace'}-ai-workforce-${date}.json`;
}

/**
 * The plain-text status summary (§19), built from live state rather than stored.
 * Written to be pasted into a document or a message without further editing.
 */
export function buildSummary(catalog: Catalog, states: AgentStateMap): string {
  const progress = computeProgress(catalog, states);
  const { counts, total } = progress.company;
  const lines: string[] = [];

  lines.push('AI WORKFORCE STATUS');
  lines.push('');
  lines.push(`${total} total agents`);
  lines.push(`${counts.live} live`);
  lines.push(`${counts.building} building`);
  lines.push(`${counts.planned} planned`);
  lines.push(`${counts.not_started} not started`);
  lines.push('');

  for (const department of catalog.departments) {
    const summary = progress.byDepartment.get(department.id);
    if (!summary || summary.total === 0) continue;
    lines.push(`${department.name}`);
    lines.push(`  ${summary.counts.live}/${summary.total} live`);
  }

  const recommendations = recommendNextDeployments(catalog, states, 3);
  if (recommendations.length > 0) {
    lines.push('');
    lines.push('Recommended next deployments:');
    recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec.agent.name} — ${rec.reason}`);
    });
  }

  return lines.join('\n');
}

/**
 * Triggers a client-side download. No backend involved: the MVP generates every
 * file in the browser (§13, §18).
 */
export function downloadText(filename: string, contents: string, mime = 'application/json'): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the click has definitely been handled.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Copies to the clipboard, reporting whether it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
