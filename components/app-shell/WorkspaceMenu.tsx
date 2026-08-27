'use client';

import { useRef, useState } from 'react';
import { ClipboardCopy, Download, RotateCcw, Upload, UserRound } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import {
  buildSummary,
  copyText,
  downloadText,
  parseSnapshot,
  serialiseSnapshot,
  snapshotFilename,
} from '@/lib/export/snapshot';
import { flushPersist, useWorkforceStore } from '@/stores/workforce-store';
import { Popover } from '@/components/shared/Popover';

/**
 * Workspace identity plus the whole export/import surface (§18, §19).
 *
 * Reset asks for confirmation inline rather than in a dialog: it is destructive,
 * but a modal for a two-click action is heavier than the action deserves.
 */
export function WorkspaceMenu() {
  const [open, setOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const name = useWorkforceStore((s) => s.workspace.name);
  const setWorkspaceName = useWorkforceStore((s) => s.setWorkspaceName);
  const toSnapshot = useWorkforceStore((s) => s.toSnapshot);
  const importSnapshot = useWorkforceStore((s) => s.importSnapshot);
  const resetProgress = useWorkforceStore((s) => s.resetProgress);
  const pushNotice = useWorkforceStore((s) => s.pushNotice);
  const states = useWorkforceStore((s) => s.agentStates);

  const handleExport = async (): Promise<void> => {
    await flushPersist();
    const snapshot = toSnapshot();
    downloadText(snapshotFilename(snapshot), serialiseSnapshot(snapshot));
    pushNotice('success', 'Workforce state exported.');
    setOpen(false);
  };

  const handleImportFile = async (file: File): Promise<void> => {
    const text = await file.text();
    const result = parseSnapshot(text);
    if (!result.ok) {
      pushNotice('warning', result.error);
      return;
    }
    const { applied, skipped } = importSnapshot(result.snapshot);
    pushNotice(
      skipped > 0 ? 'warning' : 'success',
      skipped > 0
        ? `Imported ${applied} agent states. ${skipped} referred to agents not in this catalogue and were ignored.`
        : `Imported ${applied} agent states.`,
    );
    setOpen(false);
  };

  const handleCopySummary = async (): Promise<void> => {
    const ok = await copyText(buildSummary(catalog, states));
    pushNotice(ok ? 'success' : 'warning', ok ? 'Summary copied to the clipboard.' : 'Could not access the clipboard.');
    setOpen(false);
  };

  const handleReset = (): void => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    resetProgress();
    setConfirmingReset(false);
    pushNotice('info', 'Progress reset. Every agent is back to not started.');
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmingReset(false);
      }}
      label="Workspace"
      trigger={
        <button
          type="button"
          aria-label="Workspace menu"
          className="rounded border border-line bg-bg-inset p-1.5 text-fg-muted transition-colors hover:border-line-strong hover:text-fg-secondary"
        >
          <UserRound size={13} aria-hidden />
        </button>
      }
    >
      <div className="w-64 space-y-3">
        <div>
          <label htmlFor="workspace-name" className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
            Workspace
          </label>
          <input
            id="workspace-name"
            value={name}
            onChange={(event) => setWorkspaceName(event.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded border border-line bg-bg-inset px-2 py-1.5 text-xs text-fg outline-none transition-colors focus:border-line-strong"
          />
        </div>

        <div className="space-y-0.5 border-t border-line-subtle pt-2">
          <MenuButton icon={Download} label="Export progress (JSON)" onClick={() => void handleExport()} />
          <MenuButton icon={Upload} label="Import progress" onClick={() => fileInput.current?.click()} />
          <MenuButton icon={ClipboardCopy} label="Copy status summary" onClick={() => void handleCopySummary()} />
          <MenuButton
            icon={RotateCcw}
            label={confirmingReset ? 'Confirm — reset all progress' : 'Reset progress'}
            onClick={handleReset}
            danger={confirmingReset}
          />
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset first so re-picking the same file fires change again.
            event.target.value = '';
            if (file) void handleImportFile(file);
          }}
        />

        <p className="border-t border-line-subtle pt-2 text-2xs text-fg-muted">
          Anonymous progress is kept in this browser only. Sign-in and shared workspaces are a later addition — the
          storage layer is already behind an interface for it.
        </p>
      </div>
    </Popover>
  );
}

interface MenuButtonProps {
  icon: typeof Download;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuButton({ icon: Icon, label, onClick, danger }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-hover"
      style={danger ? { color: 'var(--negative)' } : undefined}
    >
      <Icon size={13} aria-hidden className="shrink-0 text-fg-muted" />
      <span className={danger ? undefined : 'text-fg-secondary'}>{label}</span>
    </button>
  );
}
