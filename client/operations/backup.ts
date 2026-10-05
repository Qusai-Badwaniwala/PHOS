import { generateCorrelationId } from "@/shared/utils";
import { validateEnum, validateIdentifier } from "@/validators";
import { toBackupMetadataDTO } from "@/shared/mappers";
import type { BackupListResponseDTO, BackupMetadataDTO } from "@/shared/dto";
import type { PhosExportData } from "@/engines/persistence";
import { container } from "../container";

export async function listBackups(): Promise<BackupListResponseDTO> {
  const backups = await container.persistenceEngine.listBackups();
  const dtos = backups.map(toBackupMetadataDTO);
  return { backups: dtos, count: dtos.length };
}

export async function createBackup(): Promise<BackupMetadataDTO> {
  const result = await container.persistenceEngine.createBackup();
  return toBackupMetadataDTO(result.metadata);
}

export async function deleteBackup(backupId: string): Promise<void> {
  const correlationId = generateCorrelationId();
  await container.persistenceEngine.deleteBackup(
    validateIdentifier(backupId, "backupId", correlationId),
  );
}

export interface RestoreOutcome {
  readonly restoredFromBackupId: string;
  readonly safetyBackupId: string;
  readonly verified: boolean;
  readonly completedAt: string;
}

/**
 * Restores from a backup, taking a safety copy of the current data
 * first so restoring the wrong one is itself reversible.
 */
export async function restoreBackup(backupId: string): Promise<RestoreOutcome> {
  const correlationId = generateCorrelationId();
  const id = validateIdentifier(backupId, "backupId", correlationId);

  const result = await container.persistenceEngine.restoreBackup(id);

  // Every row the Learning Engine was holding in memory has just been
  // replaced. Forget the cached session so the next call reads the
  // restored state instead of the old one.
  container.learningEngine.discardInMemoryState();

  return {
    restoredFromBackupId: result.restoredFromBackupId,
    safetyBackupId: result.safetyBackupId,
    verified: result.verified,
    completedAt: result.completedAt.toISOString(),
  };
}

export interface ExportOutcome {
  readonly filename: string;
  readonly fileSizeBytes: number;
  readonly exportedAt: string;
  readonly content: PhosExportData;
}

/**
 * Exports everything the user has recorded, as data ready to be written
 * to a file.
 *
 * The route this replaces wrote the export to disk and read it back,
 * because the engine's contract returned metadata only. In the browser
 * the engine returns the content directly and the caller turns it into
 * a download — one fewer round trip through a filesystem that no longer
 * exists.
 */
export async function exportData(): Promise<ExportOutcome> {
  const result = await container.persistenceEngine.exportData();
  return {
    filename: result.filename,
    fileSizeBytes: result.fileSizeBytes,
    exportedAt: result.exportedAt.toISOString(),
    content: result.content,
  };
}

export interface ImportOutcome {
  readonly success: boolean;
  readonly validationErrors: readonly string[];
  readonly importedAt: string | null;
  readonly safetyBackupId?: string;
}

/**
 * Imports a previously exported PHOS file.
 *
 * The route staged the upload on disk because the engine took a path.
 * The browser hands JavaScript the file's text directly, so it goes
 * straight to the engine — nothing is written anywhere before the data
 * has been validated.
 */
export async function importData(fileContents: string): Promise<ImportOutcome> {
  const result = await container.persistenceEngine.importData(fileContents);

  if (result.success) {
    // Imported rows replace what the engine had cached in memory.
    container.learningEngine.discardInMemoryState();
  }

  return {
    success: result.success,
    validationErrors: result.validationErrors,
    importedAt: result.importedAt ? result.importedAt.toISOString() : null,
    safetyBackupId: result.safetyBackupId,
  };
}

// ---------------------------------------------------------------
// Danger Zone
// ---------------------------------------------------------------

/**
 * The phrase the caller must pass to prove this request is deliberate.
 *
 * The user types it into the confirmation dialog, and it is checked
 * again here. In-process there is no untrusted caller to defend
 * against, but a destructive operation should still be impossible to
 * invoke by accident from a mistaken refactor — a call with no argument
 * fails rather than erasing a user's Hifz.
 */
export const DATA_RESET_CONFIRMATION = "DELETE";
export const APPLICATION_RESET_CONFIRMATION = "RESET PHOS";

export async function resetApplication(confirmation: string): Promise<void> {
  validateEnum(
    confirmation,
    [APPLICATION_RESET_CONFIRMATION],
    "confirmation",
    generateCorrelationId(),
  );
  await container.persistenceEngine.resetApplication();
  container.learningEngine.discardInMemoryState();
}

export interface DataResetSummary {
  readonly safetyBackupId: string;
  readonly deletedRecallEvents: number;
  readonly deletedSessions: number;
  readonly deletedExams: number;
  readonly resetPages: number;
  readonly completedAt: string;
}

/**
 * Erases all memorization data at the user's explicit request.
 *
 * A verified backup is taken first, inside
 * `BrowserPersistenceEngine.resetAllData()`, and its id is returned so
 * the user can be told recovery is possible. If the backup cannot be
 * created and verified, nothing is deleted.
 */
export async function resetAllData(confirmation: string): Promise<DataResetSummary> {
  const correlationId = generateCorrelationId();
  validateEnum(confirmation, [DATA_RESET_CONFIRMATION], "confirmation", correlationId);

  const result = await container.persistenceEngine.resetAllData();

  // The Learning Engine caches the active session and its plan in
  // memory. Those rows have just been deleted, so that cache must be
  // dropped or the next session call would operate on a session that no
  // longer exists.
  container.learningEngine.discardInMemoryState();

  return {
    safetyBackupId: result.safetyBackupId,
    deletedRecallEvents: result.deletedRecallEvents,
    deletedSessions: result.deletedSessions,
    deletedExams: result.deletedExams,
    resetPages: result.resetPages,
    completedAt: result.completedAt.toISOString(),
  };
}
