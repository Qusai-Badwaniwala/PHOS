import {
  ExamStageState,
  ExamStatus,
  MemoryState,
  type Exam,
  type ExamAftermath,
  type ExamCoverageDay,
  type ExamPlan,
  type ExamStageProgress,
  type Page,
} from "@/shared/types";
import { describeJuzScope, EXAM_LADDER } from "@/shared/constants";
import { startOfLocalDay, daysBetweenLocalDates, addLocalDays } from "@/shared/utils";
import { DEFAULT_ADAPTIVE_CONFIG, type AdaptiveEngineConfig } from "../constants";
import { estimatePageDurationSeconds } from "./DurationCalculator";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Seconds a page of exam revision is assumed to take.
 *
 * Deliberately lower than the Adaptive Engine's own per-page estimate,
 * which budgets for careful study of pages at every strength. Exam
 * revision is recitation of material already memorized — faster per
 * page, and the whole scope is covered rather than a selected few.
 * Used only to decide whether to *warn*, never to decide what to
 * schedule.
 */

/**
 * Whole days between two dates, counted by calendar day.
 *
 * Local day boundaries rather than elapsed hours, because "three days
 * until the exam" is a statement about dates on a calendar, not about
 * 72 hours.
 */
export function daysUntil(from: Date, to: Date): number {
  return daysBetweenLocalDates(from, to);
}

/**
 * How each rung of the ladder stands for this user.
 *
 * WHY A STAGE LOCKS
 * -----------------
 * A stage opens only when every page in its scope has left `Unseen`.
 * This is not PHOS withholding a feature: the run-up schedule revises
 * the pages in scope, and a page the user has never memorized cannot be
 * revised. Booking an exam over unmemorized pages would produce a plan
 * that quietly omits them, which is the one thing an exam schedule must
 * never do.
 */
export function calculateStageProgress(
  pages: readonly Page[],
  exams: readonly Exam[],
): readonly ExamStageProgress[] {
  return EXAM_LADDER.map((definition) => {
    const scope = pages.filter((page) => definition.juzNumbers.includes(page.juzNumber));
    const pagesMemorized = scope.filter((page) => page.memoryState !== MemoryState.Unseen).length;
    const unlocked = scope.length > 0 && pagesMemorized === scope.length;

    // The most recent exam booked for this rung. A stage retaken after
    // a failure has several, and the latest is the one that describes
    // where the user stands.
    const forStage = exams
      .filter((exam) => exam.stage === definition.stage && exam.status !== ExamStatus.Cancelled)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
    const latest = forStage[0] ?? null;
    const passed = forStage.some((exam) => exam.status === ExamStatus.Passed);

    return {
      stage: definition.stage,
      juzNumbers: definition.juzNumbers,
      label: definition.label,
      state: resolveStageState({
        passed,
        scheduled: latest?.status === ExamStatus.Scheduled,
        unlocked,
      }),
      pagesMemorized,
      pagesInScope: scope.length,
      examId: latest?.id ?? null,
      examDate: latest?.examDate ?? null,
    };
  });
}

function resolveStageState(input: {
  passed: boolean;
  scheduled: boolean;
  unlocked: boolean;
}): ExamStageState {
  // Passed outranks everything: a stage the user has already sat is
  // described by that fact, not by whether they have since paused a Juz
  // inside it.
  if (input.passed) return ExamStageState.Passed;
  if (input.scheduled) return ExamStageState.Scheduled;
  return input.unlocked ? ExamStageState.Available : ExamStageState.Locked;
}

/**
 * The run-up schedule: every page in scope, divided equally across the
 * days that remain.
 *
 * WHY EQUAL DIVISION, AND NOT PRIORITY ORDER
 * ------------------------------------------
 * Everywhere else PHOS schedules by need — weakest and most overdue
 * first. An exam inverts the requirement: the student is examined on
 * the whole scope, so the whole scope must be covered, and a priority
 * queue offers no guarantee that the strong pages are ever reached. An
 * equal division does, and it is also what a student left to their own
 * devices actually does.
 *
 * Pages are divided in *page order* and in contiguous blocks, for the
 * same reason the seeded revision cycle is blocked: Hifz is recited
 * continuously, and a day of 3, 17, 42 is not revision anybody performs.
 *
 * WHY IT CAN EXCEED THE DAILY BUDGET
 * ----------------------------------
 * The Adaptive Engine's standing contract is that a plan never exceeds
 * the user's available time. This deliberately suspends it. Both terms
 * are fixed by somebody other than PHOS — the institution sets the
 * date, the syllabus sets the scope — so there is nothing that could
 * honestly be trimmed; dropping pages to fit the clock would mean
 * arriving at the exam having never revised them. Students also
 * genuinely do make extra time in an exam week. PHOS therefore divides
 * equally and *says* the day is oversized, rather than silently
 * producing a schedule that cannot cover the syllabus. This is the only
 * place in PHOS where that contract is suspended, and it is suspended
 * loudly.
 */
