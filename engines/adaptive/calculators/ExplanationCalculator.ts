import { ReturnStatus, WorkloadCategory } from "@/shared/types";
import type { PlanExplanation, ReturnAssessment } from "@/shared/types";
import type { RankedPage } from "./PlanningCalculator";

/**
 * Inputs the explanation is allowed to reason from — all facts the plan
 * was actually built with.
 *
 * The three "why was this left out" counts are passed separately and
 * pre-attributed, deliberately. An earlier version received the plan
 * before and after every cap and worked the difference out by
 * subtraction, which quietly credited the time budget with exclusions
 * the daily target had made — producing "59 pages did not fit in 60
 * minutes" on a day when the clock had excluded nothing at all. The
 * caller knows which rule dropped what; it should say so rather than
 * leave this function inferring it.
 */
export interface ExplanationInputs {
  /** The pages that made it into the final plan. */
  readonly allocated: readonly RankedPage[];
  readonly availableStudyMinutes: number;
  readonly returnAssessment: ReturnAssessment;
  /** New-memorization pages withheld by the return-to-study allowance. */
  readonly withheldByReturnPolicy: number;
  /** New-memorization pages beyond today's target, which is what governs new work. */
  readonly withheldByDailyTarget: number;
  /** Today's new-memorization target, in pages. */
  readonly dailyTarget: number;
  /**
   * Days until the pacing rule offers another new page, or `null` if it
   * would offer one today. Supplied by the engine rather than derived
   * here, so the sentence cannot name a day the scheduler disagrees
   * with.
   */
  readonly daysUntilNextNewPage?: number | null;
  /** Revision pages that were genuinely due but did not fit in the time budget. */
  readonly revisionDroppedForTime: number;
  /** Why the workload target moved, if it did. Empty when it held steady. */
  readonly workloadRationale: string;
}

/**
 * Builds the plain-language account of today's plan
 * (PRODUCT_REQUIREMENTS Requirement 4, "Transparent Recommendations").
 *
 * Two rules shape everything here.
 *
 * First, honesty: "No misleading or fabricated explanations are shown."
 * Every sentence below is computed from the same numbers the scheduler
 * used — how many pages fell into each workload category, how many were
 * dropped for time, how many were withheld after a break. This function
 * never guesses at a reason, and it says nothing when there is nothing
 * real to say.
 *
 * Second, restraint: "PHOS should explain only meaningful
 * recommendations. Routine operations should not constantly interrupt
 * the user." An ordinary day produces a short headline and little else;
 * detail appears only when something genuinely shaped the plan.
 *
 * Tone follows the requirement's "supportive rather than corrective"
 * instruction — the explanations describe what PHOS did, never what the
 * user failed to do.
 */
