import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, expect, it, vi } from "vitest";
import { BrowserPersistenceEngine } from "@/engines/persistence/browser";
import {
  BrowserBackupRepository,
  BrowserExamRepository,
  BrowserPageRepository,
  BrowserRecallEventRepository,
  BrowserSessionRepository,
  BrowserSettingsRepository,
  getDatabase,
  readSnapshot,
  resetDatabaseConnection,
} from "@/repositories/browser";
import { ConfidenceLevel, MemoryState, SessionType } from "@/shared/types";

vi.setConfig({ testTimeout: 20000 });
const engine = new BrowserPersistenceEngine({
  pageRepository: new BrowserPageRepository(),
  sessionRepository: new BrowserSessionRepository(),
  recallEventRepository: new BrowserRecallEventRepository(),
  settingsRepository: new BrowserSettingsRepository(),
  backupRepository: new BrowserBackupRepository(),
  examRepository: new BrowserExamRepository(),
  applicationVersion: "0.3.0",
});
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
});

it("restores complete records on a fresh device without changing identities, dates or duplicating history", async () => {
  const db = await getDatabase();
  const page = (await db.getAll("pages"))[0]!;
  await db.put("pages", {
    ...page,
    memoryState: MemoryState.Growing,
    firstStudiedAt: "2025-01-01T10:00:00.000Z",
  });
  await db.put("sessions", {
    id: "source-session",
    sessionType: SessionType.Sabaq,
    startedAt: "2025-01-01T10:00:00.000Z",
    completedAt: "2025-01-01T10:15:00.000Z",
    durationSeconds: 900,
    createdAt: "2025-01-01T10:00:00.000Z",
  });
  await db.put("sessionItems", {
    id: "source-item",
    sessionId: "source-session",
    pageId: page.id,
    order: 0,
  });
  await db.put("recallEvents", {
    id: "source-recall",
    sessionId: "source-session",
    pageId: page.id,
    timestamp: "2025-01-01T10:15:00.000Z",
    successfulRecall: true,
    confidence: ConfidenceLevel.High,
    durationSeconds: 60,
  });
  const settings = (await db.getAll("settings"))[0]!;
  await db.put("settings", {
    ...settings,
    dailyAvailableMinutes: 45,
    onboardingCompletedAt: "2025-01-01T10:00:00.000Z",
    goalTargetPages: 100,
    goalTargetDate: "2027-01-01T00:00:00.000Z",
    memorizationOrder: "Custom",
  });
  for (let juz = 1; juz <= 30; juz++)
    await db.put("roadmapEntries", {
      id: `road-${juz}`,
      juzNumber: juz,
      position: 30 - juz,
      paused: juz === 3,
    });
  await db.put("exams", {
    id: "source-exam",
    stage: null,
    juzNumbers: [1],
    examDate: null,
    includeNewMemorization: false,
    status: "Passed",
    recordedAsPast: true,
    scheduledAt: "2025-01-01T00:00:00.000Z",
    passedAt: "2025-01-01T00:00:00.000Z",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });
  const source = await readSnapshot();
  const exported = JSON.stringify((await engine.exportData()).content);
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
  expect((await engine.importData(exported)).success).toBe(true);
  expect(await readSnapshot()).toEqual(source);
  expect((await engine.importData(exported)).success).toBe(true);
  expect(await readSnapshot()).toEqual(source);
  expect(await engine.listBackups()).toHaveLength(2);
});

it("rejects malformed rows before changing any progress or taking a safety copy", async () => {
  const before = await readSnapshot();
  const content = JSON.parse(JSON.stringify((await engine.exportData()).content));
  delete content.snapshot;
  delete content.checksum;
  content.pages[0].memoryState = "Growing";
  content.pages[1].memoryStrength = "not a number";
  const result = await engine.importData(JSON.stringify(content));
  expect(result.success).toBe(false);
  expect(await readSnapshot()).toEqual(before);
  expect(await engine.listBackups()).toHaveLength(0);
});
it.each(["null", "[]", '{"applicationVersion":"0.3.0","snapshot":null}'])(
  "rejects invalid root %s without writes",
  async (contents) => {
    const before = await readSnapshot();
    expect((await engine.importData(contents)).success).toBe(false);
    expect(await readSnapshot()).toEqual(before);
  },
);
it("keeps the complete record intact if reset fails after deletion begins", async () => {
  const db = await getDatabase();
  const page = (await db.getAll("pages"))[0]!;
  await db.put("pages", { ...page, memoryState: MemoryState.Growing });
  const before = await readSnapshot();
  const original = IDBObjectStore.prototype.clear;
  const injected = vi.spyOn(IDBObjectStore.prototype, "clear").mockImplementation(function (
    this: IDBObjectStore,
  ) {
    if (this.name === "exams") throw new Error("Injected reset failure");
    return original.call(this);
  });
  await expect(engine.resetAllData()).rejects.toThrow("Injected reset failure");
  injected.mockRestore();
  expect(await readSnapshot()).toEqual(before);
  expect(await engine.listBackups()).toHaveLength(1);
});
