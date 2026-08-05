import { describe, expect, it } from "vitest";
import { ExamStageState, ExamStatus, MemoryState, type Exam, type Page } from "@/shared/types";
import { EXAM_LADDER, describeJuzScope, JUZ_END_PAGE } from "@/shared/constants";
import {
  calculateExamAftermath,
  calculateExamCoverage,
  calculateExamPlan,
  calculateStageProgress,
} from "@/engines/adaptive/calculators";

/**
 * An exam is the one place PHOS makes a promise about *coverage* rather
 * than about retention: every page in scope will be revised before the
 * date. These tests hold that promise, and hold the two rules Qusai
 * settled that follow from it — weak pages stay out of sight during the
 * run-up, and an oversized day is warned about rather than trimmed.
 */
const NOW = new Date(2026, 7, 5, 9, 0);
const MILLISECONDS_PER_DAY = 86_400_000;

function inDays(days: number): Date {
  return new Date(NOW.getTime() + days * MILLISECONDS_PER_DAY);
}

/** The real page range of a Juz, from the Mushaf's own boundary table. */
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
    memoryStrength: 0.6,
    memoryStability: 5,
    difficulty: 0.4,
    firstStudiedAt: NOW,
    lastReviewedAt: NOW,
    lastSuccessfulRecallAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as unknown as Page;
}

/** Every page of the given Juz, memorized unless listed in `unseenJuz`. */
function mushaf(juzNumbers: readonly number[], unseenJuz: readonly number[] = []): Page[] {
  return juzNumbers.flatMap((juz) =>
    pagesOfJuz(juz).map((pageNumber) =>
      page(pageNumber, juz, unseenJuz.includes(juz) ? { memoryState: MemoryState.Unseen } : {}),
    ),
  );
}

function exam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "exam-1",
    stage: 1,
    juzNumbers: [30],
    examDate: inDays(10),
    includeNewMemorization: false,
    status: ExamStatus.Scheduled,
    recordedAsPast: false,
    scheduledAt: NOW,
    passedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("the ladder's shape", () => {
  it("carries the earliest Juz forward rather than leaving them behind", () => {
    // The point of a ladder rather than eight unrelated tests: from the
    // fourth stage on, 26–30 is re-examined alongside a growing block.
    for (const stage of EXAM_LADDER.slice(3)) {
      expect(stage.juzNumbers).toEqual(expect.arrayContaining([26, 27, 28, 29, 30]));
    }
  });

  it("ends at the whole Quran", () => {
    expect(EXAM_LADDER[EXAM_LADDER.length - 1]!.juzNumbers).toHaveLength(30);
  });

  it("labels every stage in a way that matches its own Juz", () => {
    // A label that disagreed with its scope would be a silent lie on
    // the roadmap — the user would prepare for the wrong syllabus.
    for (const stage of EXAM_LADDER.slice(0, 7)) {
      expect(describeJuzScope(stage.juzNumbers)).toBe(stage.label);
    }
  });
});

describe("when a stage unlocks", () => {
  it("stays locked while any page in scope has not been memorized", () => {
    // Not PHOS withholding a feature: the run-up revises the pages in
    // scope, and a page never memorized cannot be revised.
    const pages = mushaf([30], [30]);
    const [first] = calculateStageProgress(pages, []);

    expect(first!.state).toBe(ExamStageState.Locked);
    expect(first!.pagesMemorized).toBe(0);
    expect(first!.pagesInScope).toBe(23);
  });

  it("opens once every page in scope has been started", () => {
    const [first] = calculateStageProgress(mushaf([30]), []);

    expect(first!.state).toBe(ExamStageState.Available);
    expect(first!.pagesMemorized).toBe(23);
  });

  it("counts partial progress toward a locked stage, so it reads as a distance", () => {
    const pages = [...mushaf([30]), ...mushaf([28, 29], [28, 29])];
    const stages = calculateStageProgress(pages, []);
    const second = stages.find((stage) => stage.stage === 2)!;

    expect(second.state).toBe(ExamStageState.Locked);
    expect(second.pagesMemorized).toBe(23);
    expect(second.pagesInScope).toBe(63);
  });

  it("reports a booked stage as scheduled, and a sat one as passed", () => {
    const pages = mushaf([30]);

    expect(calculateStageProgress(pages, [exam()])[0]!.state).toBe(ExamStageState.Scheduled);
    expect(
      calculateStageProgress(pages, [exam({ status: ExamStatus.Passed, passedAt: NOW })])[0]!.state,
    ).toBe(ExamStageState.Passed);
  });

  it("keeps a passed stage passed even after a later attempt is booked", () => {
    // Retaking a stage must not erase the fact that it was passed.
    const stages = calculateStageProgress(mushaf([30]), [
      exam({ id: "old", status: ExamStatus.Passed, passedAt: NOW }),
      exam({ id: "new", scheduledAt: inDays(1) }),
    ]);

    expect(stages[0]!.state).toBe(ExamStageState.Passed);
  });

  it("ignores a cancelled exam entirely", () => {
    const stages = calculateStageProgress(mushaf([30]), [exam({ status: ExamStatus.Cancelled })]);

    expect(stages[0]!.state).toBe(ExamStageState.Available);
  });
});

