import { generateCorrelationId } from "@/shared/utils";
import { canReadFormat, EXPORT_FORMAT_VERSION, TOTAL_MUSHAF_PAGES } from "@/shared/constants";
import type {
  BackupCreationResult,
  BackupMetadata,
  DatabaseVerificationResult,
  DataResetResult,
  ImportResult,
  RestoreResult,
  RecallEvent,
  Session,
  StorageStatistics,
} from "@/shared/types";
import type {
  IExamRepository,
  IPageRepository,
  IRecallEventRepository,
  ISessionRepository,
  ISettingsRepository,
} from "@/repositories";
import type { BrowserBackupRepository } from "@/repositories/browser";
import {
  byteLength,
  computeChecksum,
  serializeSnapshot,
  writeSnapshot,
  type StoredBackup,
} from "@/repositories/browser";
import {
  BackupCreationError,
  BackupVerificationError,
  ExportFailedError,
  ImportValidationError,
  RestoreFailedError,
} from "../errors";
import { EPOCH_START, FAR_FUTURE } from "../constants";
import type { BackupVerificationResult, PhosExportData } from "../models";
import type { BrowserExportResult, IBrowserPersistenceEngine } from "./IBrowserPersistenceEngine";

export interface BrowserPersistenceEngineDependencies {
  readonly pageRepository: IPageRepository;
  readonly recallEventRepository: IRecallEventRepository;
  readonly sessionRepository: ISessionRepository;
  readonly settingsRepository: ISettingsRepository;
  /**
   * Optional so the engine stays constructible without it, exactly as
   * the Adaptive Engine's is. Absent, a reset simply has no exams to
   * remove — which is the truth for any build from before they existed.
   */
  readonly examRepository?: IExamRepository;
  /**
   * Concrete, not `IBackupRepository`. Restoring needs a backup's
   * *contents*, and in the browser this repository is the only thing
   * that holds them — `IBackupRepository` is metadata-only by design
   * (SDS Part 9) and widening it would push snapshot storage into a
   * contract the SQL implementation cannot honour.
   */
  readonly backupRepository: BrowserBackupRepository;
  readonly applicationVersion: string;
}

/**
 * The Persistence Engine for PHOS running entirely in the browser
 * (SDS Part 13). Owns backups, restore, import/export, storage
 * verification, and data reset. Contains no business logic and never
 * touches the Memory, Adaptive, or Analytics Engines.
 *
 * WHAT MOVED, AND WHAT DID NOT
 * ----------------------------
 * A backup is a snapshot of every store, held in the `backups` store
 * rather than a `.db` file with a manifest sidecar. The manifest itself
 * survives unchanged — application version, schema version, format
 * version, timestamp, checksum — because SDS Part 13's version
 * compatibility rules are about what a backup *claims*, not about where
 * the claim is written down.
 *
 * Every ordering guarantee the SQL engine established is kept:
 * verification precedes success, a safety backup precedes every restore
 * and every reset, and deletion runs children-first.
 *
 * THE PHASE 3 DEFECT CANNOT RECUR HERE
 * ------------------------------------
 * In the SQL build, backup history lived inside the database a restore
 * overwrote, so restoring rewound the list of backups and the safety
 * copy taken seconds earlier vanished from view. That was patched with
 * filesystem reconciliation. Here `writeSnapshot()` deliberately
 * excludes the `backups` store, so a restore cannot touch backup
 * history at all and there is nothing to reconcile.
 *
 * WHAT THE USER LOSES, STATED PLAINLY
 * -----------------------------------
 * Backups live in the same origin storage as the data they protect.
 * They survive a restore, a reset, a crash and a reinstall of the app —
 * but not "clear site data", which takes everything at once. Export to
 * a file is the only backup that outlives the browser profile, and the
 * guide says so.
 */
export class BrowserPersistenceEngine implements IBrowserPersistenceEngine {
  constructor(private readonly deps: BrowserPersistenceEngineDependencies) {}

