import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeOnboarding } from "@/client/operations/settings";
import { container } from "@/client/container";
import {
  BrowserExamRepository,
  BrowserPageRepository,
  BrowserRoadmapRepository,
  getDatabase,
  readSnapshot,
  resetDatabaseConnection,
} from "@/repositories/browser";

const answers = {
  memorizationOrder: "Standard",
  juzAlreadyMemorized: 1,
  extraPagesMemorized: 5,
  dailyAvailableMinutes: 30,
  comfortableDailyPages: 1,
  followsExistingSchedule: false,
  revisionStartsImmediately: true,
  passedExamStages: [1, 2],
};

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
  container.learningEngine.discardInMemoryState();
  vi.restoreAllMocks();
});

describe("setup is one record change", () => {
  it("keeps onboarding and every page unchanged when prior-memorization seeding fails", async () => {
    await container.roadmapRepository.findAll();
    const before = await readSnapshot();
    vi.spyOn(BrowserPageRepository.prototype, "updateReviewTimestamps").mockRejectedValueOnce(
      new Error("storage full"),
    );
    await expect(completeOnboarding(answers)).rejects.toThrow();
    expect(await readSnapshot()).toEqual(before);
    const retry = await completeOnboarding(answers);
    expect(retry.seededPages).toBe(26);
    expect((await readSnapshot()).exams).toHaveLength(2);
  });

  it("keeps the wizard available when saving a chosen past exam fails", async () => {
    await container.roadmapRepository.findAll();
    const before = await readSnapshot();
    vi.spyOn(BrowserExamRepository.prototype, "recordPast").mockRejectedValueOnce(
      new Error("storage full"),
    );
    await expect(completeOnboarding(answers)).rejects.toThrow();
    expect(await readSnapshot()).toEqual(before);
  });
});

describe("concurrent startup", () => {
  it("lets independent connections initialize the same empty database", async () => {
    const opens = Array.from({ length: 4 }, () => {
      resetDatabaseConnection();
      return getDatabase();
    });
    const connections = await Promise.all(opens);
    for (const connection of connections) {
      expect(await connection.count("pages")).toBe(604);
      expect(await connection.count("settings")).toBe(1);
    }
  });

  it("lets simultaneous roadmap reads fill missing Juz once", async () => {
    await getDatabase();
    const roadmaps = await Promise.all(
      Array.from({ length: 4 }, () => new BrowserRoadmapRepository().findAll()),
    );
    expect(roadmaps.every((roadmap) => roadmap.length === 30)).toBe(true);
    expect(await (await getDatabase()).count("roadmapEntries")).toBe(30);
  });
});
