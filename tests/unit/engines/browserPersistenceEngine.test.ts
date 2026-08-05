import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryState, SessionType, ConfidenceLevel } from "@/shared/types";
import { TOTAL_MUSHAF_PAGES } from "@/shared/constants";
import {
  BrowserBackupRepository,
  BrowserExamRepository,
  BrowserPageRepository,
  BrowserRecallEventRepository,
  BrowserSessionRepository,
  BrowserSettingsRepository,
  getDatabase,
  resetDatabaseConnection,
  seedIfEmpty,
} from "@/repositories/browser";
import { BrowserPersistenceEngine } from "@/engines/persistence/browser";
import { BackupCreationError, RestoreFailedError } from "@/engines/persistence";

const APPLICATION_VERSION = "0.1.0";

let engine: BrowserPersistenceEngine;
let exams: BrowserExamRepository;
let pages: BrowserPageRepository;
let sessions: BrowserSessionRepository;
let recallEvents: BrowserRecallEventRepository;
let backups: BrowserBackupRepository;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
  await seedIfEmpty();

  pages = new BrowserPageRepository();
  sessions = new BrowserSessionRepository();
  recallEvents = new BrowserRecallEventRepository();
  backups = new BrowserBackupRepository();

  exams = new BrowserExamRepository();
  engine = new BrowserPersistenceEngine({
    pageRepository: pages,
    recallEventRepository: recallEvents,
    sessionRepository: sessions,
    settingsRepository: new BrowserSettingsRepository(),
    backupRepository: backups,
    examRepository: exams,
    applicationVersion: APPLICATION_VERSION,
  });
});

/** Records one page as studied, so a backup has something to distinguish it. */
async function markPageStudied(pageNumber: number, state: MemoryState): Promise<void> {
  const page = await pages.findByPageNumber(pageNumber);
  if (!page) throw new Error(`Page ${pageNumber} is missing.`);
  await pages.updateMemoryState(page.id, state);
  await pages.updateMemoryVariables(page.id, { memoryStrength: 0.8, memoryStability: 3 });
}

describe("createBackup", () => {
  it("captures the current data and verifies what it wrote", async () => {
    await markPageStudied(1, MemoryState.Growing);

    const result = await engine.createBackup();

    expect(result.verified).toBe(true);
    expect(result.metadata.applicationVersion).toBe(APPLICATION_VERSION);
    expect(result.metadata.fileSizeBytes).toBeGreaterThan(0);

    const record = await backups.findRecord(result.metadata.id);
    expect(record?.snapshot.pages).toHaveLength(TOTAL_MUSHAF_PAGES);
    expect(record?.snapshot.pages.find((page) => page.pageNumber === 1)?.memoryState).toBe(
      MemoryState.Growing,
    );
  });

  it("refuses to back up a database that is not fully seeded", async () => {
    // A half-seeded database is one whose seeding never finished.
    // Backing it up would preserve the damage as if it were progress.
    const db = await getDatabase();
    const page = await db.getFromIndex("pages", "pageNumber", 300);
    await db.delete("pages", page!.id);

    await expect(engine.createBackup()).rejects.toBeInstanceOf(BackupCreationError);
    expect(await engine.listBackups()).toHaveLength(0);
  });

  it("discards a backup whose stored snapshot does not match its manifest", async () => {
    const created = await engine.createBackup();

    // Corrupt the stored snapshot the way a failing store would, and
    // confirm verification is what catches it rather than the write.
    const db = await getDatabase();
    const record = (await db.get("backups", created.metadata.id))!;
    record.snapshot.pages = record.snapshot.pages.slice(0, 10);
    await db.put("backups", record);

    const verification = await engine.verifyBackup(created.metadata.id);
    expect(verification.verified).toBe(false);
    expect(verification.issues).toContain(
      "Backup checksum does not match the recorded manifest checksum.",
    );
  });
});

