import type { BackupMetadata } from "@/shared/types";
import type { BackupMetadataDTO } from "@/shared/dto";

export function toBackupMetadataDTO(metadata: BackupMetadata): BackupMetadataDTO {
  return {
    backupId: metadata.id,
    filename: metadata.filename,
    createdAt: metadata.createdAt.toISOString(),
    fileSizeBytes: metadata.fileSizeBytes,
    applicationVersion: metadata.applicationVersion,
  };
}