describe("dividing the scope across the run-up", () => {
  it("covers every page in scope, which is the whole promise", () => {
    const pages = mushaf([30]);
    const coverage = calculateExamCoverage(exam({ examDate: inDays(4) }), pages, NOW);

    const covered = coverage.flatMap((day) => day.pageNumbers);
    expect(new Set(covered).size).toBe(23);
    expect([...covered].sort((a, b) => a - b)).toEqual(pagesOfJuz(30));
  });

  it("gives each day a contiguous block, because Hifz is recited continuously", () => {
    const coverage = calculateExamCoverage(exam({ examDate: inDays(4) }), mushaf([30]), NOW);

    for (const day of coverage) {
      const numbers = day.pageNumbers;
      expect(numbers.every((n, i) => i === 0 || n === numbers[i - 1]! + 1)).toBe(true);
    }
  });

  it("divides evenly rather than front-loading", () => {
    // 23 pages over 5 days (4 until the exam, plus the exam day).
    const plan = calculateExamPlan(exam({ examDate: inDays(4) }), mushaf([30]), 60, NOW);

    expect(plan.daysRemaining).toBe(5);
    expect(plan.pagesPerDay).toBe(5);
    expect(plan.todaysPageNumbers).toHaveLength(5);
  });

  it("counts the exam day itself as a day of revision", () => {
    // Excluding it would compress the schedule by a day for no reason:
    // an exam is usually in the morning and the night before is real.
    const plan = calculateExamPlan(exam({ examDate: inDays(1) }), mushaf([30]), 60, NOW);

    expect(plan.daysRemaining).toBe(2);
  });

  it("puts everything on today when the exam is today", () => {
    const plan = calculateExamPlan(exam({ examDate: NOW }), mushaf([30]), 60, NOW);

    expect(plan.daysRemaining).toBe(1);
    expect(plan.todaysPageNumbers).toHaveLength(23);
  });

  it("shows the user the same first day it actually assigns", () => {
    /*
     * The card and the plan are two readings of one division. If they
     * computed it separately they would agree today and drift the first
     * time either was touched, and the user would see one schedule
     * while being given another.
     */
    const pages = mushaf([30]);
    const scheduled = exam({ examDate: inDays(6) });

    const plan = calculateExamPlan(scheduled, pages, 60, NOW);
    const coverage = calculateExamCoverage(scheduled, pages, NOW);

    expect(coverage[0]!.pageNumbers).toEqual(plan.todaysPageNumbers);
    expect(coverage).toHaveLength(plan.daysRemaining);
  });

  it("leaves unmemorized pages out of the scope rather than scheduling phantom revision", () => {
    const pages = [...mushaf([30]), ...mushaf([29], [29])];
    const plan = calculateExamPlan(
      exam({ stage: 2, juzNumbers: [29, 30], examDate: inDays(4) }),
      pages,
      60,
      NOW,
    );

    expect(plan.pagesInScope).toBe(23);
  });
});

