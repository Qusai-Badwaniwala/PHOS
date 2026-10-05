import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { openDB } from "idb";
import {
  ConfidenceLevel,
  ExamStatus,
  MemorizationOrder,
  MemoryState,
  RevisionMode,
  SessionType,
} from "@/shared/types";
import { TOTAL_MUSHAF_PAGES } from "@/shared/constants";
import {
  BrowserBackupRepository,
  BrowserExamRepository,
  BrowserPageRepository,
  BrowserRecallEventRepository,
  BrowserRoadmapRepository,
  BrowserSessionRepository,
  BrowserSettingsRepository,
  byteLength,
  computeChecksum,
  getDatabase,
  readSnapshot,
  resetDatabaseConnection,
  seedIfEmpty,
  serializeSnapshot,
  writeSnapshot,
} from "@/repositories/browser";

/**
 * The browser repositories must behave exactly as the Prisma ones do —
 * that equivalence is what lets the five engines and their ~200 tests
 * carry over untouched. These exercise the contracts the engines
 * actually depend on, against a real IndexedDB implementation.
 */
beforeEach(async () => {
  // A fresh in-memory database per test, and a fresh cached connection
  // to go with it, so no test can see another's data.
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
  await seedIfEmpty();
});

describe("seeding", () => {
  it("creates the whole Mushaf and the singleton Settings row", async () => {
    const pages = await new BrowserPageRepository().findAll();
    expect(pages).toHaveLength(TOTAL_MUSHAF_PAGES);
    expect(pages[0]?.pageNumber).toBe(1);
    expect(pages[TOTAL_MUSHAF_PAGES - 1]?.pageNumber).toBe(TOTAL_MUSHAF_PAGES);
  });

  it("assigns the correct Juz to boundary pages", async () => {
    const repository = new BrowserPageRepository();
    expect((await repository.findByPageNumber(1))?.juzNumber).toBe(1);
    expect((await repository.findByPageNumber(21))?.juzNumber).toBe(1);
    expect((await repository.findByPageNumber(22))?.juzNumber).toBe(2);
    // Juz 30 runs 582–604, agreeing with the Surah table.
    expect((await repository.findByPageNumber(582))?.juzNumber).toBe(30);
    expect((await repository.findByPageNumber(604))?.juzNumber).toBe(30);
  });

  it("is idempotent and never overwrites progress", async () => {
    const repository = new BrowserPageRepository();
    const page = await repository.findByPageNumber(1);
    await repository.updateMemoryState(page!.id, MemoryState.Growing);

    await seedIfEmpty();

    const after = await repository.findByPageNumber(1);
    expect(after?.memoryState).toBe(MemoryState.Growing);
    expect(await repository.findAll()).toHaveLength(TOTAL_MUSHAF_PAGES);
  });
});

describe("BrowserPageRepository", () => {
  it("round-trips memory variables and dates", async () => {
    const repository = new BrowserPageRepository();
    const page = (await repository.findByPageNumber(5))!;
    const when = new Date("2026-08-01T10:00:00.000Z");

    await repository.updateMemoryVariables(page.id, {
      memoryStrength: 0.6,
      memoryStability: 3,
      difficulty: 0.5,
    });
    await repository.updateReviewTimestamps(page.id, {
      lastReviewedAt: when,
      lastSuccessfulRecallAt: when,
      firstStudiedAt: when,
    });

    const updated = (await repository.findById(page.id))!;
    expect(updated.memoryStrength).toBeCloseTo(0.6);
    expect(updated.memoryStability).toBe(3);
    // Dates must come back as Dates, not the ISO strings they are stored as.
    expect(updated.lastReviewedAt).toBeInstanceOf(Date);
    expect(updated.lastReviewedAt?.toISOString()).toBe(when.toISOString());
    expect(updated.firstStudiedAt?.toISOString()).toBe(when.toISOString());
  });

  it("finds by Juz and by memory state", async () => {
    const repository = new BrowserPageRepository();
    expect(await repository.findByJuz(30)).toHaveLength(23);

    const page = (await repository.findByPageNumber(100))!;
    await repository.updateMemoryState(page.id, MemoryState.Stable);
    const stable = await repository.findByMemoryState(MemoryState.Stable);
    expect(stable.map((p) => p.pageNumber)).toEqual([100]);
  });

  it("resets every page to its pristine state", async () => {
    const repository = new BrowserPageRepository();
    const page = (await repository.findByPageNumber(7))!;
    await repository.updateMemoryState(page.id, MemoryState.Growing);
    await repository.updateReviewTimestamps(page.id, { lastReviewedAt: new Date() });

    const count = await repository.resetAllProgress();

    expect(count).toBe(TOTAL_MUSHAF_PAGES);
    const after = (await repository.findById(page.id))!;
    expect(after.memoryState).toBe(MemoryState.Unseen);
    expect(after.lastReviewedAt).toBeNull();
    expect(after.firstStudiedAt).toBeNull();
  });
});

