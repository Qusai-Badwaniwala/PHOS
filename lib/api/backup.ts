import { backupOps, settingsOps } from "@/client/operations";
import { formatDateTimePreferred } from "@/lib/format";
import type { BackupMetadataDTO } from "@/shared/dto";
import type { BackupEntryDTO, BackupStatusDTO } from "@/types/dto";
import { preparePortableRestore } from "@/engines/persistence/browser/portable";

type BackendBackupMetadata = BackupMetadataDTO;

const UP_TO_DATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toBackupEntry(metadata: BackendBackupMetadata): BackupEntryDTO {
  return {
    id: metadata.backupId,
    date: formatDateTimePreferred(metadata.createdAt),
    // PHOS does not distinguish manual vs. automatic backups (no
    // scheduler exists yet — see docs/integration-review.md,
    // "Background Job System not built"), so every backup is
    // presented as "manual" here.
    type: "manual",
    size: formatFileSize(metadata.fileSizeBytes),
    status: "success",
  };
}

/** Backup status and history. */
export async function getBackupStatus(): Promise<BackupStatusDTO> {
  const result = await backupOps.listBackups();
  const sorted = [...result.backups].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latest = sorted[0];

  const status: BackupStatusDTO["status"] = !latest
    ? "never"
    : Date.now() - new Date(latest.createdAt).getTime() <= UP_TO_DATE_WINDOW_MS
      ? "up_to_date"
      : "outdated";

  // Read from settings rather than from the backup list, because an
  // export leaves no entry there — it writes a file and vanishes. See
  // `markDataExported()`.
  const settings = await settingsOps.getSettings();

  return {
    status,
    lastBackup: latest ? formatDateTimePreferred(latest.createdAt) : undefined,
    lastExport: settings.lastExportedAt
      ? formatDateTimePreferred(settings.lastExportedAt)
      : undefined,
    neverExported: !settings.lastExportedAt,
    history: sorted.map(toBackupEntry),
  };
}

/** Creates and verifies a new backup. */
export async function createBackup(): Promise<BackupEntryDTO> {
  return toBackupEntry(await backupOps.createBackup());
}

/** Records that an exported file reached the user. Call after the download. */
export async function markExported(): Promise<void> {
  return settingsOps.markDataExported();
}

/** Deletes a backup and the snapshot it holds. */
export async function deleteBackup(backupId: string): Promise<void> {
  await backupOps.deleteBackup(backupId);
}

export type { RestoreOutcome, ExportOutcome, ImportOutcome } from "@/client/operations/backup";

/**
 * Restores from a previously created backup.
 *
 * A safety backup of the current data is taken first and its id
 * returned, so restoring the wrong backup is itself reversible.
 */
export async function restoreBackup(backupId: string): Promise<backupOps.RestoreOutcome> {
  return backupOps.restoreBackup(backupId);
}

/** Exports all data and returns the file's name and contents. */
export async function exportData(): Promise<backupOps.ExportOutcome> {
  return backupOps.exportData();
}

/**
 * Imports a previously exported PHOS file.
 *
 * The file is read in the browser and handed to the engine as text.
 * Nothing is uploaded anywhere — there is nowhere to upload it to, and
 * that is the point: the user's Hifz record never leaves their device.
 */
export async function importData(file: File): Promise<backupOps.ImportOutcome> {
  return backupOps.importData(await file.text());
}

/** Validate locally and expose a reviewable summary before full replacement. */
export async function previewImport(file: File) {
  const result = await preparePortableRestore(await file.text());
  const snapshot = result.snapshot;
  return {
    valid: snapshot !== null,
    errors: result.errors,
    warnings: result.warnings,
    exportedAt: result.exportedAt,
    learnedPages: snapshot?.pages.filter((page) => page.memoryState !== "Unseen").length ?? 0,
    sessions: snapshot?.sessions.length ?? 0,
    recalls: snapshot?.recallEvents.length ?? 0,
    exams: snapshot?.exams?.length ?? 0,
    openSessions: snapshot?.sessions.filter((session) => session.completedAt === null).length ?? 0,
  };
}

/**
 * Triggers a browser download of `content` as a JSON file.
 *
 * The object URL is revoked immediately after the click: the browser
 * has already begun the download by then, and leaving it alive would
 * pin the whole serialized export in memory for the life of the page.
 */
export function downloadJson(filename: string, content: unknown): void {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
