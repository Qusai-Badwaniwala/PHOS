import { afterEach, describe, expect, it, vi } from "vitest";
import { AdaptiveEngine } from "@/engines/adaptive";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";
import {
  calculateExamCoverage,
  calculateExamPlan,
  calculateRevisionCycle,
  estimatePageDurationSeconds,
} from "@/engines/adaptive/calculators";
import {
  ConfidenceLevel,
  ExamStatus,
  MemoryState,
  SessionType,
  type Exam,
  type Page,
  type RecallEvent,
  type Session,
} from "@/shared/types";
import type {
  IPageRepository,
  IRecallEventRepository,
  ISessionRepository,
  ISettingsRepository,
} from "@/repositories";
import type { IMemoryEngine } from "@/engines/memory";

const now = new Date(2026, 9, 5, 10);
const old = new Date(2026, 7, 1, 10);
function page(number: number, overrides: Partial<Page> = {}): Page {
  return {
    id: `page-${number}`,
    pageNumber: number,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.6,
    memoryStability: 5,
    difficulty: 0.5,
    firstStudiedAt: old,
    lastReviewedAt: old,
    lastSuccessfulRecallAt: old,
    createdAt: old,
    updatedAt: old,
    ...overrides,
  };
}
function engine(pages: Page[], recalls: RecallEvent[], sessions: Session[], traditional = false) {
  return new AdaptiveEngine({
    pageRepository: { findAll: async () => pages } as unknown as IPageRepository,
    recallEventRepository: {
      findBetweenDates: async (from: Date, to: Date) =>
        recalls.filter((event) => event.timestamp >= from && event.timestamp <= to),
    } as unknown as IRecallEventRepository,
    sessionRepository: {
      findBetweenDates: async (from: Date, to: Date) =>
        sessions.filter((session) => session.startedAt >= from && session.startedAt <= to),
      findSessionItems: async () => [{ pageId: "page-1" }],
      findLastCompleted: async () => sessions[sessions.length - 1] ?? null,
    } as unknown as ISessionRepository,
    settingsRepository: {
      getSettings: async () => ({
        comfortableDailyPages: 1,
        ...(traditional
          ? { revisionMode: "Traditional", cycleLengthDays: 3, cycleStartedAt: now }
          : {}),
      }),
    } as unknown as ISettingsRepository,
    memoryEngine: {} as IMemoryEngine,
  });
}
function session(index: number, date: Date): Session {
  return {
    id: `session-${index}`,
    sessionType: SessionType.Manzil,
    startedAt: date,
    completedAt: date,
    durationSeconds: 60,
    createdAt: date,
  };
}
function recall(index: number, pageId: string, date: Date): RecallEvent {
  return {
    id: `recall-${index}`,
    pageId,
    sessionId: `session-${index % 5}`,
    timestamp: date,
    successfulRecall: true,
    confidence: ConfidenceLevel.High,
    durationSeconds: 60,
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("planning from actual study evidence", () => {
  it("does not treat revision-only history as observed new memorization", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const sessions = Array.from({ length: 5 }, (_, index) =>
      session(index, new Date(2026, 9, index + 1, 10)),
    );
    const pages = Array.from({ length: 20 }, (_, index) => page(index + 1));
    const recalls = Array.from({ length: 100 }, (_, index) =>
      recall(index, pages[index % 20]!.id, sessions[index % 5]!.startedAt),
    );
    const plan = await engine(pages, recalls, sessions).generateDailyPlan(60);
    expect(plan.workload?.observedDailyPace).toBe(0);
    expect(plan.workload?.recommendedNewPages).toBe(1);
  });

  it("does not reschedule a page recorded after midnight in a session started yesterday", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const started = new Date(2026, 9, 4, 23, 55);
    const recorded = new Date(2026, 9, 5, 0, 5);
    const plan = await engine(
      [page(1)],
      [recall(0, "page-1", recorded)],
      [session(0, started)],
    ).generateDailyPlan(60);
    expect(plan.studyItems).toEqual([]);
  });
});