describe("restoreBackup", () => {
  it("returns the data to the state the backup captured", async () => {
    await markPageStudied(1, MemoryState.Growing);
    const backup = await engine.createBackup();

    // Work done after the backup, which the restore must undo.
    await markPageStudied(2, MemoryState.Stable);
    const session = await sessions.create({ sessionType: SessionType.Sabaq });
    await recallEvents.create({
      pageId: (await pages.findByPageNumber(2))!.id,
      sessionId: session.id,
      timestamp: new Date(),
      successfulRecall: true,
      confidence: ConfidenceLevel.High,
      durationSeconds: 30,
    });

    const result = await engine.restoreBackup(backup.metadata.id);

    expect(result.verified).toBe(true);
    expect(result.restoredFromBackupId).toBe(backup.metadata.id);
    expect((await pages.findByPageNumber(1))?.memoryState).toBe(MemoryState.Growing);
    expect((await pages.findByPageNumber(2))?.memoryState).toBe(MemoryState.Unseen);
    expect(await recallEvents.findBetweenDates(new Date(0), new Date("2999-01-01"))).toHaveLength(
      0,
    );
  });

  it("keeps the safety backup and the restored one both listed afterwards", async () => {
    // The Phase 3 defect: backup history lived inside the database the
    // restore overwrote, so the safety copy taken seconds earlier
    // disappeared from the list at the exact moment it was needed.
    // `writeSnapshot` excludes the backups store, so it cannot recur.
    const backup = await engine.createBackup();
    await markPageStudied(3, MemoryState.Growing);

    const result = await engine.restoreBackup(backup.metadata.id);

    const listed = (await engine.listBackups()).map((entry) => entry.id);
    expect(listed).toContain(backup.metadata.id);
    expect(listed).toContain(result.safetyBackupId);
  });

  it("the safety backup restores the state that the restore replaced", async () => {
    const original = await engine.createBackup();
    await markPageStudied(4, MemoryState.Stable);

    const result = await engine.restoreBackup(original.metadata.id);
    expect((await pages.findByPageNumber(4))?.memoryState).toBe(MemoryState.Unseen);

    await engine.restoreBackup(result.safetyBackupId);
    expect((await pages.findByPageNumber(4))?.memoryState).toBe(MemoryState.Stable);
  });

  it("refuses a backup written by a different application version", async () => {
    const backup = await engine.createBackup();

    const db = await getDatabase();
    const record = (await db.get("backups", backup.metadata.id))!;
    record.manifest.applicationVersion = "0.0.1";
    await db.put("backups", record);

    await expect(engine.restoreBackup(backup.metadata.id)).rejects.toBeInstanceOf(
      RestoreFailedError,
    );
  });

  it("refuses a backup that fails its checksum, without taking a safety backup", async () => {
    const backup = await engine.createBackup();

    const db = await getDatabase();
    const record = (await db.get("backups", backup.metadata.id))!;
    record.snapshot.settings = null;
    await db.put("backups", record);

    await expect(engine.restoreBackup(backup.metadata.id)).rejects.toBeInstanceOf(
      RestoreFailedError,
    );
    // Verification precedes the safety backup, so a refused restore
    // leaves no stray copy behind.
    expect(await engine.listBackups()).toHaveLength(1);
  });

  it("refuses an id that does not exist", async () => {
    await expect(engine.restoreBackup("no-such-backup")).rejects.toBeInstanceOf(RestoreFailedError);
  });
});

describe("export and import", () => {
  it("round-trips memorization progress through an export", async () => {
    await markPageStudied(5, MemoryState.Stable);

    const exported = await engine.exportData();
    expect(exported.filename).toMatch(/^phos-export-.*\.json$/);
    expect(exported.content.pages).toHaveLength(TOTAL_MUSHAF_PAGES);
    expect(exported.fileSizeBytes).toBeGreaterThan(0);

    // A fresh database, as if the file were opened on another device.
    globalThis.indexedDB = new IDBFactory();
    resetDatabaseConnection();
    await seedIfEmpty();
    expect((await pages.findByPageNumber(5))?.memoryState).toBe(MemoryState.Unseen);

    const result = await engine.importData(JSON.stringify(exported.content));

    expect(result.success).toBe(true);
    expect(result.validationErrors).toEqual([]);
    const restored = await pages.findByPageNumber(5);
    expect(restored?.memoryState).toBe(MemoryState.Stable);
    expect(restored?.memoryStrength).toBeCloseTo(0.8);
  });

  it("rejects a file from a different application version without writing anything", async () => {
    await markPageStudied(6, MemoryState.Growing);
    const exported = await engine.exportData();

    const foreign = { ...exported.content, applicationVersion: "9.9.9" };
    const result = await engine.importData(JSON.stringify(foreign));

    expect(result.success).toBe(false);
    expect(result.validationErrors[0]).toContain("9.9.9");
    expect(result.importedAt).toBeNull();
    // Unchanged: the invalid import failed before touching the data.
    expect((await pages.findByPageNumber(6))?.memoryState).toBe(MemoryState.Growing);
  });

  it("rejects a file that is not JSON at all", async () => {
    const result = await engine.importData("this is not a PHOS export");
    expect(result.success).toBe(false);
    expect(result.validationErrors).toEqual(["File is not valid JSON."]);
  });

  it("names every missing top-level section rather than only the first", async () => {
    const result = await engine.importData(
      JSON.stringify({ applicationVersion: APPLICATION_VERSION }),
    );
    expect(result.success).toBe(false);
    expect(result.validationErrors).toHaveLength(5);
  });
});