describe("the oversized-day warning", () => {
  it("warns when the run-up needs more time than the user has", () => {
    // The whole Quran in three days is not a schedule anybody can keep,
    // and PHOS must say so rather than let them find out on the day.
    const wholeQuran = mushaf(Array.from({ length: 30 }, (_, i) => i + 1));
    const plan = calculateExamPlan(
      exam({
        stage: 8,
        juzNumbers: Array.from({ length: 30 }, (_, i) => i + 1),
        examDate: inDays(2),
      }),
      wholeQuran,
      60,
      NOW,
    );

    expect(plan.exceedsDailyBudget).toBe(true);
    expect(plan.estimatedMinutesPerDay).toBeGreaterThan(60);
  });

  it("still schedules the whole scope when it warns — a warning is not a trim", () => {
    /*
     * The contract the Adaptive Engine keeps everywhere else — never
     * exceed the user's available time — is deliberately suspended
     * here. Both the date and the syllabus are fixed by somebody other
     * than PHOS, so dropping pages to fit the clock would mean arriving
     * at the exam having never revised them.
     */
    const wholeQuran = mushaf(Array.from({ length: 30 }, (_, i) => i + 1));
    const juz = Array.from({ length: 30 }, (_, i) => i + 1);
    const plan = calculateExamPlan(
      exam({ stage: 8, juzNumbers: juz, examDate: inDays(2) }),
      wholeQuran,
      60,
      NOW,
    );
    const coverage = calculateExamCoverage(
      exam({ stage: 8, juzNumbers: juz, examDate: inDays(2) }),
      wholeQuran,
      NOW,
    );

    expect(plan.pagesInScope).toBe(604);
    expect(coverage.flatMap((day) => day.pageNumbers)).toHaveLength(604);
  });

  it("does not warn when the scope comfortably fits", () => {
    const plan = calculateExamPlan(exam({ examDate: inDays(20) }), mushaf([30]), 60, NOW);

    expect(plan.exceedsDailyBudget).toBe(false);
  });
});

describe("what fell behind while the exam ran", () => {
  it("counts overdue pages outside the exam scope", () => {
    const pages = [
      ...mushaf([30]),
      // Juz 1, last reviewed 40 days ago with a 5-day stability.
      ...pagesOfJuz(1).map((pageNumber) =>
        page(pageNumber, 1, { lastReviewedAt: inDays(-40), memoryStability: 5 }),
      ),
    ];

    const aftermath = calculateExamAftermath(exam(), pages, NOW);

    expect(aftermath.pagesFallenBehind).toBe(21);
  });

  it("never counts a page that was inside the exam scope", () => {
    // Those were revised on purpose. Reporting them as fallen behind
    // would tell the user their exam preparation had failed.
    const pages = pagesOfJuz(30).map((pageNumber) =>
      page(pageNumber, 30, { lastReviewedAt: inDays(-40), memoryStability: 5 }),
    );

    expect(calculateExamAftermath(exam(), pages, NOW).pagesFallenBehind).toBe(0);
  });

  it("names the weakest few, so there is somewhere to start", () => {
    const pages = [
      ...mushaf([30]),
      ...pagesOfJuz(1).map((pageNumber, index) =>
        page(pageNumber, 1, {
          lastReviewedAt: inDays(-40),
          memoryStability: 5,
          memoryStrength: index < 5 ? 0.1 : 0.9,
        }),
      ),
    ];

    const aftermath = calculateExamAftermath(exam(), pages, NOW);

    expect(aftermath.weakestPageNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it("reports nothing when nothing fell behind", () => {
    const aftermath = calculateExamAftermath(exam(), mushaf([1, 30]), NOW);

    expect(aftermath.pagesFallenBehind).toBe(0);
    expect(aftermath.weakestPageNumbers).toEqual([]);
  });
});

describe("describing a scope", () => {
  it("collapses runs the way people say them", () => {
    expect(describeJuzScope([1, 2, 3, 4, 5, 26, 27, 28, 29, 30])).toBe("Juz 1–5 + 26–30");
    expect(describeJuzScope([30])).toBe("Juz 30");
    expect(describeJuzScope([3, 7, 8])).toBe("Juz 3 + 7–8");
  });

  it("sorts and de-duplicates whatever it is given", () => {
    expect(describeJuzScope([30, 1, 30, 2])).toBe("Juz 1–2 + 30");
  });
});
