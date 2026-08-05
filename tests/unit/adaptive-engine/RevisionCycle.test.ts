import { describe, expect, it } from "vitest";
import { MemoryState, RevisionMode, WorkloadCategory, type Page } from "@/shared/types";
import { JUZ_END_PAGE } from "@/shared/constants";
import { calculateRevisionCycle } from "@/engines/adaptive/calculators";
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
 * The traditional revision cycle (Phase 12).
 *
 * A fixed rotation exists because Requirement 9 says the user decides.
 * What the tests protect is the promise a rotation makes and spaced
 * repetition does not: the same pages on the same day, in order, every
 * pass — and the position surviving a day the user did not open PHOS.
 */
const NOW = new Date(2026, 7, 5, 9, 0);
const MILLISECONDS_PER_DAY = 86_400_000;

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * MILLISECONDS_PER_DAY);
}

function pagesOfJuz(juzNumber: number): number[] {
  const end = JUZ_END_PAGE[juzNumber - 1]!;
  const start = juzNumber === 1 ? 1 : JUZ_END_PAGE[juzNumber - 2]! + 1;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function page(pageNumber: number, juzNumber: number, overrides: Partial<Page> = {}): Page {
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    juzNumber,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.7,
    memoryStability: 10,
    difficulty: 0.4,
    firstStudiedAt: daysBefore(60),
    lastReviewedAt: daysBefore(1),
    lastSuccessfulRecallAt: daysBefore(1),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as unknown as Page;
}

function memorized(juzNumbers: readonly number[]): Page[] {
  return juzNumbers.flatMap((juz) => pagesOfJuz(juz).map((n) => page(n, juz)));
}

const STANDARD_ORDER = Array.from({ length: 30 }, (_, i) => i + 1);

function cycle(
  pages: Page[],
  overrides: Partial<{
    cycleLengthDays: number;
    cycleStartedAt: Date | null;
    availableStudyMinutes: number;
    memorizationOrder: readonly number[];
  }> = {},
) {
  return calculateRevisionCycle(
    pages,
    {
      cycleLengthDays: 7,
      cycleStartedAt: NOW,
      availableStudyMinutes: 60,
      memorizationOrder: STANDARD_ORDER,
      ...overrides,
    },
    NOW,
  );
}

describe("dividing the cycle", () => {
  it("rotates through everything memorized", () => {
    const plan = cycle(memorized([1, 2]));

    // Juz 1 is 21 pages and Juz 2 is 20.
    expect(plan.pagesInCycle).toBe(41);
    expect(plan.pagesPerDay).toBe(6);
  });

  it("gives each day a contiguous block, because a rotation is recited in order", () => {
    const plan = cycle(memorized([1, 2]));
    const numbers = plan.todaysPageNumbers;

    expect(numbers.every((n, i) => i === 0 || n === numbers[i - 1]! + 1)).toBe(true);
  });

  it("covers every memorized page exactly once across a full pass", () => {
    /*
     * The promise a fixed rotation makes. Walking the cycle day by day
     * must visit all 41 pages and no page twice — anything else is not
     * a rotation, whatever it is called.
     */
    const pages = memorized([1, 2]);
    const seen: number[] = [];

    for (let day = 0; day < 7; day += 1) {
      seen.push(
        ...calculateRevisionCycle(
          pages,
          {
            cycleLengthDays: 7,
            cycleStartedAt: NOW,
            availableStudyMinutes: 60,
            memorizationOrder: STANDARD_ORDER,
          },
          new Date(NOW.getTime() + day * MILLISECONDS_PER_DAY),
        ).todaysPageNumbers,
      );
    }

    expect(seen).toHaveLength(41);
    expect(new Set(seen).size).toBe(41);
  });

  it("never includes a page that has not been memorized", () => {
    const pages = [
      ...memorized([1]),
      ...pagesOfJuz(2).map((n) => page(n, 2, { memoryState: MemoryState.Unseen })),
    ];

    expect(cycle(pages).pagesInCycle).toBe(21);
  });

  it("rotates in the user's own order, not the Mushaf's", () => {
    // Somebody who memorized Juz 30 first learned those pages as a
    // block and recites them as one.
    const juz30First = [30, ...STANDARD_ORDER.filter((juz) => juz !== 30)];
    const plan = cycle(memorized([1, 30]), { memorizationOrder: juz30First });

    expect(plan.todaysPageNumbers[0]).toBe(582);
  });

  it("takes a Juz's first position if an order somehow lists it twice", () => {
    // No roadmap produces a duplicate, but reading the *last* index
    // would put a Juz at the end of the rotation on the strength of a
    // stray entry — a silent reordering of somebody's whole revision.
    const plan = cycle(memorized([1, 30]), { memorizationOrder: [30, ...STANDARD_ORDER] });

    expect(plan.todaysPageNumbers[0]).toBe(582);
  });

  it("keeps revising a paused Juz that was already memorized", () => {
    /*
     * A pause excludes a Juz from *new* memorization. Dropping its
     * already-memorized pages from the rotation would let them decay
     * unseen, which is not what pausing means.
     */
    const pages = memorized([1, 5]);
    const plan = cycle(pages, { memorizationOrder: STANDARD_ORDER.filter((j) => j !== 5) });

    expect(plan.pagesInCycle).toBe(41);
  });

  it("places a paused Juz at the end of the rotation, not the front", () => {
    /*
     * "Kept in the rotation" is only half the requirement. A Juz absent
     * from the order has no rank, and an unranked page must sort last —
     * treating it as rank zero would put the one Juz the user has
     * deliberately set aside at the very front of every pass.
     */
    const pages = memorized([1, 5]);
    const order = STANDARD_ORDER.filter((juz) => juz !== 5);

    const everyDay: number[] = [];
    for (let day = 0; day < 7; day += 1) {
      everyDay.push(
        ...calculateRevisionCycle(
          pages,
          {
            cycleLengthDays: 7,
            cycleStartedAt: NOW,
            availableStudyMinutes: 60,
            memorizationOrder: order,
          },
          new Date(NOW.getTime() + day * MILLISECONDS_PER_DAY),
        ).todaysPageNumbers,
      );
    }

    // Juz 1 is pages 1–21; Juz 5 is 82–101. The paused one comes last.
    expect(everyDay[0]).toBe(1);
    expect(everyDay[everyDay.length - 1]).toBe(101);
  });
});

describe("where the rotation has reached", () => {
  it("counts the day from the stored start date", () => {
    expect(cycle(memorized([1]), { cycleStartedAt: daysBefore(3) }).dayOfCycle).toBe(4);
  });

  it("wraps round and counts completed passes", () => {
    const plan = cycle(memorized([1]), { cycleStartedAt: daysBefore(16) });

    // 16 days into a 7-day cycle: two full passes, then day 3.
    expect(plan.passesCompleted).toBe(2);
    expect(plan.dayOfCycle).toBe(3);
  });

  it("does not restart when the user misses days", () => {
    /*
     * The reason position is a stored date rather than a derivation
     * from the last session. Somebody who steps away for five days
     * should return to where the rotation actually is — which is
     * precisely when a person most needs telling.
     */
    const plan = cycle(memorized([1, 2]), { cycleStartedAt: daysBefore(5) });

    expect(plan.dayOfCycle).toBe(6);
  });

  it("treats a cycle with no stored start as being on its first day", () => {
    // Only reachable for a record written before Phase 12.
    const plan = cycle(memorized([1]), { cycleStartedAt: null });

    expect(plan.dayOfCycle).toBe(1);
    expect(plan.passesCompleted).toBe(0);
  });
});

describe("when the cycle will not fit the day", () => {
  it("warns, and names a length that would fit", () => {
    /*
     * Unlike an exam, this warning is actionable: the cycle length is
     * the user's own choice, so the honest response is a specific
     * number they can accept or ignore.
     */
    const plan = cycle(memorized(STANDARD_ORDER), {
      cycleLengthDays: 7,
      availableStudyMinutes: 30,
    });

    expect(plan.exceedsDailyBudget).toBe(true);
    expect(plan.suggestedCycleLengthDays).toBeGreaterThan(7);
  });

  it("suggests a length that genuinely fits", () => {
    const plan = cycle(memorized(STANDARD_ORDER), {
      cycleLengthDays: 7,
      availableStudyMinutes: 30,
    });
    const refitted = cycle(memorized(STANDARD_ORDER), {
      cycleLengthDays: plan.suggestedCycleLengthDays!,
      availableStudyMinutes: 30,
    });

    expect(refitted.exceedsDailyBudget).toBe(false);
  });

  it("suggests nothing rather than something absurd", () => {
    // Five minutes a day against the whole Mushaf has no sensible
    // cycle length, and "try a 400-day cycle" is worse than silence.
    const plan = cycle(memorized(STANDARD_ORDER), { cycleLengthDays: 7, availableStudyMinutes: 5 });

    expect(plan.exceedsDailyBudget).toBe(true);
    expect(plan.suggestedCycleLengthDays).toBeNull();
  });

  it("stays quiet when the portion fits comfortably", () => {
    expect(cycle(memorized([1])).exceedsDailyBudget).toBe(false);
  });

  it("does not warn when nothing has been memorized at all", () => {
    // A beginner on day one has no rotation to be warned about.
    expect(cycle([]).exceedsDailyBudget).toBe(false);
  });
});

// ---------------------------------------------------------------
// The cycle inside a real daily plan
// ---------------------------------------------------------------

function buildEngine(
  revisionMode: RevisionMode,
  overrides: { cycleLengthDays?: number; cycleStartedAt?: Date | null; pages?: Page[] } = {},
) {
  const pages = overrides.pages ?? [
    ...memorized([1, 2]),
    // Something left to memorize.
    ...pagesOfJuz(3).map((n) =>
      page(n, 3, {
        memoryState: MemoryState.Unseen,
        memoryStrength: 0,
        memoryStability: 0,
        firstStudiedAt: null,
        lastReviewedAt: null,
        lastSuccessfulRecallAt: null,
      }),
    ),
  ];

  return new AdaptiveEngine({
    pageRepository: { findAll: async () => pages } as unknown as IPageRepository,
    sessionRepository: {
      findBetweenDates: async () => [],
      findSessionItems: async () => [],
      findLastCompleted: async () => null,
    } as unknown as ISessionRepository,
    settingsRepository: {
      getSettings: async () => ({
        comfortableDailyPages: 1,
        dailyAvailableMinutes: 60,
        revisionMode,
        cycleLengthDays: overrides.cycleLengthDays ?? 7,
        cycleStartedAt: overrides.cycleStartedAt ?? new Date(),
        memorizationOrder: "Standard",
      }),
    } as unknown as ISettingsRepository,
    recallEventRepository: {
      findBetweenDates: async () => [],
    } as unknown as IRecallEventRepository,
    examRepository: {
      findActive: async () => null,
      findAll: async () => [],
    } as unknown as IExamRepository,
    memoryEngine: {} as unknown as IMemoryEngine,
    config: DEFAULT_ADAPTIVE_CONFIG,
  });
}

describe("the daily plan under a traditional cycle", () => {
  it("is unchanged for anybody who never switched", async () => {
    // The guard on the whole feature: it must be invisible by default.
    const plan = await buildEngine(RevisionMode.Adaptive).generateDailyPlan(60);

    expect(plan.explanation.headline).not.toMatch(/revision cycle/);
  });

  it("names the day of the cycle, which is what a rotation is navigated by", async () => {
    const plan = await buildEngine(RevisionMode.Traditional).generateDailyPlan(60);

    expect(plan.explanation.headline).toMatch(/Day 1 of your 7-day revision cycle/);
  });

  it("keeps pacing new memorization exactly as before", async () => {
    /*
     * The separation that makes this safe to choose. A revision cycle
     * is not a request to stop memorizing, and users most fear that it
     * silently is.
     */
    const plan = await buildEngine(RevisionMode.Traditional).generateDailyPlan(60);

    expect(
      plan.studyItems.some((item) => item.workloadCategory === WorkloadCategory.NewMemorization),
    ).toBe(true);
  });

  it("gives revision from the cycle rather than from priority order", async () => {
    const plan = await buildEngine(RevisionMode.Traditional).generateDailyPlan(60);
    const revision = plan.studyItems
      .filter((item) => item.workloadCategory !== WorkloadCategory.NewMemorization)
      .map((item) => item.pageNumber);

    // Day one of a 7-day cycle over 41 pages: the first six, in order.
    expect(revision).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("never claims Recovery, which a fixed cycle has no way to mean", async () => {
    /*
     * Recovery means "overdue against this page's own stability". A
     * fixed rotation has no per-page schedule to be overdue against, so
     * the label would describe a state the user is not in.
     */
    const stale = [
      ...memorized([1]).map((p) => ({
        ...p,
        memoryStrength: 0.05,
        memoryStability: 1,
        lastReviewedAt: daysBefore(120),
      })),
    ] as Page[];

    const plan = await buildEngine(RevisionMode.Traditional, { pages: stale }).generateDailyPlan(
      60,
    );

    expect(plan.recoveryRecommended).toBe(false);
    expect(
      plan.studyItems.some((item) => item.workloadCategory === WorkloadCategory.Recovery),
    ).toBe(false);
  });

  it("warns about an oversized cycle without changing it", async () => {
    const plan = await buildEngine(RevisionMode.Traditional, {
      cycleLengthDays: 3,
      pages: memorized(STANDARD_ORDER),
    }).generateDailyPlan(30);

    expect(plan.workloadWarning).not.toBeNull();
    expect(plan.workloadWarning!.message).toMatch(/would fit|Lengthening the cycle/);
    // Still scheduled in full: it is the user's cycle.
    expect(plan.studyItems.length).toBeGreaterThan(100);
  });
});

describe("precedence between an exam and a cycle", () => {
  it("lets an exam take over from a traditional cycle", async () => {
    /*
     * An exam is time-boxed and imposed from outside; a cycle is an
     * ongoing preference that will still be there afterwards. If the
     * cycle won, a student who follows a Manzil rotation could not
     * prepare for an exam at all.
     */
    const pages = memorized([1, 2, 30]);
    const engine = new AdaptiveEngine({
      pageRepository: { findAll: async () => pages } as unknown as IPageRepository,
      sessionRepository: {
        findBetweenDates: async () => [],
        findSessionItems: async () => [],
        findLastCompleted: async () => null,
      } as unknown as ISessionRepository,
      settingsRepository: {
        getSettings: async () => ({
          comfortableDailyPages: 1,
          dailyAvailableMinutes: 60,
          revisionMode: RevisionMode.Traditional,
          cycleLengthDays: 7,
          cycleStartedAt: new Date(),
          memorizationOrder: "Standard",
        }),
      } as unknown as ISettingsRepository,
      recallEventRepository: {
        findBetweenDates: async () => [],
      } as unknown as IRecallEventRepository,
      examRepository: {
        findActive: async () => ({
          id: "exam-1",
          stage: 1,
          juzNumbers: [30],
          examDate: new Date(Date.now() + 4 * MILLISECONDS_PER_DAY),
          includeNewMemorization: false,
          status: "Scheduled",
          scheduledAt: new Date(),
          passedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findAll: async () => [],
      } as unknown as IExamRepository,
      memoryEngine: {} as unknown as IMemoryEngine,
      config: DEFAULT_ADAPTIVE_CONFIG,
    });

    const plan = await engine.generateDailyPlan(60);

    expect(plan.explanation.headline).toMatch(/Preparing for Juz 30/);
    expect(plan.explanation.headline).not.toMatch(/revision cycle/);
    expect(plan.studyItems.every((item) => item.juzNumber === 30)).toBe(true);
  });
});
