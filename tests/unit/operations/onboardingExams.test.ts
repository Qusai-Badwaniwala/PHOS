import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXAM_LADDER } from "@/shared/constants";
import { resetDatabaseConnection, readSnapshot } from "@/repositories/browser";
import { completeOnboarding } from "@/client/operations/settings";

const ANSWERS = {
  memorizationOrder: "Standard",
  juzAlreadyMemorized: 0,
  extraPagesMemorized: 0,
  dailyAvailableMinutes: 30,
  comfortableDailyPages: 1,
  followsExistingSchedule: false,
  revisionStartsImmediately: true,
};
beforeEach(() => {
  vi.restoreAllMocks();
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
});
describe("exams selected during onboarding", () => {
  it("records exactly the chosen stages", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [1, 2, 3] });
    expect((await readSnapshot()).exams?.map((exam) => exam.stage).sort()).toEqual([1, 2, 3]);
  });
  it("uses the ladder scope and an unknown historical date", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [3] });
    expect((await readSnapshot()).exams?.[0]).toMatchObject({
      stage: 3,
      juzNumbers: [...EXAM_LADDER[2]!.juzNumbers],
      examDate: null,
      recordedAsPast: true,
      status: "Passed",
    });
  });
  it.each([undefined, []])("accepts no selected stages (%j)", async (passedExamStages) => {
    await completeOnboarding({ ...ANSWERS, passedExamStages });
    expect((await readSnapshot()).exams).toEqual([]);
  });
  it("ignores invalid or duplicate stages from an older client", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [1, 99, 2, 2, 0, "3"] });
    expect((await readSnapshot()).exams?.map((exam) => exam.stage).sort()).toEqual([1, 2]);
  });
});