  async createBackup(): Promise<BackupCreationResult> {
    const correlationId = generateCorrelationId();

    // Step 1: Validate database integrity.
    const dbCheck = await this.verifyDatabase();
    if (!dbCheck.healthy) {
      throw new BackupCreationError(
        "Refusing to create a backup of an unhealthy database.",
        correlationId,
        { issues: dbCheck.issues },
      );
    }

    // Step 2: Flush pending writes.
    // Every repository write completes its IndexedDB transaction before
    // its promise resolves, so there is never buffered work outstanding
    // at this point. Documented rather than silently skipped, as in the
    // SQL implementation.

    const createdAt = new Date();
    const filename = `phos-backup-${formatTimestampForFilename(createdAt)}.json`;

    let metadata: BackupMetadata;
    try {
      // Steps 3 and 4: the repository captures the snapshot and writes
      // its manifest in one operation, so the metadata can never
      // describe a snapshot other than the one stored beside it.
      metadata = await this.deps.backupRepository.recordBackup({
        filename,
        createdAt,
        // Recomputed from the captured snapshot; see `recordBackup`.
        fileSizeBytes: 0,
        // The format version is stamped by the repository, which already
        // writes `backupFormatVersion` into every snapshot manifest —
        // stamping a second copy here would be two sources for one fact.
        applicationVersion: this.deps.applicationVersion,
      });
    } catch (error) {
      throw new BackupCreationError("Failed to create backup.", correlationId, {
        cause: describeError(error),
      });
    }

    // Step 5: Verify backup integrity, by reading back what was just
    // written and re-hashing it. A backup is never reported successful
    // until this passes, and a failed one is discarded rather than left
    // in the list looking usable.
    const verification = await this.verifyBackup(metadata.id);
    if (!verification.verified) {
      await this.deps.backupRepository.deleteBackupRecord(metadata.id);
      throw new BackupVerificationError(
        "Newly created backup failed integrity verification and was discarded.",
        correlationId,
        { issues: verification.issues },
      );
    }

    // Step 6: Backup history is the repository's own record, written above.
    return { metadata, verified: true };
  }

  async restoreBackup(backupId: string): Promise<RestoreResult> {
    const correlationId = generateCorrelationId();

    // Step 1: Validate backup compatibility (existence + version).
    const record = await this.deps.backupRepository.findRecord(backupId);
    if (!record) {
      throw new RestoreFailedError(`No backup found with id "${backupId}".`, correlationId);
    }
    /*
     * Judged on the data *format*, not the application version.
     *
     * This compared version strings with `!==`, which quietly made every
     * backup unrestorable the moment any release shipped — including the
     * safety backup taken automatically before a full reset, whose only
     * purpose is to make an accidental wipe recoverable. The user would
     * have discovered it at the worst possible moment.
     */
    if (!canReadFormat(record.manifest.backupFormatVersion)) {
      throw new RestoreFailedError(
        `This backup was written in data format ${record.manifest.backupFormatVersion}, which this version of PHOS (format ${EXPORT_FORMAT_VERSION}) cannot read. Update PHOS and try again.`,
        correlationId,
      );
    }

    // Step 2: Verify backup integrity.
    const verification = await verifyRecord(record);
    if (!verification.verified) {
      throw new RestoreFailedError(
        "Backup failed integrity verification; refusing to restore.",
        correlationId,
        { issues: verification.issues },
      );
    }

    // Step 3: Take a safety backup before overwriting anything, so the
    // current data is never lost without a recovery path — including
    // when the user restores the wrong backup.
    const safetyBackup = await this.createBackup();

    try {
      // Step 4: Restore. `writeSnapshot` replaces every store except
      // `backups`, in one transaction, so a failure mid-way rolls the
      // whole thing back rather than leaving a half-restored database.
      await writeSnapshot(record.snapshot);

      // Step 5: Post-restore validation.
      const postRestoreCheck = await this.verifyDatabase();
      if (!postRestoreCheck.healthy) {
        throw new RestoreFailedError(
          "Post-restore validation failed. The pre-restore safety backup is available for recovery.",
          correlationId,
          { issues: postRestoreCheck.issues, safetyBackupId: safetyBackup.metadata.id },
        );
      }

      // Step 6: Reload repositories. Nothing to do — the browser
      // repositories hold no cached rows, only a cached connection to a
      // database that was never closed.

      // Step 7: Return completion status.
      return {
        restoredFromBackupId: backupId,
        safetyBackupId: safetyBackup.metadata.id,
        verified: true,
        completedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof RestoreFailedError) throw error;
      throw new RestoreFailedError("Failed to restore backup.", correlationId, {
        cause: describeError(error),
        safetyBackupId: safetyBackup.metadata.id,
      });
    }
  }

