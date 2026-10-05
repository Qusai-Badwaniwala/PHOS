import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "@/client/container";
import { completeOnboarding, updateGoal, updateRoadmap } from "@/client/operations/settings";
import { repairSeededRevisionBlocks } from "@/client/operations/migrations";
import { logMemorizedOutside } from "@/client/operations/pages";
import { submitConfidence } from "@/client/operations/session";
import { scheduleExam, getExamOverview } from "@/client/operations/exams";
import {
  BrowserPageRepository,
  BrowserRoadmapRepository,
  BrowserSettingsRepository,
  getDatabase,
  readSnapshot,
  resetDatabaseConnection,
} from "@/repositories/browser";
import { ConfidenceLevel, ExamStatus, SessionType } from "@/shared/types";

beforeEach(() => {
  vi.restoreAllMocks();
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
  container.learningEngine.discardInMemoryState();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("record corrections commit completely", () => {
  it("keeps the selected order when saving its custom sequence fails", async () => {
    await container.roadmapRepository.findAll();
    const before = await readSnapshot();
    vi.spyOn(BrowserRoadmapRepository.prototype, "replaceCustomOrder").mockRejectedValueOnce(
      new Error("storage full"),
    );
    await expect(
      updateRoadmap({
        order: "Custom",
        juzSequence: Array.from({ length: 30 }, (_, index) => 30 - index),
      }),
    ).rejects.toThrow();
    expect(await readSnapshot()).toEqual(before);
  });
  it("rolls back an automatic date reblock if its completion marker cannot be stored", async () => {
    await logMemorizedOutside({ count: 3 });
    const db = await getDatabase();
    const pages = (await db.getAll("pages"))
      .filter((page) => page.memoryState !== "Unseen")
      .sort((a, b) => a.pageNumber - b.pageNumber);
    for (const [index, row] of pages.entries()) {
      const date = new Date(Date.now() - [1, 3, 2][index]! * 86400000).toISOString();
      await db.put("pages", { ...row, lastReviewedAt: date, lastSuccessfulRecallAt: date });
    }
    const before = await readSnapshot();
    vi.spyOn(
      BrowserSettingsRepository.prototype,
      "markRevisionBlocksRepaired",
    ).mockRejectedValueOnce(new Error("storage full"));
    expect(await repairSeededRevisionBlocks()).toEqual({ ran: false, pagesRepaired: 0 });
    expect(await readSnapshot()).toEqual(before);
  });
});

describe("outside study and page-bound feedback", () => {
  it("does not leave partially declared prior Hifz when an outside-work write fails", async () => {
    await container.roadmapRepository.findAll();
    const before = await readSnapshot();
    vi.spyOn(BrowserPageRepository.prototype, "updateReviewTimestamps").mockRejectedValueOnce(
      new Error("storage full"),
    );
    await expect(logMemorizedOutside({ pageNumbers: [1, 2, 3] })).rejects.toThrow();
    expect(await readSnapshot()).toEqual(before);
  });

  it("rejects confidence for a different page and keeps the pending recall retryable", async () => {
    const session = await container.learningEngine.startSession(SessionType.Sabaq);
    const plan = await container.learningEngine.loadDailyPlan(30);
    const pageId = plan.studyItems[0]!.pageId;
    const otherPage = (await container.pageRepository.findAll()).find(
      (page) => page.id !== pageId,
    )!;
    container.learningEngine.submitRecall(pageId, true, 60);
    const before = await readSnapshot();
    await expect(
      submitConfidence({
        sessionId: session.id,
        pageId: otherPage.id,
        confidence: ConfidenceLevel.High,
      }),
    ).rejects.toThrow();
    expect(await readSnapshot()).toEqual(before);
    await submitConfidence({ sessionId: session.id, pageId, confidence: ConfidenceLevel.High });
    expect((await readSnapshot()).recallEvents).toHaveLength(1);
  });
});

describe("exams stay consistent and discoverable", () => {
  it("serializes concurrent bookings so only one upcoming exam is created", async () => {
    const input = {
      stage: null,
      juzNumbers: [1],
      examDate: new Date(Date.now() + 86400000),
      includeNewMemorization: false,
    };
    const attempts = await Promise.allSettled([
      container.examRepository.create(input),
      container.examRepository.create(input),
    ]);
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await readSnapshot()).exams).toHaveLength(1);
  });

  it("shows a scheduled exam awaiting a result after its date passes", async () => {
    const created = await container.examRepository.create({
      stage: null,
      juzNumbers: [1],
      examDate: new Date(Date.now() - 86400000),
      includeNewMemorization: false,
    });
    const overview = await getExamOverview();
    expect(overview.awaitingResult?.map((exam) => exam.id)).toContain(created.id);
    expect(overview.active).toBeNull();
  });

  it("keeps cancelled exams in visible history and prevents changing passed to cancelled", async () => {
    const created = await container.examRepository.create({
      stage: null,
      juzNumbers: [1],
      examDate: new Date(Date.now() + 86400000),
      includeNewMemorization: false,
    });
    await container.examRepository.updateStatus(created.id, ExamStatus.Cancelled, null);
    expect((await getExamOverview()).past.map((exam) => exam.id)).toContain(created.id);
    const passed = await container.examRepository.recordPast({
      stage: null,
      juzNumbers: [1],
      examDate: null,
    });
    await expect(
      container.examRepository.updateStatus(passed.id, ExamStatus.Cancelled, null),
    ).rejects.toThrow();
  });
});

describe("dates chosen on the local calendar", () => {
  it("stores the selected goal and exam date rather than the previous day west of UTC", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 9, 5, 10).getTime());
    await completeOnboarding({
      memorizationOrder: "Juz30First",
      juzAlreadyMemorized: 1,
      extraPagesMemorized: 0,
      dailyAvailableMinutes: 30,
      comfortableDailyPages: 1,
      followsExistingSchedule: false,
      revisionStartsImmediately: true,
    });
    await updateGoal({ targetPages: 100, targetDate: "2026-10-07" });
    expect(new Date((await readSnapshot()).settings!.goalTargetDate!).getDate()).toBe(7);
    await scheduleExam({ stage: 1, examDate: "2026-10-07", includeNewMemorization: false });
    expect(new Date((await (await getDatabase()).getAll("exams"))[0]!.examDate!).getDate()).toBe(7);
  });
});
