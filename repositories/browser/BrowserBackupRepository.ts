import type { BackupMetadata } from "@/shared/types";
import type { CreateBackupMetadataInput, IBackupRepository } from "../interfaces/IBackupRepository";
import {
  byteLength,
  computeChecksum,
  DATABASE_VERSION,
  generateId,
  getDatabase,
  readSnapshot,
  serializeSnapshot,
  SNAPSHOT_FORMAT_VERSION,
  type StoredBackup,
} from "./database";

/**
 * IndexedDB implementation of `IBackupRepository`.
 *
 * The one place the browser and SQL versions genuinely differ. With no
 * filesystem, a backup's *contents* live in the store alongside its
 * metadata rather than in a `.db` file the metadata points at.
 *
 * That difference removes a defect rather than introducing one. In the
 * SQL build the backup table lived inside the database being restored,
 * so restoring rewound backup history and made the safety copy
 * disappear — found live in Phase 3 and worked around with filesystem
 * reconciliation. Here the `backups` store is deliberately excluded
 * from `writeSnapshot()`, so a restore cannot touch it and the problem
 * cannot arise.
 */
export class BrowserBackupRepository implements IBackupRepository {
  /**
   * Records a backup, capturing the snapshot it describes.
   *
   * `fileSizeBytes` on the input is ignored: with no file to stat, the
   * only meaningful size is that of the snapshot actually captured
   * here, and reporting anything else would be a number the user cannot
   * reconcile with what was stored.
   */
  async recordBackup(metadata: CreateBackupMetadataInput): Promise<BackupMetadata> {
    const db = await getDatabase();

    // Captured at the moment of recording, so the snapshot always
    // matches the metadata describing it.
    const snapshot = await readSnapshot();
    const serialized = serializeSnapshot(snapshot);

    const record: StoredBackup = {
      id: generateId(),
      filename: metadata.filename,
      createdAt: metadata.createdAt.toISOString(),
      fileSizeBytes: byteLength(serialized),
      applicationVersion: metadata.applicationVersion,
      manifest: {
        applicationVersion: metadata.applicationVersion,
        databaseSchemaVersion: String(DATABASE_VERSION),
        backupFormatVersion: SNAPSHOT_FORMAT_VERSION,
        createdAt: metadata.createdAt.toISOString(),
        checksumSha256: await computeChecksum(serialized),
      },
      snapshot,
    };
    await db.add("backups", record);
    return toDomainBackupMetadata(record);
  }

  async findLatestBackup(): Promise<BackupMetadata | null> {
    const all = await this.findAllBackups();
    return all[0] ?? null;
  }

  async findAllBackups(): Promise<readonly BackupMetadata[]> {
    const db = await getDatabase();
    const records = await db.getAll("backups");
    return records
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toDomainBackupMetadata);
  }

  async deleteBackupRecord(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete("backups", id);
  }

  /**
   * The complete stored record — manifest and snapshot included.
   *
   * Beyond `IBackupRepository`, which describes metadata only. The
   * Persistence Engine needs the snapshot to perform a restore and the
   * manifest to verify one, and in the browser this repository is the
   * only thing holding either.
   */
  async findRecord(id: string): Promise<StoredBackup | null> {
    const db = await getDatabase();
    return (await db.get("backups", id)) ?? null;
  }
}

function toDomainBackupMetadata(record: StoredBackup): BackupMetadata {
  return {
    id: record.id,
    filename: record.filename,
    createdAt: new Date(record.createdAt),
    fileSizeBytes: record.fileSizeBytes,
    applicationVersion: record.applicationVersion,
  };
}