  async listBackups(): Promise<readonly BackupMetadata[]> {
    return this.deps.backupRepository.findAllBackups();
  }

  async deleteBackup(backupId: string): Promise<void> {
    const correlationId = generateCorrelationId();
    const record = await this.deps.backupRepository.findRecord(backupId);
    if (!record) {
      throw new RestoreFailedError(`No backup found with id "${backupId}".`, correlationId);
    }
    await this.deps.backupRepository.deleteBackupRecord(backupId);
  }

  async exportData(): Promise<BrowserExportResult> {
    const correlationId = generateCorrelationId();
    try {
      const [pages, sessions, recallEvents, settings] = await Promise.all([
        this.deps.pageRepository.findAll(),
        this.deps.sessionRepository.findBetweenDates(EPOCH_START, FAR_FUTURE),
        this.deps.recallEventRepository.findBetweenDates(EPOCH_START, FAR_FUTURE),
        this.deps.settingsRepository.getSettings(),
      ]);

      const sessionItemLists = await Promise.all(
        sessions.map((session) => this.deps.sessionRepository.findSessionItems(session.id)),
      );

      const exportedAt = new Date();
      const content: PhosExportData = {
        applicationVersion: this.deps.applicationVersion,
        formatVersion: EXPORT_FORMAT_VERSION,
        exportedAt: exportedAt.toISOString(),
        pages,
        sessions,
        sessionItems: sessionItemLists.flat(),
        recallEvents,
        settings,
      };

      const filename = `phos-export-${formatTimestampForFilename(exportedAt)}.json`;
      // The size the user will see on disk once the download lands,
      // formatted exactly as `downloadJson` writes it.
      const fileSizeBytes = byteLength(JSON.stringify(content, null, 2));

      return { filename, fileSizeBytes, exportedAt, content };
    } catch (error) {
      throw new ExportFailedError("Failed to export data.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  /**
   * Imports a previously exported PHOS data file, given its contents.
   *
   * Known limitations, documented rather than silently assumed — both
   * carried over unchanged from the SQL implementation, because they
   * come from SDS Part 9's repository contracts rather than from the
   * storage engine:
   * - No cross-repository transaction wrapper exists, so the apply step
   *   is best-effort sequential rather than atomically all-or-nothing.
   * - Sessions, SessionItems and RecallEvents are recreated fresh, so
   *   importing the same file twice duplicates historical records.
   */
  async importData(fileContents: string): Promise<ImportResult> {
    const correlationId = generateCorrelationId();
    const validationErrors: string[] = [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContents);
    } catch {
      return { success: false, validationErrors: ["File is not valid JSON."], importedAt: null };
    }

    const candidate = parsed as Partial<PhosExportData>;
    if (typeof candidate.applicationVersion !== "string") {
      validationErrors.push('Missing or invalid "applicationVersion".');
    }
    // See `restoreBackup()`: compatibility is a property of the data
    // format, and files older than this field are all format 1.
    if (!canReadFormat(candidate.formatVersion)) {
      validationErrors.push(
        `This file was written in data format ${candidate.formatVersion}, which this version of PHOS (format ${EXPORT_FORMAT_VERSION}) cannot read. Update PHOS and try again.`,
      );
    }
    if (!Array.isArray(candidate.pages)) validationErrors.push('Missing or invalid "pages".');
    if (!Array.isArray(candidate.sessions)) validationErrors.push('Missing or invalid "sessions".');
    if (!Array.isArray(candidate.sessionItems)) {
      validationErrors.push('Missing or invalid "sessionItems".');
    }
    if (!Array.isArray(candidate.recallEvents)) {
      validationErrors.push('Missing or invalid "recallEvents".');
    }
    if (!candidate.settings || typeof candidate.settings !== "object") {
      validationErrors.push('Missing or invalid "settings".');
    }

    // Invalid imports fail before modifying the existing database.
    if (validationErrors.length > 0) {
      return { success: false, validationErrors, importedAt: null };
    }

    const data = candidate as PhosExportData;

    try {
      for (const page of data.pages) {
        const existing = await this.deps.pageRepository.findByPageNumber(page.pageNumber);
        if (!existing) continue;

        await this.deps.pageRepository.updateMemoryState(existing.id, page.memoryState);
        await this.deps.pageRepository.updateMemoryVariables(existing.id, {
          memoryStrength: page.memoryStrength,
          memoryStability: page.memoryStability,
          difficulty: page.difficulty,
        });
        if (page.lastReviewedAt) {
          await this.deps.pageRepository.updateReviewTimestamps(existing.id, {
            lastReviewedAt: new Date(page.lastReviewedAt),
            ...(page.lastSuccessfulRecallAt
              ? { lastSuccessfulRecallAt: new Date(page.lastSuccessfulRecallAt) }
              : {}),
          });
        }
      }

      const sessionIdRemap = new Map<string, string>();
      for (const session of data.sessions) {
        const created = await this.deps.sessionRepository.create({
          sessionType: session.sessionType,
        });
        sessionIdRemap.set(session.id, created.id);
        if (session.completedAt) {
          await this.deps.sessionRepository.complete(created.id);
        }
      }

      for (const item of data.sessionItems) {
        const remappedSessionId = sessionIdRemap.get(item.sessionId);
        if (!remappedSessionId) continue;
        await this.deps.sessionRepository.addSessionItem({
          sessionId: remappedSessionId,
          pageId: item.pageId,
          order: item.order,
        });
      }

      for (const event of data.recallEvents) {
        const remappedSessionId = sessionIdRemap.get(event.sessionId) ?? event.sessionId;
        await this.deps.recallEventRepository.create({
          pageId: event.pageId,
          sessionId: remappedSessionId,
          timestamp: new Date(event.timestamp),
          successfulRecall: event.successfulRecall,
          confidence: event.confidence,
          durationSeconds: event.durationSeconds,
        });
      }

      await this.deps.settingsRepository.updatePersonalization({
        theme: data.settings.theme,
        ayahRotationFrequency: data.settings.ayahRotationFrequency,
      });

      return { success: true, validationErrors: [], importedAt: new Date() };
    } catch (error) {
      throw new ImportValidationError(
        "Import validation passed but applying the data failed.",
        correlationId,
        { cause: describeError(error) },
      );
    }
  }

  async verifyBackup(backupId: string): Promise<BackupVerificationResult> {
    const record = await this.deps.backupRepository.findRecord(backupId);
    if (!record) {
      return {
        backupId,
        verified: false,
        issues: [`No backup found with id "${backupId}".`],
        checkedAt: new Date(),
      };
    }
    return verifyRecord(record);
  }

  /**
   * Checks that the live database is in a state worth backing up.
   *
   * The SQL version's first check — that the database file exists and
   * is non-empty — has no browser equivalent, so it is replaced by the
   * nearest true statement about this store: that the Mushaf is
   * complete. A database missing pages is one seeding never finished
   * on, and backing it up would preserve the damage.
   */
  async verifyDatabase(): Promise<DatabaseVerificationResult> {
    const issues: string[] = [];

    try {
      const pages = await this.deps.pageRepository.findAll();
      if (pages.length !== TOTAL_MUSHAF_PAGES) {
        issues.push(
          `Expected ${TOTAL_MUSHAF_PAGES} pages but found ${pages.length}; the database is incompletely seeded.`,
        );
      }
    } catch (error) {
      issues.push(`Pages could not be read: ${describeError(error)}`);
    }

    try {
      await this.deps.settingsRepository.getSettings();
    } catch (error) {
      issues.push(`Database could not be queried: ${describeError(error)}`);
    }

    return { healthy: issues.length === 0, issues, checkedAt: new Date() };
  }

  /**
   * `databaseSizeBytes` is the serialized size of PHOS's own data, not
   * the browser's total origin usage.
   *
   * `navigator.storage.estimate()` would report the latter, which
   * includes the cached application shell and rounds heavily for
   * privacy — a number the user could not reconcile with anything they
   * did. This one answers "how much have I recorded", which is the
   * question the screen is actually asking.
   */
  async getStorageStatistics(): Promise<StorageStatistics> {
    const [pages, sessions, recallEvents, backups, exported] = await Promise.all([
      this.deps.pageRepository.findAll(),
      this.deps.sessionRepository.findBetweenDates(EPOCH_START, FAR_FUTURE),
      this.deps.recallEventRepository.findBetweenDates(EPOCH_START, FAR_FUTURE),
      this.deps.backupRepository.findAllBackups(),
      this.exportData(),
    ]);

    return {
      databaseSizeBytes: exported.fileSizeBytes,
      totalPages: pages.length,
      totalSessions: (sessions as readonly Session[]).length,
      totalRecallEvents: (recallEvents as readonly RecallEvent[]).length,
      backupCount: backups.length,
    };
  }

  /**
   * Deletes every recall event and session and returns all 604 pages to
   * their never-studied state, after first taking a verified backup.
   *
   * Both ordering rules from the SQL implementation are kept, and both
   * still matter:
   *
   * 1. The backup is taken *first*, and `createBackup()` throws if it
   *    cannot verify what it wrote. If the backup fails, nothing is
   *    deleted.
   * 2. Rows are removed children-first (recall events → session items →
   *    sessions). IndexedDB has no foreign keys to reject a wrong
   *    order, which makes the order more important here, not less: the
   *    store would silently accept sessions being deleted out from
   *    under their events and leave dangling references behind.
   *
   * Pages are reset, not deleted — see `IPageRepository.resetAllProgress()`.
   *
   * Exams are deleted too. They are records of what happened, not
   * preferences, so they belong on this side of the line alongside
   * sessions and recall events. Leaving them behind was worse than
   * untidy: a *scheduled* exam would survive a full wipe and put the
   * Adaptive Engine into exam mode over a scope where nothing was
   * memorized any more, producing an empty plan with no explanation.
   */
  async resetAllData(): Promise<DataResetResult> {
    const safetyBackup = await this.createBackup();

    const deletedRecallEvents = await this.deps.recallEventRepository.deleteAll();
    const deletedSessions = await this.deps.sessionRepository.deleteAllSessions();
    const resetPages = await this.deps.pageRepository.resetAllProgress();
    const deletedExams = (await this.deps.examRepository?.deleteAll()) ?? 0;

    return {
      safetyBackupId: safetyBackup.metadata.id,
      deletedRecallEvents,
      deletedSessions,
      deletedExams,
      resetPages,
      completedAt: new Date(),
    };
  }
}

/**
 * Re-hashes a stored snapshot and compares it to the manifest written
 * when the backup was taken.
 *
 * This is the browser's equivalent of checksumming the backup file, and
 * it tests the same thing: that what comes back out of storage is what
 * went in. The algorithm is named inside the recorded value, so a
 * snapshot hashed with the fallback is never compared against a
 * SHA-256 digest and mistaken for corrupt.
 */
async function verifyRecord(record: StoredBackup): Promise<BackupVerificationResult> {
  const issues: string[] = [];

  const serialized = serializeSnapshot(record.snapshot);
  if (serialized.length === 0) {
    issues.push("Backup contains no data.");
  }

  const actualChecksum = await computeChecksum(serialized);
  if (actualChecksum !== record.manifest.checksumSha256) {
    issues.push("Backup checksum does not match the recorded manifest checksum.");
  }

  return {
    backupId: record.id,
    verified: issues.length === 0,
    issues,
    checkedAt: new Date(),
  };
}

function formatTimestampForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
