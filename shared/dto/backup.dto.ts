export interface BackupMetadataDTO {
  readonly backupId: string;
  readonly filename: string;
  readonly createdAt: string;
  readonly fileSizeBytes: number;
  readonly applicationVersion: string;
}

export interface BackupListResponseDTO {
  readonly backups: readonly BackupMetadataDTO[];
  readonly count: number;
}
