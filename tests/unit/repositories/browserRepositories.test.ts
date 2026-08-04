import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfidenceLevel, MemorizationOrder, MemoryState, SessionType } from "@/shared/types";
import { TOTAL_MUSHAF_PAGES } from "@/shared/constants";
import {
  BrowserBackupRepository,
  BrowserPageRepository,
  BrowserRecallEventRepository,
  BrowserRoadmapRepository,
  BrowserSessionRepository,
  BrowserSettingsRepository,
  byteLength,
  computeChecksum,
  resetDatabaseConnection,
  seedIfEmpty,
  serializeSnapshot,
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
