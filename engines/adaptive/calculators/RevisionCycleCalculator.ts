import { MemoryState, type Page, type RevisionCyclePlan } from "@/shared/types";
import { MAXIMUM_CYCLE_LENGTH_DAYS } from "@/shared/constants";
import { startOfLocalDay } from "@/shared/utils";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Seconds a page of cycle revision is assumed to take.
 *
 * The same figure the exam run-up uses, and for the same reason: this
 * is recitation of material already memorized, not careful study of a
 * page at any strength. Used only to decide whether to warn.
 */
const CYCLE_REVISION_SECONDS_PER_PAGE = 45;

/**
 * The traditional revision cycle: everything memorized, in the user's
 * own order, divided across a fixed number of days and repeating.
 *
 * WHY THIS EXISTS ALONGSIDE SPACED REPETITION
 * -------------------------------------------
 * PHOS's own scheduling is better at what it optimises — it reaches the
 * same retention for fewer pages a day, because effort follows need.
 * But it is not better at everything. A fixed rotation is predictable,
 * it is what most Hifz institutions teach, and a student whose teacher
 * sets a Manzil cycle needs to follow that cycle rather than argue with
 * it. Requirement 9 settles it: PHOS recommends, the user decides.
 *
 * WHY IT ROTATES IN MEMORIZATION ORDER
 * ------------------------------------
 * The same order everything else in PHOS uses. Somebody who memorized
 * Juz 30 first learned those pages as a block and recites them as one;
 * rotating in Mushaf order would split their Hifz across opposite ends
 * of the cycle for no reason they would recognise.
 *
 * WHY THE POSITION COMES FROM A STORED DATE
 * -----------------------------------------
 * `cycleStartedAt` is a stored fact, and the day of the cycle is
 * computed from it. Deriving position from the last completed session
 * instead would restart the rotation every time the user missed a day —
 * which is precisely when a person most needs to be told where they
 * had got to.
 */
export function calculateRevisionCycle(
  pages: readonly Page[],
  input: {
    cycleLengthDays: number;
    cycleStartedAt: Date | null;
    availableStudyMinutes: number;
    memorizationOrder: readonly number[];
  },
  referenceDate: Date,
): RevisionCyclePlan {
  const cycleLengthDays = Math.max(1, Math.round(input.cycleLengthDays));

  const scope = orderPages(
    pages.filter((page) => page.memoryState !== MemoryState.Unseen),
    input.memorizationOrder,
  );

  const pagesPerDay = Math.max(1, Math.ceil(scope.length / cycleLengthDays));

  /*
   * Day zero is the day the cycle began. A cycle with no stored start
   * has not run yet, so today is treated as its first day rather than
   * as an error — the repository stamps the date the moment the user
   * chooses the mode, so this is only reachable for a record written
   * before Phase 12.
   */
  const daysElapsed = input.cycleStartedAt
    ? Math.max(
        0,
        Math.floor(
          (startOfLocalDay(referenceDate).getTime() -
            startOfLocalDay(input.cycleStartedAt).getTime()) /
            MILLISECONDS_PER_DAY,
        ),
      )
    : 0;

  const dayIndex = daysElapsed % cycleLengthDays;
  const passesCompleted = Math.floor(daysElapsed / cycleLengthDays);

  const todaysPageNumbers = scope
    .slice(dayIndex * pagesPerDay, (dayIndex + 1) * pagesPerDay)
    .map((page) => page.pageNumber);

  const estimatedMinutesPerDay = Math.round((pagesPerDay * CYCLE_REVISION_SECONDS_PER_PAGE) / 60);
  const exceedsDailyBudget =
    scope.length > 0 && estimatedMinutesPerDay > input.availableStudyMinutes;

  return {
    cycleLengthDays,
    dayOfCycle: dayIndex + 1,
    passesCompleted,
    pagesInCycle: scope.length,
    todaysPageNumbers,
    pagesPerDay,
    exceedsDailyBudget,
    estimatedMinutesPerDay,
    suggestedCycleLengthDays: exceedsDailyBudget
      ? suggestCycleLength(scope.length, input.availableStudyMinutes)
      : null,
  };
}

/**
 * Sorts pages into the user's memorization order.
 *
 * `memorizationOrder` is the roadmap's Juz sequence. A Juz missing from
 * it — because the user paused it — sorts to the end rather than being
 * dropped: a paused Juz is excluded from *new* memorization, but pages
 * already memorized inside it are still the user's Hifz and still need
 * revising. Silently removing them from the rotation would let a paused
 * Juz decay unseen.
 */
function orderPages(pages: readonly Page[], memorizationOrder: readonly number[]): readonly Page[] {
  // First occurrence wins. No roadmap produces a duplicate, but building
  // the map straight from `map()` would let a stray repeat overwrite a
  // Juz's real position with its last one — silently moving somebody's
  // Juz 30 from the front of their rotation to the back.
  const rank = new Map<number, number>();
  for (const [index, juzNumber] of memorizationOrder.entries()) {
    if (!rank.has(juzNumber)) rank.set(juzNumber, index);
  }

  return [...pages].sort((a, b) => {
    const aRank = rank.get(a.juzNumber) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b.juzNumber) ?? Number.MAX_SAFE_INTEGER;
    return aRank !== bRank ? aRank - bRank : a.pageNumber - b.pageNumber;
  });
}

/**
 * The shortest cycle whose daily portion fits the user's time.
 *
 * Offered rather than imposed. Unlike an exam, where the deadline and
 * the syllabus are both set by somebody else, a cycle length is the
 * user's own choice — so the honest response to "this does not fit" is
 * a specific number they can accept or ignore, not a warning with
 * nothing behind it.
 */
function suggestCycleLength(pagesInCycle: number, availableStudyMinutes: number): number | null {
  const pagesPerDayThatFit = Math.floor(
    (availableStudyMinutes * 60) / CYCLE_REVISION_SECONDS_PER_PAGE,
  );
  if (pagesPerDayThatFit <= 0) return null;

  const needed = Math.ceil(pagesInCycle / pagesPerDayThatFit);
  // Beyond the maximum there is nothing useful to suggest; the user's
  // stated daily time is simply too small for their volume, and saying
  // "try a 400-day cycle" would be worse than saying nothing.
  return needed > MAXIMUM_CYCLE_LENGTH_DAYS ? null : needed;
}