describe("resetAllData", () => {
  it("erases history, resets every page, and leaves a recoverable backup", async () => {
    await markPageStudied(7, MemoryState.Growing);
    const session = await sessions.create({ sessionType: SessionType.Sabaq });
    await sessions.addSessionItem({
      sessionId: session.id,
      pageId: (await pages.findByPageNumber(7))!.id,
      order: 0,
    });
    await recallEvents.create({
      pageId: (await pages.findByPageNumber(7))!.id,
      sessionId: session.id,
      timestamp: new Date(),
      successfulRecall: true,
      confidence: ConfidenceLevel.High,
      durationSeconds: 25,
    });

    const result = await engine.resetAllData();

    expect(result.deletedRecallEvents).toBe(1);
    expect(result.deletedSessions).toBe(1);
    expect(result.resetPages).toBe(TOTAL_MUSHAF_PAGES);
    expect((await pages.findByPageNumber(7))?.memoryState).toBe(MemoryState.Unseen);

    // The safety backup is taken before anything is deleted, so it
    // still holds the work the reset removed.
    await engine.restoreBackup(result.safetyBackupId);
    expect((await pages.findByPageNumber(7))?.memoryState).toBe(MemoryState.Growing);
    expect(await recallEvents.findBetweenDates(new Date(0), new Date("2999-01-01"))).toHaveLength(
      1,
    );
  });
});

describe("getStorageStatistics", () => {
  it("counts what the user has actually recorded", async () => {
    await markPageStudied(8, MemoryState.Growing);
    const session = await sessions.create({ sessionType: SessionType.Sabaq });
    await recallEvents.create({
      pageId: (await pages.findByPageNumber(8))!.id,
      sessionId: session.id,
      timestamp: new Date(),
      successfulRecall: false,
      confidence: ConfidenceLevel.Low,
      durationSeconds: 40,
    });
    await engine.createBackup();

    const stats = await engine.getStorageStatistics();

    expect(stats.totalPages).toBe(TOTAL_MUSHAF_PAGES);
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalRecallEvents).toBe(1);
    expect(stats.backupCount).toBe(1);
    expect(stats.databaseSizeBytes).toBeGreaterThan(0);
  });
});

describe("deleteBackup", () => {
  it("removes the backup and refuses an id that does not exist", async () => {
    const backup = await engine.createBackup();
    await engine.deleteBackup(backup.metadata.id);
    expect(await engine.listBackups()).toHaveLength(0);

    await expect(engine.deleteBackup(backup.metadata.id)).rejects.toBeInstanceOf(
      RestoreFailedError,
    );
  });
});

describe("what a full reset takes with it", () => {
  it("removes exams, which are records rather than preferences", async () => {
    /*
     * Missed when the exams store was added. Leaving them behind was
     * worse than untidy: a *scheduled* exam would survive the wipe and
     * put the Adaptive Engine into exam mode over a scope where nothing
     * was memorized any more, producing an empty plan with nothing to
     * explain it.
     */
    await exams.recordPast({ stage: 1, juzNumbers: [30], examDate: null });
    await exams.create({
      stage: 2,
      juzNumbers: [28, 29, 30],
      examDate: new Date(Date.now() + 10 * 86_400_000),
      includeNewMemorization: false,
    });

    const result = await engine.resetAllData();

    expect(result.deletedExams).toBe(2);
    expect(await exams.findAll()).toHaveLength(0);
    // And nothing is left that could still be treated as active.
    expect(await exams.findActive(new Date())).toBeNull();
  });

  it("puts exams in the safety backup, so a reset stays undoable", async () => {
    await exams.recordPast({ stage: 1, juzNumbers: [30], examDate: null });

    const result = await engine.resetAllData();
    await engine.restoreBackup(result.safetyBackupId);

    expect(await exams.findAll()).toHaveLength(1);
  });

  it("reports zero rather than failing when no exams exist", async () => {
    expect((await engine.resetAllData()).deletedExams).toBe(0);
  });
});
