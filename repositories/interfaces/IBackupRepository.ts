import type { BackupMetadata } from "@/shared/types";

/** Input for `recordBackup()`. */
export type CreateBackupMetadataInput = Omit<BackupMetadata, "id">;

/**
 * Persistence contract for BackupMetadata (SDS Part 9
 * "BACKUPREPOSITORY"). Tracks backup *metadata* only — this
 * repository never manages backup files directly. File management
 * belongs to the Persistence Engine.
 */
export interface IBackupRepository {
  recordBackup(metadata: CreateBackupMetadataInput): Promise<BackupMetadata>;
  findLatestBackup(): Promise<BackupMetadata | null>;
  findAllBackups(): Promise<readonly BackupMetadata[]>;
  deleteBackupRecord(id: string): Promise<void>;
}
