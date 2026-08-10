import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXAM_LADDER } from "@/shared/constants";

/**
 * Exams the user ticks during onboarding.
 *
 * The path is easy to break silently: the answers are validated in one
 * place and written in another, and nothing else in the application
 * would notice if the write simply stopped happening. A user would
 * finish setup, see a roadmap with no history on it, and have no reason
 * to suspect PHOS had discarded what they said.
 */
const settingsRepository = vi.hoisted(() => ({
  getSettings: vi.fn(),
  completeOnboarding: vi.fn(),
}));
const examRepository = vi.hoisted(() => ({ recordPast: vi.fn() }));
const memoryEngine = vi.hoisted(() => ({ seedPriorMemorization: vi.fn() }));
const adaptiveEngine = vi.hoisted(() => ({ getMemorizationSequence: vi.fn() }));

vi.mock("@/client/container", () => ({
  container: { settingsRepository, examRepository, memoryEngine, adaptiveEngine },
}));

const { completeOnboarding } = await import("@/client/operations/settings");

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
  vi.clearAllMocks();
  settingsRepository.completeOnboarding.mockResolvedValue({
    id: "s1",
    theme: "system",
    ayahRotationFrequency: 1,
    dateFormat: "mdy",
    timeFormat: "12h",
    reducedMotion: false,
    compactMode: false,
    sessionShowTimer: true,
    sessionShowProgress: true,
    sessionConfirmCompletion: false,
    revisionShowProgress: true,
    onboardingCompletedAt: new Date(),
    memorizationLevel: "Intermediate",
    pagesAlreadyMemorized: 0,
    dailyAvailableMinutes: 30,
    comfortableDailyPages: 1,
    followsExistingSchedule: false,
    revisionStartsImmediately: true,
    memorizationOrder: "Standard",
    goalTargetPages: null,
    goalTargetDate: null,
    revisionMode: "Adaptive",
    cycleLengthDays: 7,
    cycleStartedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  examRepository.recordPast.mockResolvedValue({});
});

describe("exams ticked during onboarding", () => {
  it("records one per stage the user ticked", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [1, 2, 3] });

    expect(examRepository.recordPast).toHaveBeenCalledTimes(3);
  });

  it("takes each scope from the ladder, not from the number alone", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [3] });

    expect(examRepository.recordPast).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 3, juzNumbers: EXAM_LADDER[2]!.juzNumbers }),
    );
  });

  it("records them undated, because onboarding does not ask when", async () => {
    // Nobody remembers the day they sat Juz 30, and the Exams screen
    // offers a date for anyone who does.
    await completeOnboarding({ ...ANSWERS, passedExamStages: [1] });

    expect(examRepository.recordPast).toHaveBeenCalledWith(
      expect.objectContaining({ examDate: null }),
    );
  });

  it("records nothing when the user ticked nothing", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [] });

    expect(examRepository.recordPast).not.toHaveBeenCalled();
  });

  it("treats a missing answer as none, so an older client cannot break setup", async () => {
    await completeOnboarding({ ...ANSWERS });

    expect(examRepository.recordPast).not.toHaveBeenCalled();
  });

  it("drops a stage that does not exist rather than refusing the whole setup", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [1, 99] });

    expect(examRepository.recordPast).toHaveBeenCalledTimes(1);
  });

  it("de-duplicates, so one stage never becomes two records", async () => {
    await completeOnboarding({ ...ANSWERS, passedExamStages: [2, 2, 2] });

    expect(examRepository.recordPast).toHaveBeenCalledTimes(1);
  });

  it("still finishes setup if recording an exam fails", async () => {
    /*
     * Onboarding answers are already written by this point. Losing an
     * exam record is a small annoyance the user can repair from the
     * Exams screen; losing their whole setup is not.
     */
    examRepository.recordPast.mockRejectedValue(new Error("storage full"));

    await expect(completeOnboarding({ ...ANSWERS, passedExamStages: [1] })).resolves.toMatchObject({
      seededPages: 0,
    });
  });
});
