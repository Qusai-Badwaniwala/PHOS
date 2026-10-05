import { describe, expect, it } from "vitest";
import { ExamStatus, MemoryState, WorkloadCategory, type Exam, type Page } from "@/shared/types";
import { JUZ_END_PAGE } from "@/shared/constants";
import type {
  IExamRepository,
  IPageRepository,
  IRecallEventRepository,
  ISessionRepository,
  ISettingsRepository,
} from "@/repositories";
import type { IMemoryEngine } from "@/engines/memory";
import { AdaptiveEngine } from "@/engines/adaptive";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";

/**
 * What exam mode does to the day's plan.
 *
 * Two product decisions are pinned here, both settled deliberately and
 * both easy to undo by accident:
 *
 * 1. Weak and Recovery pages outside the exam scope are *not* surfaced
 *    during the run-up. A student a week from an exam cannot act on
 *    "eleven other pages are slipping".
 * 2. An oversized day is warned about and still scheduled in full.
 *    Trimming it would mean arriving at the exam never having revised
 *    part of the syllabus.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

function pagesOfJuz(juzNumber: number): number[] {
  const end = JUZ_END_PAGE[juzNumber - 1]!;
  const start = juzNumber === 1 ? 1 : JUZ_END_PAGE[juzNumber - 2]! + 1;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function page(pageNumber: number, juzNumber: number, overrides: Partial<Page> = {}): Page {
  const now = new Date();
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    juzNumber,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.7,
    memoryStability: 10,
    difficulty: 0.4,
    // These are declared prior Hifz, not 44 pages newly learned today.
    firstStudiedAt: null,
    lastReviewedAt: now,
    lastSuccessfulRecallAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as unknown as Page;
}

/**
 * Juz 30 memorized and healthy, Juz 1 memorized and badly overdue.
 *
 * The Juz 1 pages are exactly what PHOS would normally push to the
 * front of the plan, which is what makes them the right probe for
 * whether exam mode really sets them aside.
 */
function pages(): Page[] {
  const longAgo = new Date(Date.now() - 90 * MILLISECONDS_PER_DAY);
  return [
    ...pagesOfJuz(30).map((n) => page(n, 30)),
    ...pagesOfJuz(1).map((n) =>
      page(n, 1, {
        memoryStrength: 0.1,
        memoryStability: 2,
        lastReviewedAt: longAgo,
        lastSuccessfulRecallAt: longAgo,
      }),
    ),
    // Something left to memorize, so "keep memorizing" has somewhere to go.
    ...pagesOfJuz(2).map((n) =>
      page(n, 2, {
        memoryState: MemoryState.Unseen,
        memoryStrength: 0,
        memoryStability: 0,
        firstStudiedAt: null,
        lastReviewedAt: null,
        lastSuccessfulRecallAt: null,
      }),
    ),
  ];
}

