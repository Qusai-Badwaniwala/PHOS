import { MemoryState, type GoalProjection, type MemorizationGoal, type Page } from "@/shared/types";
import { startOfLocalDay, addLocalDays, daysBetweenLocalDates } from "@/shared/utils";

/**
 * How far back the pace is measured.
 *
 * Long enough that a quiet week or an unusually good one does not move
 * the projection much, short enough that it describes how the user is
 * memorizing *now* rather than how they were six months ago. The same
 * reasoning the Adaptive Engine applies to workload: draw on a rolling
 * window, so a difficult month passes out of view on its own.
 */
export const PACE_WINDOW_DAYS = 30;

/**
 * The least history a projection may be built on.
 *
 * Below this the arithmetic still produces a date, and that date is
 * noise — two good days would promise the whole Mushaf inside a year.
 * PHOS says it does not know yet instead, which is the same discipline
 * that keeps Memory Health blank until a real recall exists.
 */
export const MINIMUM_ASSESSED_DAYS = 7;

/**
 * Measures the user's own goal against what they have actually done.
 *
 * WHAT IS MEASURED, AND WHY IT IS THIS
 * ------------------------------------
 * Pace comes from `firstStudiedAt` — the moment a page left `Unseen`,
 * written once and never changed. That makes it a direct count of new
 * memorization actually recorded, not a rate inferred from sessions
 * (which include revision) nor the figure the user guessed at during
 * onboarding.
 *
 * Onboarding answers are deliberately unused here. They are estimates
 * PHOS is meant to *replace* with evidence; feeding one into a
 * projection would dress an assumption up as a measurement, on a card
 * whose whole purpose is to tell the user something true.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * It does not judge. A projection landing after the goal is a fact
 * about pace and nothing else — not evidence of laziness, and not a
 * reason to memorize faster. PHOS protects retention over speed
 * everywhere else, and a goal card must not quietly reverse that.
 */
export function calculateGoalProjection(
  pages: readonly Page[],
  goal: MemorizationGoal,
  now: Date,
): GoalProjection | null {
  // No goal, no projection. Not an error — most users never set one.
  if (goal.goalTargetPages === null || goal.goalTargetDate === null) return null;

  const targetPages = goal.goalTargetPages;
  const targetDate = goal.goalTargetDate;

  const memorizedPages = pages.filter((page) => page.memoryState !== MemoryState.Unseen);
  const pagesMemorized = memorizedPages.length;
  const pagesRemaining = Math.max(0, targetPages - pagesMemorized);
  const targetReached = pagesMemorized >= targetPages;

  const { pagesPerDay, assessedDays } = measurePace(memorizedPages, now);

  const base: Omit<
    GoalProjection,
    "observedPagesPerDay" | "projectedCompletionDate" | "daysFromGoal"
  > = {
    targetPages,
    targetDate,
    pagesMemorized,
    pagesRemaining,
    assessedDays,
    targetReached,
  };

  // Already there. A projected date would be meaningless, and the card
  // has something better to say.
  if (targetReached) {
    return {
      ...base,
      observedPagesPerDay: pagesPerDay,
      projectedCompletionDate: null,
      daysFromGoal: null,
    };
  }

  /*
   * Two different unknowns, both reported as `null` pace:
   *
   * - too little history to measure at all
   * - enough history, but no new pages in it
   *
   * Neither supports a completion date. Saying "never" would be a
   * prediction PHOS cannot make about a person, and saying "zero pages
   * a day" to someone seven days into using it would be simply wrong.
   */
  if (assessedDays < MINIMUM_ASSESSED_DAYS || pagesPerDay === null || pagesPerDay <= 0) {
    return {
      ...base,
      observedPagesPerDay: null,
      projectedCompletionDate: null,
      daysFromGoal: null,
    };
  }

  const daysNeeded = Math.ceil(pagesRemaining / pagesPerDay);
  const projectedCompletionDate = addLocalDays(startOfLocalDay(now), daysNeeded);
  const daysFromGoal = daysBetweenLocalDates(targetDate, projectedCompletionDate);

  return { ...base, observedPagesPerDay: pagesPerDay, projectedCompletionDate, daysFromGoal };
}

/**
 * New pages per day across the recent window.
 *
 * `assessedDays` is capped by how long the user has actually been
 * memorizing, so somebody ten days in is measured over ten days rather
 * than being told their pace is a third of what it is because the
 * window assumed thirty.
 */
function measurePace(
  memorizedPages: readonly Page[],
  now: Date,
): { pagesPerDay: number | null; assessedDays: number } {
  const firstStudiedDates = memorizedPages
    .map((page) => page.firstStudiedAt)
    .filter((date): date is Date => date instanceof Date);

  if (firstStudiedDates.length === 0) return { pagesPerDay: null, assessedDays: 0 };

  const earliest = firstStudiedDates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
  const daysSinceStart = daysBetweenLocalDates(earliest, now) + 1;

  const assessedDays = Math.min(PACE_WINDOW_DAYS, Math.max(1, daysSinceStart));
  const windowStart = addLocalDays(startOfLocalDay(now), -(assessedDays - 1));

  const pagesInWindow = firstStudiedDates.filter(
    (date) => date.getTime() >= windowStart.getTime(),
  ).length;

  return { pagesPerDay: pagesInWindow / assessedDays, assessedDays };
}