export function calculateExamPlan(
  exam: Exam,
  pages: readonly Page[],
  availableStudyMinutes: number,
  referenceDate: Date,
  config: AdaptiveEngineConfig = DEFAULT_ADAPTIVE_CONFIG,
): ExamPlan {
  const { scope, totalPagesInScope, daysRemaining, pagesPerDay } = divideScope(
    exam,
    pages,
    referenceDate,
  );

  const todaysPageNumbers = scope.slice(0, pagesPerDay).map((page) => page.pageNumber);

  const seconds = scope
    .slice(0, pagesPerDay)
    .reduce((total, page) => total + estimatePageDurationSeconds(page, config), 0);
  const estimatedMinutesPerDay = Math.ceil(seconds / 60);

  return {
    examId: exam.id,
    examDate: exam.examDate ?? referenceDate,
    daysRemaining,
    pagesInScope: totalPagesInScope,
    todaysPageNumbers,
    pagesPerDay,
    exceedsDailyBudget: seconds > availableStudyMinutes * 60,
    estimatedMinutesPerDay,
  };
}

/**
 * The scope, the days left, and how the one divides across the other.
 *
 * Shared by the plan and the coverage schedule rather than computed in
 * each, because the card the user reads and the pages PHOS actually
 * assigns must be the same division. Two copies of this arithmetic
 * would agree today and drift the first time either was touched — the
 * user would then see one schedule and be given another, with nothing
 * to indicate which was real.
 */
function divideScope(
  exam: Exam,
  pages: readonly Page[],
  referenceDate: Date,
): {
  scope: readonly Page[];
  totalPagesInScope: number;
  daysRemaining: number;
  pagesPerDay: number;
} {
  const allInScope = pages
    // Unmemorized pages are excluded: the run-up revises, and a page
    // never memorized cannot be revised.
    .filter((page) => exam.juzNumbers.includes(page.juzNumber))
    .filter((page) => page.memoryState !== MemoryState.Unseen)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  // The exam day itself counts as a day of revision — it is usually the
  // morning of, and excluding it would compress the schedule by a day
  // for no reason.
  /*
   * An exam with no date is a retrospective record, which is `Passed`
   * on arrival and therefore never reaches a planner. Treating a
   * missing date as today keeps these functions total rather than
   * throwing on a state that should be unreachable — and "no deadline"
   * genuinely does mean "nothing left to spread it over".
   */
  // Reviews before today advance coverage. Keep today's portion stable while
  // it is recorded; the engine excludes actual completed recalls for today.
  const today = startOfLocalDay(referenceDate);
  const scope = allInScope.filter(
    (page) =>
      !page.lastReviewedAt ||
      page.lastReviewedAt <= exam.scheduledAt ||
      page.lastReviewedAt >= today,
  );

  const daysRemaining = exam.examDate
    ? Math.max(1, daysUntil(referenceDate, exam.examDate) + 1)
    : 1;

  // Ceiling, so the remainder lands on the final day rather than
  // falling off the end of the schedule and never being revised.
  return {
    scope,
    totalPagesInScope: allInScope.length,
    daysRemaining,
    pagesPerDay: Math.ceil(scope.length / daysRemaining),
  };
}

/**
 * The whole run-up, day by day.
 *
 * Used by the exam card to show the shape of the coming weeks. Shares
 * `divideScope()` with `calculateExamPlan()`, so the first entry is
 * always exactly what today's plan contains.
 */
export function calculateExamCoverage(
  exam: Exam,
  pages: readonly Page[],
  referenceDate: Date,
): readonly ExamCoverageDay[] {
  const { scope, daysRemaining, pagesPerDay } = divideScope(exam, pages, referenceDate);
  const today = startOfLocalDay(referenceDate);

  const days: ExamCoverageDay[] = [];
  for (let day = 0; day < daysRemaining; day += 1) {
    const block = scope.slice(day * pagesPerDay, (day + 1) * pagesPerDay);
    // Once the scope is exhausted the remaining days carry nothing.
    // Shown as empty rather than omitted: "nothing left to cover" is
    // useful information three days before an exam.
    days.push({
      date: addLocalDays(today, day),
      pageNumbers: block.map((page) => page.pageNumber),
    });
  }

  return days;
}

/**
 * What the exam cost, reported only once it is over.
 *
 * During the run-up PHOS deliberately says nothing about pages outside
 * the exam scope falling due. A student a week from an exam cannot act
 * on that information, and showing it would divide their attention at
 * the worst possible moment — the reason weak pages are excluded from
 * the plan in the first place. Afterwards it is exactly what they need
 * to know.
 */
export function calculateExamAftermath(
  exam: Exam,
  pages: readonly Page[],
  referenceDate: Date,
): ExamAftermath {
  const outOfScope = pages.filter(
    (page) => !exam.juzNumbers.includes(page.juzNumber) && page.memoryState !== MemoryState.Unseen,
  );

  const overdue = outOfScope.filter((page) => {
    if (!page.lastReviewedAt) return false;
    const dueDate = new Date(
      page.lastReviewedAt.getTime() + page.memoryStability * MILLISECONDS_PER_DAY,
    );
    return dueDate.getTime() < startOfLocalDay(referenceDate).getTime();
  });

  return {
    pagesFallenBehind: overdue.length,
    // The five furthest past due, so the user has somewhere concrete to
    // start rather than a number they can only feel bad about.
    weakestPageNumbers: [...overdue]
      .sort((a, b) => a.memoryStrength - b.memoryStrength)
      .slice(0, 5)
      .map((page) => page.pageNumber)
      .sort((a, b) => a - b),
  };
}

/** A readable description of an exam's scope, for cards and headings. */
export function describeExamScope(exam: Exam): string {
  return describeJuzScope(exam.juzNumbers);
}
