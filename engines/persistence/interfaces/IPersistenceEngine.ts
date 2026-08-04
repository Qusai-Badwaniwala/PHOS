import type {
  BackupMetadata,
  DataResetResult,
  ExportResult,
  ImportResult,
  RestoreResult,
  BackupCreationResult,
  DatabaseVerificationResult,
  StorageStatistics,
} from "@/shared/types";
import type { BackupVerificationResult } from "../models";

/**
 * Public contract of the Persistence Engine (SDS Part 13 "PUBLIC
 * INTERFACE"). "The implementation may evolve provided the public
 * contract remains stable."
 */
export interface IPersistenceEngine {
  createBackup(): Promise<BackupCreationResult>;
  restoreBackup(backupId: string): Promise<RestoreResult>;
  listBackups(): Promise<readonly BackupMetadata[]>;
  deleteBackup(backupId: string): Promise<void>;
  exportData(): Promise<ExportResult>;
  importData(filePath: string): Promise<ImportResult>;
  verifyBackup(backupId: string): Promise<BackupVerificationResult>;
  verifyDatabase(): Promise<DatabaseVerificationResult>;
  runMigration(): Promise<void>;
  getStorageStatistics(): Promise<StorageStatistics>;
  /**
   * Erases all memorization data at the user's explicit request,
   * after taking a verified backup.
   *
   * This belongs to the Persistence Engine rather than to any learning
   * engine because it is a storage-lifecycle operation, not a domain
   * decision — nothing here reasons about memorization, it only
   * removes rows in an order the schema permits. Settings are
   * deliberately left untouched; resetting preferences is a separate,
   * non-destructive action.
   */
  resetAllData(): Promise<DataResetResult>;
}