export function explainPlan(inputs: ExplanationInputs): PlanExplanation {
  const {
    allocated,
    availableStudyMinutes,
    returnAssessment,
    withheldByReturnPolicy,
    withheldByDailyTarget,
    dailyTarget,
    daysUntilNextNewPage = null,
    revisionDroppedForTime,
    workloadRationale,
  } = inputs;

  const counts = countByCategory(allocated);
  const newCount = counts[WorkloadCategory.NewMemorization];
  const recoveryCount = counts[WorkloadCategory.Recovery];
  const revisionCount = allocated.length - newCount;

  const details: string[] = [];

  // Leads, when present: a changed target is the single most important
  // thing to account for, and Requirement 4's own worked examples are
  // all workload changes.
  if (workloadRationale) {
    details.push(workloadRationale);
  }

  if (recoveryCount > 0) {
    details.push(
      `${plural(recoveryCount, "page")} ${recoveryCount === 1 ? "has" : "have"} weakened since ` +
        `you last recalled ${recoveryCount === 1 ? "it" : "them"}, so ${recoveryCount === 1 ? "it comes" : "they come"} first today. ` +
        `Restoring a page you already know is worth more than adding a new one.`,
    );
  }

  const overdueCount = counts[WorkloadCategory.OverdueRevision];
  if (overdueCount > 0) {
    details.push(
      `${plural(overdueCount, "page")} passed ${overdueCount === 1 ? "its" : "their"} ideal ` +
        `revision point. Reviewing ${overdueCount === 1 ? "it" : "them"} today protects your long-term retention.`,
    );
  }

  const longTermCount = counts[WorkloadCategory.LongTermRevision];
  if (longTermCount > 0) {
    details.push(
      `${plural(longTermCount, "page")} ${longTermCount === 1 ? "is" : "are"} due for a long-term ` +
        `check — these are pages you know well, revisited so they stay that way.`,
    );
  }

  if (withheldByReturnPolicy > 0) {
    details.push(
      `New memorization is lighter than usual today: ${plural(withheldByReturnPolicy, "page")} ` +
        `${withheldByReturnPolicy === 1 ? "was" : "were"} set aside so revision can catch up first. ` +
        `They return as soon as your recall steadies.`,
    );
  }

  // New memorization is governed by the daily target, not the clock, so
  // it is explained as a pace decision. Saying these pages "did not fit"
  // would blame the time budget for a limit the user themselves set.
  if (withheldByDailyTarget > 0) {
    // Naming the day matters more than the principle. "The rest of the
    // Mushaf waits its turn" told the user why today had nothing new
    // but not when that would change, which reads as a fault rather
    // than a pace — especially at a page every four days, where the
    // wait is long enough to look like PHOS has stopped working.
    const whenNext =
      daysUntilNextNewPage === null
        ? ""
        : daysUntilNextNewPage === 1
          ? ` Your next new page arrives tomorrow.`
          : ` Your next new page arrives in ${daysUntilNextNewPage} days.`;

    /*
     * "Revision only" is a claim about the day, and it is only true when
     * the day actually has no new page in it.
     *
     * `withheldByDailyTarget` counts pages the target held back relative
     * to the *uncapped* plan, which is routinely positive on a day that
     * still contains new memorization — hundreds of pages qualify and
     * one is scheduled. Asserting "today is revision only" from that
     * counter alone told a first-run user with a one-page target that
     * their day was revision only, directly above the new page they had
     * been given.
     */
    const restHeld =
      newCount === 0
        ? `so today is revision only.${whenNext}`
        : `so the rest of the Mushaf waits its turn.`;

    details.push(
      `Your daily target is ${formatPages(dailyTarget)}, ${restHeld} ` +
        `PHOS deliberately does not hand you more new pages than you can hold — pace is set by what ` +
        `your recall sustains, not by how much time is free.`,
    );
  }

  // Revision *is* governed by the clock, so this is the one place the
  // time budget is a truthful explanation.
  if (revisionDroppedForTime > 0) {
    details.push(
      `${plural(revisionDroppedForTime, "page")} due for revision did not fit in ${availableStudyMinutes} minutes and ` +
        `${revisionDroppedForTime === 1 ? "moves" : "move"} to a later day. The most urgent were kept.`,
    );
  }

  return {
    headline: buildHeadline(allocated.length, newCount, revisionCount, returnAssessment),
    details,
  };
}

function buildHeadline(
  total: number,
  newCount: number,
  revisionCount: number,
  returnAssessment: ReturnAssessment,
): string {
  if (total === 0) {
    return returnAssessment.status === ReturnStatus.NeverStudied
      ? "Nothing is scheduled yet — start whenever you are ready."
      : "Nothing is due today. Rest is part of the schedule.";
  }

  if (returnAssessment.status === ReturnStatus.LongBreak) {
    return `Today is revision only — ${plural(revisionCount, "page")} to rebuild your footing.`;
  }

  if (newCount === 0) {
    return `Today is revision: ${plural(revisionCount, "page")} to review.`;
  }

  if (revisionCount === 0) {
    return `Today is new memorization: ${plural(newCount, "page")}.`;
  }

  return (
    `Today: ${plural(revisionCount, "page")} to revise, then ${newCount} new. ` +
    `Revision comes first so what you already know stays secure.`
  );
}

function countByCategory(pages: readonly RankedPage[]): Record<WorkloadCategory, number> {
  const counts = {
    [WorkloadCategory.Recovery]: 0,
    [WorkloadCategory.OverdueRevision]: 0,
    [WorkloadCategory.RecentRevision]: 0,
    [WorkloadCategory.LongTermRevision]: 0,
    [WorkloadCategory.NewMemorization]: 0,
  };
  for (const page of pages) {
    counts[page.category] += 1;
  }
  return counts;
}

/** Renders a possibly-fractional page target the way a person would say it. */
function formatPages(pages: number): string {
  if (pages === 0.5) return "half a page a day";
  if (pages === 1) return "1 page a day";
  return `${pages} pages a day`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
