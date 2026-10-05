import type { Page, RecallEvent, Session, SessionItem, Settings } from "@/shared/types";

/**
 * The manifest stored alongside every physical backup file (as
 * `<filename>.manifest.json`). Carries the fields SDS Part 13
 * "VERSION COMPATIBILITY" requires (application version, database
 * schema version, creation timestamp, backup format version) that do
 * not fit in the `BackupMetadata` Prisma model completed in MODULE 01
 * (see the note in `shared/types/backup.ts`), plus an integrity
 * checksum.
 */
export interface BackupManifest {
  readonly applicationVersion: string;
  readonly databaseSchemaVersion: string;
  readonly backupFormatVersion: string;
  readonly createdAt: string;
  readonly checksumSha256: string;
}

/** Result of verifying one specific backup (`verifyBackup()`), distinct from `verifyDatabase()`'s check of the live database. */
export interface BackupVerificationResult {
  readonly backupId: string;
  readonly verified: boolean;
  readonly issues: readonly string[];
  readonly checkedAt: Date;
}

/**
 * The complete, portable shape of a PHOS data export
 * (SDS Part 13 "EXPORT CONTRACT"). Every field is objective, persisted
 * domain data — never transient runtime state.
 */
export interface PhosExportData {
  /** Complete browser record; old top-level fields remain readable by legacy tools. */
  readonly snapshot?: import("@/repositories/browser").PhosSnapshot;
  readonly checksum?: string;
  readonly applicationVersion: string;
  /**
   * The data format this file is written in — the thing import actually
   * has to be compatible with.
   *
   * Absent on every file written before v0.3.0, all of which are format
   * 1. Import used to compare `applicationVersion` exactly, so each
   * release silently orphaned the previous release's export files; see
   * `canReadFormat()`.
   */
  readonly formatVersion?: number;
  readonly exportedAt: string;
  readonly pages: readonly Page[];
  readonly sessions: readonly Session[];
  readonly sessionItems: readonly SessionItem[];
  readonly recallEvents: readonly RecallEvent[];
  readonly settings: Settings;
}
