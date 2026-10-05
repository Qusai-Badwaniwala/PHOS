/**
 * Domain-safe representation of a persisted BackupMetadata record.
 *
 * Mirrors the `BackupMetadata` Prisma model (SDS Part 8) exactly:
 * filename, createdAt, fileSizeBytes, applicationVersion.
 *
 * Note: SDS Part 13 ("VERSION COMPATIBILITY") states that every backup
 * shall additionally include a database schema version and a backup
 * format version, but Part 8's Prisma schema (already implemented in
 * MODULE 01) only defines `applicationVersion`. This gap is
 * intentionally left visible rather than silently resolved here —
 * whoever implements MODULE 04 (Persistence Engine) will need to
 * decide how schema/format versioning is derived or encoded (for
 * example, from `filename` or from Prisma's own migration history)
 * without changing the already-completed database schema.
 */
export interface BackupMetadata {
  readonly id: string;
  readonly filename: string;
  readonly createdAt: Date;
  readonly fileSizeBytes: number;
  readonly applicationVersion: string;
}

/**
 * Result of a backup creation operation (SDS Part 13 "BACKUP CONTRACT").
 * A backup is never marked successful until verification completes.
 */
export interface BackupCreationResult {
  readonly metadata: BackupMetadata;
  readonly verified: boolean;
}

/**
 * Result of a restore operation (SDS Part 13 "RESTORE CONTRACT"). A
 * safety backup of the current database is always created before a
 * restore proceeds, so its id is always present.
 */
export interface RestoreResult {
  readonly restoredFromBackupId: string;
  readonly safetyBackupId: string;
  readonly verified: boolean;
  readonly completedAt: Date;
}

/**
 * Result of an import operation (SDS Part 13 "IMPORT CONTRACT").
 * Invalid imports fail before modifying the existing database, so a
 * failed result never partially applies.
 */
export interface ImportResult {
  readonly success: boolean;
  readonly validationErrors: readonly string[];
  readonly importedAt: Date | null;
  readonly safetyBackupId?: string;
}

/**
 * Result of an export operation (SDS Part 13 "EXPORT CONTRACT").
 * Exported data never contains transient runtime state.
 */
export interface ExportResult {
  readonly filename: string;
  readonly fileSizeBytes: number;
  readonly exportedAt: Date;
}

/**
 * Result of a database integrity verification (SDS Part 13
 * "DATABASE MAINTENANCE" / public interface `verifyDatabase()`).
 */
export interface DatabaseVerificationResult {
  readonly healthy: boolean;
  readonly issues: readonly string[];
  readonly checkedAt: Date;
}

/**
 * Storage statistics (SDS Part 13, public interface
 * `getStorageStatistics()`). The SDS names this operation but does not
 * enumerate its exact fields; this is a minimal, conservative contract
 * derived directly from the Persistence Engine's stated
 * responsibilities (storage validation, database maintenance) and may
 * be extended when MODULE 04 is implemented.
 */
export interface StorageStatistics {
  readonly databaseSizeBytes: number;
  readonly totalPages: number;
  readonly totalSessions: number;
  readonly totalRecallEvents: number;
  readonly backupCount: number;
}

/**
 * Result of an explicit, user-requested erasure of all memorization
 * data (`IPersistenceEngine.resetAllData()`).
 *
 * `safetyBackupId` is always present: a verified backup is taken
 * immediately before anything is deleted, so this operation is
 * recoverable even though the UI presents it as permanent. The counts
 * are reported back so the user can be told exactly what was removed
 * rather than a vague "done".
 */
export interface DataResetResult {
  readonly safetyBackupId: string;
  readonly deletedRecallEvents: number;
  readonly deletedSessions: number;
  /** Exams removed. Zero for any build with no exam storage wired in. */
  readonly deletedExams: number;
  readonly resetPages: number;
  readonly completedAt: Date;
}
