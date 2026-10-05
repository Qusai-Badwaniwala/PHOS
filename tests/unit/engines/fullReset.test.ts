import "fake-indexeddb/auto";
import { IDBFactory, IDBObjectStore as FakeStore } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "@/client/container";
import { completeOnboarding } from "@/client/operations/settings";
import { resetApplication } from "@/client/operations/backup";
import { getDatabase, readSnapshot, resetDatabaseConnection } from "@/repositories/browser";

beforeEach(() => {
  vi.restoreAllMocks();
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
  container.learningEngine.discardInMemoryState();
});

async function populatedRecord() {
  await completeOnboarding({
    memorizationOrder: "Juz30First",
    juzAlreadyMemorized: 1,
    extraPagesMemorized: 2,
    dailyAvailableMinutes: 45,
    comfortableDailyPages: 2,
    followsExistingSchedule: true,
    revisionStartsImmediately: true,
    passedExamStages: [1],
  });
  await container.settingsRepository.updateAppearance("dark");
  await container.roadmapRepository.updateEntry(1, { paused: true });
  await container.persistenceEngine.createBackup();
  return readSnapshot();
}

describe("full PHOS reset", () => {
  it("erases setup, progress, roadmap, exams and backups while preserving another app's database", async () => {
    const before = await populatedRecord();
    const foreign = await openDB("ex-libris", 1, {
      upgrade(db) {
        db.createObjectStore("book");
      },
    });
    await foreign.put("book", { title: "Owner's preserved book" }, "book-1");
    await resetApplication("RESET PHOS");
    const after = await readSnapshot();
    expect(after.pages).toHaveLength(604);
    expect(after.pages.every((page) => page.memoryState === "Unseen")).toBe(true);
    expect(after.settings).toMatchObject({
      theme: "system",
      onboardingCompletedAt: null,
      pagesAlreadyMemorized: 0,
    });
    expect(after.settings?.id).not.toBe(before.settings?.id);
    expect(after.pages.some((page) => before.pages.some((old) => old.id === page.id))).toBe(false);
    expect(after.sessions).toEqual([]);
    expect(after.sessionItems).toEqual([]);
    expect(after.recallEvents).toEqual([]);
    expect(after.roadmapEntries).toEqual([]);
    expect(after.exams).toEqual([]);
    expect(await (await getDatabase()).count("backups")).toBe(0);
    expect(await foreign.get("book", "book-1")).toEqual({ title: "Owner's preserved book" });
    foreign.close();
  });

  it("rolls back all erasure, including backups, if reseeding fails", async () => {
    const before = await populatedRecord();
    const db = await getDatabase();
    const backups = await db.getAll("backups");
    const add = FakeStore.prototype.add;
    vi.spyOn(FakeStore.prototype, "add").mockImplementation(function (
      this: InstanceType<typeof FakeStore>,
      value,
      key,
    ) {
      if (this.name === "settings") throw new Error("storage full");
      return add.call(this, value, key);
    });
    await expect(resetApplication("RESET PHOS")).rejects.toThrow("storage full");
    expect(await readSnapshot()).toEqual(before);
    expect(await db.getAll("backups")).toEqual(backups);
  });

  it("does nothing without the exact confirmation", async () => {
    const before = await populatedRecord();
    await expect(resetApplication("DELETE")).rejects.toThrow();
    expect(await readSnapshot()).toEqual(before);
  });
});