function exam(): Exam {
  const scheduled = new Date(2026, 9, 3, 9);
  return {
    id: "exam-1",
    stage: null,
    juzNumbers: [1],
    examDate: new Date(2026, 9, 7, 9),
    scheduledAt: scheduled,
    createdAt: scheduled,
    updatedAt: scheduled,
    passedAt: null,
    includeNewMemorization: false,
    recordedAsPast: false,
    status: ExamStatus.Scheduled,
  };
}

describe("exam preparation advances through its scope", () => {
  it("assigns the remaining pages after yesterday's block was revised", () => {
    const pages = Array.from({ length: 12 }, (_, index) =>
      page(index + 1, index < 6 ? { lastReviewedAt: new Date(2026, 9, 4, 10) } : {}),
    );
    const plan = calculateExamPlan(exam(), pages, 60, now);
    expect(plan.pagesInScope).toBe(12);
    expect(plan.todaysPageNumbers).toEqual([7, 8]);
    expect(calculateExamCoverage(exam(), pages, now).flatMap((day) => day.pageNumbers)).toEqual([
      7, 8, 9, 10, 11, 12,
    ]);
  });

  it("keeps today's portion stable after a partial or complete study", () => {
    const pages = Array.from({ length: 12 }, (_, index) => page(index + 1));
    const before = calculateExamPlan(exam(), pages, 60, now);
    const reviewed = pages.map((row) =>
      before.todaysPageNumbers.includes(row.pageNumber) ? { ...row, lastReviewedAt: now } : row,
    );
    expect(calculateExamPlan(exam(), reviewed, 60, now).todaysPageNumbers).toEqual(
      before.todaysPageNumbers,
    );
  });

  it("warns using the same duration as the study plan", () => {
    const pages = Array.from({ length: 23 }, (_, index) => page(index + 1));
    const scheduled = { ...exam(), examDate: now };
    const plan = calculateExamPlan(scheduled, pages, 30, now);
    expect(plan.estimatedMinutesPerDay).toBe(
      Math.ceil(
        pages.reduce(
          (seconds, row) => seconds + estimatePageDurationSeconds(row, DEFAULT_ADAPTIVE_CONFIG),
          0,
        ) / 60,
      ),
    );
    expect(plan.exceedsDailyBudget).toBe(true);
  });
});

describe("traditional calendar and duration", () => {
  it("keeps the whole revision portion and fits new study into the time left", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const pages = Array.from({ length: 14 }, (_, index) => page(index + 1, { difficulty: 0.6 }));
    pages.push(
      page(15, {
        memoryState: MemoryState.Unseen,
        memoryStrength: 0,
        memoryStability: 0,
        difficulty: 0,
        firstStudiedAt: null,
        lastReviewedAt: null,
        lastSuccessfulRecallAt: null,
      }),
    );
    const plan = await engine(pages, [], [], true).generateDailyPlan(10);
    expect(plan.studyItems).toHaveLength(5);
    expect(plan.estimatedTotalDurationSeconds).toBeLessThanOrEqual(600);
  });
  it("uses the plan's duration to warn and suggest a cycle that fits", () => {
    const pages = Array.from({ length: 21 }, (_, index) => page(index + 1));
    const cycle = calculateRevisionCycle(
      pages,
      { cycleLengthDays: 3, cycleStartedAt: now, availableStudyMinutes: 5, memorizationOrder: [1] },
      now,
    );
    expect(cycle.exceedsDailyBudget).toBe(true);
    expect(cycle.estimatedMinutesPerDay).toBe(13);
    expect(cycle.suggestedCycleLengthDays).toBe(11);
  });

  it("advances by local calendar dates across the spring daylight-saving change", () => {
    vi.stubEnv("TZ", "America/New_York");
    const started = new Date(2026, 2, 7, 10);
    const today = new Date(2026, 2, 9, 10);
    expect(started.getTimezoneOffset()).toBe(300);
    expect(today.getTimezoneOffset()).toBe(240);
    const cycle = calculateRevisionCycle(
      [page(1), page(2), page(3)],
      {
        cycleLengthDays: 3,
        cycleStartedAt: started,
        availableStudyMinutes: 30,
        memorizationOrder: [1],
      },
      today,
    );
    expect(cycle.dayOfCycle).toBe(3);
    expect(cycle.todaysPageNumbers).toEqual([3]);
  });
});
