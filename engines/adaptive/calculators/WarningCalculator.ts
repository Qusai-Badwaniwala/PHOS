import { WorkloadCategory } from "@/shared/types";
import type { WorkloadWarning } from "@/shared/types";
import type { RankedPage } from "./PlanningCalculator";

/**
 * A day is called heavy once this many pages are scheduled.
 *
 * A count, not a duration. An earlier version compared the plan's
 * estimated minutes against the user's budget — which could never
 * fire, because `allocateStudyTime()` already guarantees the plan fits
 * inside that budget. The comparison was dead code dressed as a safety
 * check.
 */
const HEAVY_DAY_PAGE_COUNT = 40;

/**
 * A backlog worth mentioning: this many pages were genuinely due but
 * did not fit today.
 *
 * A couple spilling over is ordinary and warning about it would be the
 * daily noise Requirement 4 rules out. A sustained overflow is the
 * honest signal that revision is outpacing the time available.
 */
const BACKLOG_THRESHOLD = 10;

/**
 * Notices when today's plan is unusually heavy
 * (PRODUCT_REQUIREMENTS Requirement 7).
 *
 * This deliberately does not change the plan. A hard revision cap was
 * considered and rejected: dropping pages that are genuinely due lets
 * them decay and returns them later as Recovery work, trading a
 * comfortable today for a worse month. Requirement 9 is explicit —
 * "PHOS recommends. The user decides." So the plan stays intact and
 * the user is simply told, with a concrete number for what they could
 * safely leave.
 *
 * `deferrablePages` counts only the lowest-priority tail: long-term
 * checks on pages already known well. Recovery and overdue work is
 * never offered up, because that is precisely the work that costs most
 * to postpone.
 */
export function detectWorkloadWarning(
  allocated: readonly RankedPage[],
  availableStudyMinutes: number,
  dueButNotScheduled = 0,
): WorkloadWarning | null {
  if (allocated.length === 0) return null;

  const estimatedSeconds = allocated.reduce(
    (total, page) => total + page.estimatedDurationSeconds,
    0,
  );
  const estimatedMinutes = Math.round(estimatedSeconds / 60);

  const manyPages = allocated.length >= HEAVY_DAY_PAGE_COUNT;
  const backlogBuilding = dueButNotScheduled >= BACKLOG_THRESHOLD;

  if (!manyPages && !backlogBuilding) return null;

  const deferrablePages = allocated.filter(
    (page) => page.category === WorkloadCategory.LongTermRevision,
  ).length;

  return {
    estimatedMinutes,
    availableMinutes: availableStudyMinutes,
    deferrablePages,
    message: buildMessage(
      allocated.length,
      estimatedMinutes,
      deferrablePages,
      backlogBuilding ? dueButNotScheduled : 0,
    ),
  };
}

/**
 * Written to Requirement 7's supportive tone. It states the size of the
 * day, gives permission to stop early, and — crucially — says nothing
 * is lost by doing so, because that is true: unstudied pages are simply
 * rescheduled.
 */
function buildMessage(
  pageCount: number,
  estimatedMinutes: number,
  deferrablePages: number,
  backlog: number,
): string {
  const opening =
    `Today's plan is a long one — ${pageCount} page${pageCount === 1 ? "" : "s"}, ` +
    `roughly ${estimatedMinutes} minutes.`;

  // A backlog is the more useful thing to say when there is one: it
  // explains that the day is capped by time rather than by everything
  // being done, which is otherwise invisible.
  if (backlog > 0) {
    return (
      `${opening} Another ${backlog} page${backlog === 1 ? " is" : "s are"} due but did not fit, so ` +
      `revision is running ahead of the time you have. Giving it a few more minutes a day, or ` +
      `simply carrying on steadily, both work — nothing is lost while it waits.`
    );
  }

  if (deferrablePages > 0) {
    return (
      `${opening} If that is more than you have, the last ${deferrablePages} ` +
      `${deferrablePages === 1 ? "page is a long-term check" : "pages are long-term checks"} on ` +
      `material you know well — leaving ${deferrablePages === 1 ? "it" : "them"} for another day ` +
      `costs the least. Nothing you skip is lost; it simply comes back.`
    );
  }

  return (
    `${opening} Do what you can and finish early if you need to — anything left is rescheduled, ` +
    `not lost. Steady beats complete.`
  );
}