function exam(overrides: Partial<Exam> = {}): Exam {
  const now = new Date();
  return {
    id: "exam-1",
    stage: 1,
    juzNumbers: [30],
    examDate: new Date(Date.now() + 4 * MILLISECONDS_PER_DAY),
    includeNewMemorization: false,
    status: ExamStatus.Scheduled,
    recordedAsPast: false,
    scheduledAt: now,
    passedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildEngine(activeExam: Exam | null, allPages: Page[] = pages()) {
  return new AdaptiveEngine({
    pageRepository: { findAll: async () => allPages } as unknown as IPageRepository,
    sessionRepository: {
      findBetweenDates: async () => [],
      findSessionItems: async () => [],
      findLastCompleted: async () => null,
    } as unknown as ISessionRepository,
    settingsRepository: {
      getSettings: async () => ({ comfortableDailyPages: 1, dailyAvailableMinutes: 60 }),
    } as unknown as ISettingsRepository,
    recallEventRepository: {
      findBetweenDates: async () => [],
    } as unknown as IRecallEventRepository,
    examRepository: {
      findActive: async () => activeExam,
      findAll: async () => (activeExam ? [activeExam] : []),
    } as unknown as IExamRepository,
    memoryEngine: {} as unknown as IMemoryEngine,
    config: DEFAULT_ADAPTIVE_CONFIG,
  });
}

describe("with no exam scheduled", () => {
  it("plans exactly as it always did", async () => {
    // The guard on the whole feature: exam mode must be invisible until
    // an exam exists.
    const plan = await buildEngine(null).generateDailyPlan(60);

    // Juz 1 is 90 days overdue, so it dominates an ordinary plan.
    expect(plan.studyItems.some((item) => item.juzNumber === 1)).toBe(true);
  });
});

describe("during an exam run-up", () => {
  it("plans only the exam's scope", async () => {
    const plan = await buildEngine(exam()).generateDailyPlan(60);

    expect(plan.studyItems.length).toBeGreaterThan(0);
    expect(plan.studyItems.every((item) => item.juzNumber === 30)).toBe(true);
  });

  it("sets aside weak pages outside the scope, however overdue they are", async () => {
    /*
     * Juz 1 here is 90 days past due at strength 0.1 — the strongest
     * possible pull on an ordinary plan. Exam mode still excludes it,
     * because attention must not be divided during a critical period.
     */
    const plan = await buildEngine(exam()).generateDailyPlan(60);

    expect(plan.studyItems.some((item) => item.juzNumber === 1)).toBe(false);
    expect(plan.recoveryRecommended).toBe(false);
  });

  it("gives today a contiguous block of the scope", async () => {
    const plan = await buildEngine(exam()).generateDailyPlan(60);
    const numbers = plan.studyItems.map((item) => item.pageNumber).sort((a, b) => a - b);

    expect(numbers.every((n, i) => i === 0 || n === numbers[i - 1]! + 1)).toBe(true);
    expect(numbers[0]).toBe(582);
  });

  it("labels exam revision as revision, whatever the page's own strength", async () => {
    // Calling a strong page "Recovery" mid-run-up would be exactly the
    // attention-dividing signal this mode exists to suppress.
    const plan = await buildEngine(exam()).generateDailyPlan(60);

    expect(
      plan.studyItems.every((item) => item.workloadCategory === WorkloadCategory.OverdueRevision),
    ).toBe(true);
  });

  it("explains itself, including what it has set aside", async () => {
    // An exam changes the plan more abruptly than anything else PHOS
    // does. Silence here would read as a malfunction.
    const plan = await buildEngine(exam()).generateDailyPlan(60);

    expect(plan.explanation.headline).toMatch(/Juz 30/);
    expect(plan.explanation.details.join(" ")).toMatch(/set aside until the exam is over/);
  });

  it("adds no new memorization when the user chose revision only", async () => {
    const plan = await buildEngine(exam({ includeNewMemorization: false })).generateDailyPlan(60);

    expect(
      plan.studyItems.some((item) => item.workloadCategory === WorkloadCategory.NewMemorization),
    ).toBe(false);
  });

  it("keeps memorizing when the user chose to", async () => {
    const plan = await buildEngine(exam({ includeNewMemorization: true })).generateDailyPlan(60);

    expect(
      plan.studyItems.some((item) => item.workloadCategory === WorkloadCategory.NewMemorization),
    ).toBe(true);
    // Still bounded by the ordinary daily target — "keep going" never
    // means "memorize without limit during exam week".
    expect(
      plan.studyItems.filter((item) => item.workloadCategory === WorkloadCategory.NewMemorization),
    ).toHaveLength(1);
  });
});

describe("when the run-up will not fit the day", () => {
  const wholeQuran = Array.from({ length: 30 }, (_, i) => i + 1);

  function everyPage(): Page[] {
    return wholeQuran.flatMap((juz) => pagesOfJuz(juz).map((n) => page(n, juz)));
  }

  it("warns in the user's own units", async () => {
    const plan = await buildEngine(
      exam({
        stage: 8,
        juzNumbers: wholeQuran,
        examDate: new Date(Date.now() + 2 * MILLISECONDS_PER_DAY),
      }),
      everyPage(),
    ).generateDailyPlan(60);

    expect(plan.workloadWarning).not.toBeNull();
    expect(plan.workloadWarning!.message).toMatch(/more than the 60 you set aside/);
  });

  it("says it is scheduling the full scope anyway, and offers nothing to drop", async () => {
    /*
     * The deliberate suspension of the Adaptive Engine's "never exceed
     * available time" contract. `deferrablePages: 0` is the honest
     * answer — naming a droppable number would offer a choice that does
     * not exist, since the scope and the date are both fixed by
     * somebody other than PHOS.
     */
    const plan = await buildEngine(
      exam({
        stage: 8,
        juzNumbers: wholeQuran,
        examDate: new Date(Date.now() + 2 * MILLISECONDS_PER_DAY),
      }),
      everyPage(),
    ).generateDailyPlan(60);

    expect(plan.workloadWarning!.deferrablePages).toBe(0);
    expect(plan.workloadWarning!.message).toMatch(/rather than dropping pages/);
    // And the day really does carry its full share.
    expect(plan.studyItems.length).toBeGreaterThan(200);
  });

  it("stays quiet when the run-up fits comfortably", async () => {
    const plan = await buildEngine(
      exam({ examDate: new Date(Date.now() + 20 * MILLISECONDS_PER_DAY) }),
    ).generateDailyPlan(60);

    expect(plan.workloadWarning).toBeNull();
  });
});