describe("BrowserSessionRepository", () => {
  it("tracks the active session by persisted state", async () => {
    const repository = new BrowserSessionRepository();
    expect(await repository.findActive()).toBeNull();

    const session = await repository.create({ sessionType: SessionType.Sabaq });
    expect((await repository.findActive())?.id).toBe(session.id);

    await repository.complete(session.id);
    expect(await repository.findActive()).toBeNull();
    expect((await repository.findLastCompleted())?.id).toBe(session.id);
  });

  it("computes a non-negative duration on completion", async () => {
    const repository = new BrowserSessionRepository();
    const session = await repository.create({ sessionType: SessionType.Sabqi });
    const completed = await repository.complete(session.id);

    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(completed.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it("upholds the (sessionId, pageId) uniqueness the SQL schema declared", async () => {
    const repository = new BrowserSessionRepository();
    const session = await repository.create({ sessionType: SessionType.Sabaq });

    await repository.addSessionItem({ sessionId: session.id, pageId: "page-1", order: 0 });
    await repository.addSessionItem({ sessionId: session.id, pageId: "page-1", order: 0 });

    expect(await repository.findSessionItems(session.id)).toHaveLength(1);
  });

  it("returns session items in order", async () => {
    const repository = new BrowserSessionRepository();
    const session = await repository.create({ sessionType: SessionType.Sabaq });

    await repository.addSessionItem({ sessionId: session.id, pageId: "page-c", order: 2 });
    await repository.addSessionItem({ sessionId: session.id, pageId: "page-a", order: 0 });
    await repository.addSessionItem({ sessionId: session.id, pageId: "page-b", order: 1 });

    const items = await repository.findSessionItems(session.id);
    expect(items.map((i) => i.pageId)).toEqual(["page-a", "page-b", "page-c"]);
  });

  it("deletes items before sessions, and reports how many sessions went", async () => {
    const repository = new BrowserSessionRepository();
    const session = await repository.create({ sessionType: SessionType.Sabaq });
    await repository.addSessionItem({ sessionId: session.id, pageId: "page-1", order: 0 });

    expect(await repository.deleteAllSessions()).toBe(1);
    expect(await repository.findSessionItems(session.id)).toHaveLength(0);
    expect(await repository.findLatest()).toBeNull();
  });
});

describe("BrowserRecallEventRepository", () => {
  it("records and finds events by page and session", async () => {
    const repository = new BrowserRecallEventRepository();
    await repository.create({
      pageId: "page-1",
      sessionId: "session-1",
      timestamp: new Date("2026-08-01T10:00:00.000Z"),
      successfulRecall: true,
      confidence: ConfidenceLevel.High,
      durationSeconds: 60,
    });

    expect(await repository.findByPage("page-1")).toHaveLength(1);
    expect(await repository.findBySession("session-1")).toHaveLength(1);
    const latest = await repository.findLatestForPage("page-1");
    expect(latest?.confidence).toBe(ConfidenceLevel.High);
    expect(latest?.timestamp).toBeInstanceOf(Date);
  });

  it("returns the most recent event for a page", async () => {
    const repository = new BrowserRecallEventRepository();
    for (const [day, confidence] of [
      ["01", ConfidenceLevel.Low],
      ["03", ConfidenceLevel.High],
      ["02", ConfidenceLevel.Medium],
    ] as const) {
      await repository.create({
        pageId: "page-1",
        sessionId: "session-1",
        timestamp: new Date(`2026-08-${day}T10:00:00.000Z`),
        successfulRecall: true,
        confidence,
        durationSeconds: 60,
      });
    }

    expect((await repository.findLatestForPage("page-1"))?.confidence).toBe(ConfidenceLevel.High);
  });

  it("filters by date range, inclusive of both bounds", async () => {
    const repository = new BrowserRecallEventRepository();
    for (const day of ["01", "05", "10"]) {
      await repository.create({
        pageId: "page-1",
        sessionId: "session-1",
        timestamp: new Date(`2026-08-${day}T10:00:00.000Z`),
        successfulRecall: true,
        confidence: ConfidenceLevel.Medium,
        durationSeconds: 60,
      });
    }

    const inRange = await repository.findBetweenDates(
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-05T23:59:59.000Z"),
    );
    expect(inRange).toHaveLength(2);
  });
});

describe("BrowserSettingsRepository", () => {
  it("keeps exactly one Settings row", async () => {
    const repository = new BrowserSettingsRepository();
    const first = await repository.getSettings();
    const second = await repository.getSettings();
    expect(second.id).toBe(first.id);
  });

  it("applies a partial preferences patch without blanking the rest", async () => {
    const repository = new BrowserSettingsRepository();
    await repository.updatePreferences({ dateFormat: "dmy", compactMode: true });
    await repository.updatePreferences({ reducedMotion: true });

    const settings = await repository.getSettings();
    expect(settings.dateFormat).toBe("dmy");
    expect(settings.compactMode).toBe(true);
    expect(settings.reducedMotion).toBe(true);
    expect(settings.timeFormat).toBe("12h");
  });

  it("records onboarding and stamps its completion", async () => {
    const repository = new BrowserSettingsRepository();
    const settings = await repository.completeOnboarding({
      memorizationLevel: "Intermediate" as never,
      pagesAlreadyMemorized: 23,
      dailyAvailableMinutes: 60,
      comfortableDailyPages: 1,
      followsExistingSchedule: false,
      revisionStartsImmediately: true,
      memorizationOrder: MemorizationOrder.Juz30First,
    });

    expect(settings.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(settings.memorizationOrder).toBe(MemorizationOrder.Juz30First);
    expect(settings.pagesAlreadyMemorized).toBe(23);
  });

  it("reads a record saved before goals existed, without breaking", async () => {
    /*
     * The one way a PHOS update can genuinely break someone already
     * using it. Every Settings record written before Phase 10 has no
     * goal keys at all, and IndexedDB returns exactly what was stored.
     *
     * Simulated by deleting the keys from the stored record, which is
     * precisely what such a record looks like on an existing user's
     * device.
     */
    const repository = new BrowserSettingsRepository();
    const before = await repository.getSettings();

    const db = await getDatabase();
    const record = (await db.get("settings", before.id))!;
    delete record.goalTargetPages;
    delete record.goalTargetDate;
    await db.put("settings", record);

    const settings = await repository.getSettings();

    // "No goal set" — not `undefined` leaking into the projection
    // arithmetic and producing a target date in 1970.
    expect(settings.goalTargetPages).toBeNull();
    expect(settings.goalTargetDate).toBeNull();
    // And the rest of their settings are untouched.
    expect(settings.dailyAvailableMinutes).toBe(before.dailyAvailableMinutes);
  });

  it("sets, replaces and clears a goal as one unit", async () => {
    const repository = new BrowserSettingsRepository();
    const target = new Date(2029, 2, 1);

    const set = await repository.updateGoal({ targetPages: 604, targetDate: target });
    expect(set.goalTargetPages).toBe(604);
    expect(set.goalTargetDate?.getTime()).toBe(target.getTime());

    const replaced = await repository.updateGoal({
      targetPages: 300,
      targetDate: new Date(2028, 0, 1),
    });
    expect(replaced.goalTargetPages).toBe(300);

    // Cleared together, so no date is ever left behind without a target.
    const cleared = await repository.updateGoal(null);
    expect(cleared.goalTargetPages).toBeNull();
    expect(cleared.goalTargetDate).toBeNull();
  });

  it("keeps the user's goal through a settings reset", async () => {
    // A goal is the user's own stated intention. "Reset Settings"
    // restores display preferences; deleting something they chose for
    // themselves exceeds what that label promises.
    const repository = new BrowserSettingsRepository();
    await repository.updateGoal({ targetPages: 604, targetDate: new Date(2029, 2, 1) });

    const reset = await repository.resetToDefaults();

    expect(reset.goalTargetPages).toBe(604);
  });

  it("resets preferences but preserves onboarding and memorization order", async () => {
    const repository = new BrowserSettingsRepository();
    await repository.completeOnboarding({
      memorizationLevel: "Intermediate" as never,
      pagesAlreadyMemorized: 23,
      dailyAvailableMinutes: 60,
      comfortableDailyPages: 1,
      followsExistingSchedule: false,
      revisionStartsImmediately: true,
      memorizationOrder: MemorizationOrder.Juz30First,
    });
    await repository.updatePreferences({ compactMode: true });

    const reset = await repository.resetToDefaults();

    expect(reset.compactMode).toBe(false);
    expect(reset.onboardingCompletedAt).not.toBeNull();
    expect(reset.memorizationOrder).toBe(MemorizationOrder.Juz30First);
  });
});

describe("BrowserRoadmapRepository", () => {
  it("creates all 30 entries lazily on first read", async () => {
    const entries = await new BrowserRoadmapRepository().findAll();
    expect(entries).toHaveLength(30);
    expect(entries[0]?.juzNumber).toBe(1);
    expect(entries[29]?.juzNumber).toBe(30);
  });

  it("pauses and resumes a Juz", async () => {
    const repository = new BrowserRoadmapRepository();
    await repository.updateEntry(30, { paused: true });
    expect((await repository.findAll()).find((e) => e.juzNumber === 30)?.paused).toBe(true);

    await repository.updateEntry(30, { paused: false });
    expect((await repository.findAll()).find((e) => e.juzNumber === 30)?.paused).toBe(false);
  });

  it("replaces a custom order and can reset it", async () => {
    const repository = new BrowserRoadmapRepository();
    const reversed = Array.from({ length: 30 }, (_, i) => 30 - i);
    await repository.replaceCustomOrder(reversed);

    const entries = await repository.findAll();
    expect(entries.find((e) => e.juzNumber === 30)?.position).toBe(0);

    await repository.updateEntry(5, { paused: true });
    const reset = await repository.resetToDefaults();
    expect(reset.find((e) => e.juzNumber === 30)?.position).toBe(29);
    expect(reset.every((e) => !e.paused)).toBe(true);
  });
});

describe("BrowserBackupRepository", () => {
  it("captures a snapshot alongside the metadata", async () => {
    const pages = new BrowserPageRepository();
    const page = (await pages.findByPageNumber(1))!;
    await pages.updateMemoryState(page.id, MemoryState.Growing);

    const backups = new BrowserBackupRepository();
    const metadata = await backups.recordBackup({
      filename: "phos-backup-test.json",
      createdAt: new Date(),
      fileSizeBytes: 1024,
      applicationVersion: "0.1.0",
    });

    const record = await backups.findRecord(metadata.id);
    expect(record).not.toBeNull();
    expect(record!.snapshot.pages).toHaveLength(TOTAL_MUSHAF_PAGES);
    expect(record!.snapshot.pages.find((page) => page.pageNumber === 1)?.memoryState).toBe(
      MemoryState.Growing,
    );
  });

  it("records a manifest whose checksum matches the snapshot it stored", async () => {
    const backups = new BrowserBackupRepository();
    const metadata = await backups.recordBackup({
      filename: "phos-backup-test.json",
      createdAt: new Date(),
      fileSizeBytes: 0,
      applicationVersion: "0.1.0",
    });

    const record = (await backups.findRecord(metadata.id))!;
    expect(record.manifest.checksumSha256).toBe(
      await computeChecksum(serializeSnapshot(record.snapshot)),
    );
    // The metadata's size describes the snapshot actually captured,
    // not whatever the caller guessed before it existed.
    expect(metadata.fileSizeBytes).toBe(byteLength(serializeSnapshot(record.snapshot)));
  });

  it("lists backups newest first, and deletes one", async () => {
    const backups = new BrowserBackupRepository();
    for (const day of ["01", "03", "02"]) {
      await backups.recordBackup({
        filename: `backup-${day}.json`,
        createdAt: new Date(`2026-08-${day}T10:00:00.000Z`),
        fileSizeBytes: 10,
        applicationVersion: "0.1.0",
      });
    }

    const all = await backups.findAllBackups();
    expect(all.map((b) => b.filename)).toEqual([
      "backup-03.json",
      "backup-02.json",
      "backup-01.json",
    ]);
    expect((await backups.findLatestBackup())?.filename).toBe("backup-03.json");

    await backups.deleteBackupRecord(all[0]!.id);
    expect(await backups.findAllBackups()).toHaveLength(2);
  });
});

/**
 * Exams (Phase 11), including the version 1 → 2 upgrade.
 *
 * The upgrade runs against a database that already holds somebody's
 * entire Hifz record, on their own device, with no migration to run and
 * nobody to notice if it went wrong. That makes "it only adds" a
 * property worth testing directly rather than reading off the code.
 */
describe("exams", () => {
  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

  it("stores and returns an exam", async () => {
    const repository = new BrowserExamRepository();
    const created = await repository.create({
      stage: 1,
      juzNumbers: [30],
      examDate: inDays(10),
      includeNewMemorization: false,
    });

    expect(created.stage).toBe(1);
    expect(created.status).toBe(ExamStatus.Scheduled);
    expect(created.examDate).toBeInstanceOf(Date);
    expect(await repository.findById(created.id)).not.toBeNull();
  });

  it("sorts the Juz it is given, so a scope reads the same however it was entered", async () => {
    const repository = new BrowserExamRepository();
    const created = await repository.create({
      stage: null,
      juzNumbers: [7, 5, 6],
      examDate: inDays(10),
      includeNewMemorization: false,
    });

    expect(created.juzNumbers).toEqual([5, 6, 7]);
  });

  it("finds the soonest scheduled exam as the active one", async () => {
    const repository = new BrowserExamRepository();
    const legacy = await repository.recordPast({
      stage: 3,
      juzNumbers: [26],
      examDate: inDays(40),
    });
    const soonest = await repository.create({
      stage: 1,
      juzNumbers: [30],
      examDate: inDays(5),
      includeNewMemorization: false,
    });

    // Compatible legacy snapshots may contain competing schedules; reads still handle them.
    const db = await getDatabase();
    await db.put("exams", {
      ...(await db.get("exams", legacy.id))!,
      status: ExamStatus.Scheduled,
      passedAt: null,
    });
    expect((await repository.findActive(new Date()))?.id).toBe(soonest.id);
  });

  it("keeps an exam active on the morning of the exam itself", async () => {
    // An exam at 9am is still what the user is preparing for at 8am. A
    // schedule that vanished at midnight would take the plan with it on
    // the one morning it matters most.
    const repository = new BrowserExamRepository();
    const today = new Date();
    today.setHours(23, 0, 0, 0);
    await repository.create({
      stage: 1,
      juzNumbers: [30],
      examDate: today,
      includeNewMemorization: false,
    });

    const morning = new Date();
    morning.setHours(8, 0, 0, 0);
    expect(await repository.findActive(morning)).not.toBeNull();
  });

  it("stops treating a passed exam as active", async () => {
    const repository = new BrowserExamRepository();
    const created = await repository.create({
      stage: 1,
      juzNumbers: [30],
      examDate: inDays(5),
      includeNewMemorization: false,
    });

    await repository.updateStatus(created.id, ExamStatus.Passed, new Date());

    expect(await repository.findActive(new Date())).toBeNull();
    expect((await repository.findById(created.id))?.passedAt).toBeInstanceOf(Date);
  });

  it("survives an export written before exams existed", async () => {
    /*
     * Every backup and export file taken before Phase 11 has no `exams`
     * key. Those files must keep restoring — a user's only copy of
     * their Hifz cannot stop working because a feature was added.
     */
    const snapshot = await readSnapshot();
    const legacy = { ...snapshot };
    delete (legacy as { exams?: unknown }).exams;

    await expect(writeSnapshot(legacy)).resolves.toBeUndefined();

    const db = await getDatabase();
    expect(await db.getAll("exams")).toEqual([]);
  });

  it("round-trips exams through an export", async () => {
    const repository = new BrowserExamRepository();
    await repository.create({
      stage: 4,
      juzNumbers: [1, 2, 3, 4, 5, 26, 27, 28, 29, 30],
      examDate: inDays(30),
      includeNewMemorization: true,
    });

    const snapshot = await readSnapshot();
    expect(snapshot.exams).toHaveLength(1);

    await writeSnapshot(snapshot);
    const restored = await repository.findAll();

    expect(restored).toHaveLength(1);
    expect(restored[0]!.juzNumbers).toHaveLength(10);
    expect(restored[0]!.includeNewMemorization).toBe(true);
  });

  it("adds the store to an existing version 1 database without touching its data", async () => {
    // The upgrade path every current PHOS user will take.
    globalThis.indexedDB = new IDBFactory();
    resetDatabaseConnection();

    // A version 1 database, with one page record standing in for a
    // user's whole Hifz.
    const v1 = await openDB("phos", 1, {
      upgrade(db) {
        const pages = db.createObjectStore("pages", { keyPath: "id" });
        pages.createIndex("pageNumber", "pageNumber", { unique: true });
        pages.createIndex("memoryState", "memoryState");
        pages.createIndex("juzNumber", "juzNumber");
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("startedAt", "startedAt");
        const sessionItems = db.createObjectStore("sessionItems", { keyPath: "id" });
        sessionItems.createIndex("sessionId", "sessionId");
        const recallEvents = db.createObjectStore("recallEvents", { keyPath: "id" });
        recallEvents.createIndex("pageId", "pageId");
        recallEvents.createIndex("sessionId", "sessionId");
        recallEvents.createIndex("timestamp", "timestamp");
        db.createObjectStore("settings", { keyPath: "id" });
        const roadmap = db.createObjectStore("roadmapEntries", { keyPath: "id" });
        roadmap.createIndex("juzNumber", "juzNumber", { unique: true });
        const backups = db.createObjectStore("backups", { keyPath: "id" });
        backups.createIndex("createdAt", "createdAt");
      },
    });
    await v1.add("pages", {
      id: "kept",
      pageNumber: 1,
      juzNumber: 1,
      memoryState: "Growing",
      memoryStrength: 0.8,
      memoryStability: 12,
      difficulty: 0.3,
      firstStudiedAt: null,
      lastReviewedAt: null,
      lastSuccessfulRecallAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    v1.close();

    // Reopening through PHOS runs the upgrade to version 2.
    const upgraded = await getDatabase();

    expect(upgraded.objectStoreNames).toContain("exams");
    const kept = await upgraded.get("pages", "kept");
    expect(kept?.memoryStrength).toBe(0.8);
    expect(kept?.memoryStability).toBe(12);
  });
});

/**
 * The revision mode (Phase 12).
 *
 * The upgrade concern is the same as Phase 10's goal fields and Phase
 * 11's exam store: a settings record written before this existed has
 * none of these keys, and must read as `Adaptive` — the behaviour that
 * user already had. Defaulting the other way would silently rewrite how
 * PHOS schedules for everybody who upgraded.
 */
describe("revision mode", () => {
  it("defaults to PHOS's own scheduling", async () => {
    const settings = await new BrowserSettingsRepository().getSettings();

    expect(settings.revisionMode).toBe(RevisionMode.Adaptive);
    expect(settings.cycleStartedAt).toBeNull();
  });

  it("reads a record written before Phase 12 as Adaptive, not as a cycle", async () => {
    const repository = new BrowserSettingsRepository();
    const current = await repository.getSettings();

    // Exactly what is on an upgrading user's device: the keys absent.
    const db = await getDatabase();
    const record = await db.get("settings", current.id);
    delete (record as { revisionMode?: unknown }).revisionMode;
    delete (record as { cycleLengthDays?: unknown }).cycleLengthDays;
    delete (record as { cycleStartedAt?: unknown }).cycleStartedAt;
    await db.put("settings", record!);

    const settings = await repository.getSettings();

    expect(settings.revisionMode).toBe(RevisionMode.Adaptive);
    expect(settings.cycleLengthDays).toBe(7);
    expect(settings.cycleStartedAt).toBeNull();
  });

  it("stamps the cycle's start when the user switches to it", async () => {
    // A cycle with no start has no position — day one is the day they
    // chose it.
    const repository = new BrowserSettingsRepository();
    const settings = await repository.updateRevisionMode({
      revisionMode: RevisionMode.Traditional,
      cycleLengthDays: 10,
    });

    expect(settings.revisionMode).toBe(RevisionMode.Traditional);
    expect(settings.cycleLengthDays).toBe(10);
    expect(settings.cycleStartedAt).toBeInstanceOf(Date);
  });

  it("does not restart the cycle when the length is merely changed", async () => {
    /*
     * Changing "7 days" to "10 days" is not "start again from Juz 1".
     * Restarting on every edit would send somebody back to the
     * beginning of the Mushaf for adjusting a number.
     */
    const repository = new BrowserSettingsRepository();
    const first = await repository.updateRevisionMode({
      revisionMode: RevisionMode.Traditional,
      cycleLengthDays: 7,
    });
    const second = await repository.updateRevisionMode({
      revisionMode: RevisionMode.Traditional,
      cycleLengthDays: 14,
    });

    expect(second.cycleStartedAt?.getTime()).toBe(first.cycleStartedAt?.getTime());
    expect(second.cycleLengthDays).toBe(14);
  });

  it("keeps the start date across a trip through PHOS's own scheduling", async () => {
    // Somebody who tries spaced repetition for a week and comes back is
    // not silently returned to the start of the Mushaf.
    const repository = new BrowserSettingsRepository();
    const started = await repository.updateRevisionMode({
      revisionMode: RevisionMode.Traditional,
    });
    await repository.updateRevisionMode({ revisionMode: RevisionMode.Adaptive });
    const back = await repository.updateRevisionMode({ revisionMode: RevisionMode.Traditional });

    expect(back.cycleStartedAt?.getTime()).toBe(started.cycleStartedAt?.getTime());
  });

  it("restarts only when explicitly asked", async () => {
    const repository = new BrowserSettingsRepository();
    const started = await repository.updateRevisionMode({
      revisionMode: RevisionMode.Traditional,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const restarted = await repository.restartCycle();

    expect(restarted.cycleStartedAt!.getTime()).toBeGreaterThan(started.cycleStartedAt!.getTime());
  });

  it("survives Reset Settings, which promises display preferences only", async () => {
    const repository = new BrowserSettingsRepository();
    await repository.updateRevisionMode({
      revisionMode: RevisionMode.Traditional,
      cycleLengthDays: 21,
    });

    const reset = await repository.resetToDefaults();

    expect(reset.revisionMode).toBe(RevisionMode.Traditional);
    expect(reset.cycleLengthDays).toBe(21);
  });
});

/**
 * Exams recorded retrospectively (raised by the product owner).
 *
 * Someone who passed three stages the year before finding PHOS met a
 * roadmap that behaved as though none of it happened.
 */
describe("past exam records", () => {
  it("is passed the moment it exists, and flagged as history", async () => {
    const repository = new BrowserExamRepository();
    const recorded = await repository.recordPast({
      stage: 3,
      juzNumbers: [26, 27, 28, 29, 30],
      examDate: null,
    });

    expect(recorded.status).toBe(ExamStatus.Passed);
    expect(recorded.recordedAsPast).toBe(true);
    expect(recorded.examDate).toBeNull();
  });

  it("can never become the exam PHOS is preparing for", async () => {
    // It is `Passed` on arrival, so `findActive()` cannot reach it —
    // which is what stops a record of 2024 replacing today's plan.
    const repository = new BrowserExamRepository();
    await repository.recordPast({ stage: 1, juzNumbers: [30], examDate: null });

    expect(await repository.findActive(new Date())).toBeNull();
  });

  it("dates passedAt from the exam itself, not from today", async () => {
    /*
     * `passedAt` is what the aftermath window reads. Stamping a 2024
     * exam as passed today would put it inside the fourteen-day window
     * and have PHOS report a run-up it never ran.
     */
    const repository = new BrowserExamRepository();
    const then = new Date(Date.now() - 400 * 86_400_000);
    const recorded = await repository.recordPast({
      stage: 1,
      juzNumbers: [30],
      examDate: then,
    });

    expect(recorded.passedAt?.getTime()).toBe(then.getTime());
  });

  it("sorts an undated record last, since it is the least specific", async () => {
    const repository = new BrowserExamRepository();
    await repository.recordPast({ stage: 1, juzNumbers: [30], examDate: null });
    await repository.recordPast({
      stage: 2,
      juzNumbers: [28, 29, 30],
      examDate: new Date(Date.now() - 10 * 86_400_000),
    });

    const all = await repository.findAll();

    expect(all[0]!.stage).toBe(2);
    expect(all[1]!.examDate).toBeNull();
  });

  it("reads an exam stored before this field existed as one PHOS scheduled", async () => {
    const repository = new BrowserExamRepository();
    const created = await repository.create({
      stage: 1,
      juzNumbers: [30],
      examDate: new Date(Date.now() + 5 * 86_400_000),
      includeNewMemorization: false,
    });

    const db = await getDatabase();
    const record = await db.get("exams", created.id);
    delete (record as { recordedAsPast?: unknown }).recordedAsPast;
    await db.put("exams", record!);

    expect((await repository.findById(created.id))?.recordedAsPast).toBe(false);
  });
});

describe("the revision-blocks repair flag", () => {
  it("is unset for a record written before the repair existed", async () => {
    // Which is exactly what "has not run for this user yet" means.
    expect(
      (await new BrowserSettingsRepository().getSettings()).revisionBlocksRepairedAt,
    ).toBeNull();
  });

  it("is stamped once marked, and survives Reset Settings", async () => {
    /*
     * A record that a migration happened, not a preference. Clearing it
     * on Reset Settings would make the repair run again on data it has
     * already corrected.
     */
    const repository = new BrowserSettingsRepository();
    await repository.markRevisionBlocksRepaired();

    expect((await repository.resetToDefaults()).revisionBlocksRepairedAt).toBeInstanceOf(Date);
  });
});
