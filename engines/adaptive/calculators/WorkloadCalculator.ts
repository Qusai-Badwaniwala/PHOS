import type { RecallEvent } from "@/shared/types";
import { ConfidenceLevel } from "@/shared/types";

/**
 * What PHOS has actually observed about the user recently.
 *
 * Every field is a measured fact over a trailing window, never a stored
 * judgement about the user. That is the mechanism by which
 * PRODUCT_REQUIREMENTS Requirement 3's "PHOS must never permanently
 * classify users" and Requirement 8's "A user who struggled six months
 * ago may become an excellent memorizer" are satisfied structurally:
 * there is no label to become stale, and old evidence ages out of the
 * window on its own.
 */
export interface PerformanceObservation {
  /** Recall events inside the observation window, oldest first. */
  readonly recallEvents: readonly RecallEvent[];
  /** Distinct days in the window on which the user studied. */
  readonly activeDays: number;
  /** Length of the window in days. */
  readonly windowDays: number;
  /** New pages taken on during the window. */
  readonly newPagesStudied: number;
}

/** Which way the workload moved relative to the user's own stated comfort. */
export type WorkloadDirection = "increase" | "steady" | "reduce";

export interface WorkloadRecommendation {
  /** Pages of *new* memorization to schedule today. */
  readonly recommendedNewPages: number;
  /** How much of this came from observation rather than the onboarding estimate. */
  readonly basis: "onboarding" | "blended" | "observed";
  readonly successRate: number | null;
  readonly observedDailyPace: number | null;
  readonly consistency: number | null;
  readonly direction: WorkloadDirection;
  /** Plain-language reason, for Requirement 4. Empty when nothing notable changed. */
  readonly rationale: string;
}

/**
 * How many recall events must exist before observation influences the
 * workload at all.
 *
 * Requirement 7: "Never increase workload based on one unusually good
 * session. Never reduce workload because of one unusually poor
 * session." A minimum sample is how that rule is enforced — below this
 * threshold the user's own onboarding estimate stands untouched.
 */
const MIN_EVENTS_FOR_SIGNAL = 20;

/** Sample size at which observation fully replaces the onboarding estimate. */
const FULLY_OBSERVED_EVENTS = 100;

/** Recall success rates bounding "retention is holding" (Requirement 7). */
const STRONG_RETENTION = 0.85;
const WEAK_RETENTION = 0.7;

/**
 * Bounds on how far the recommendation may drift from what the user
 * said they were comfortable with.
 *
 * Requirement 7 asks for adjustments that "feel gradual, natural, and
 * stable" and warns against "constantly increasing and decreasing
 * targets". Capping the drift means even a long run of strong sessions
 * cannot quietly double someone's daily load.
 */
const MAX_INCREASE_MULTIPLIER = 1.5;
const MAX_REDUCTION_MULTIPLIER = 0.4;

/**
 * Never schedule less than this, so a struggling user still moves
 * forward.
 *
 * A quarter page a day is one new page roughly every four days. The
 * floor exists so progress never reaches zero — Requirement 5's
 * "gradually rebuild momentum" — while still being slow enough for
 * someone who genuinely needs several days per page. Targets below one
 * are honoured across days by `capNewMemorization()`, not by
 * scheduling fractions of a page.
 */
const MINIMUM_NEW_PAGES = 0.25;

/**
 * Recommends today's new-memorization workload from the user's observed
 * performance (PRODUCT_REQUIREMENTS Requirements 3, 7 and 8).
 *
 * The governing rule is Requirement 7's: **when speed and retention
 * conflict, retention wins.** So the workload only rises when recall is
 * genuinely holding up, and falls as soon as it is not — the increase
 * needs evidence, the reduction does not need permission.
 *
 * `comfortableDailyPages` is the user's own onboarding answer. It is
 * the starting point and remains the anchor: observation shifts the
 * recommendation around it rather than replacing it outright, which is
 * what keeps a run of good days from compounding into a workload the
 * user never agreed to.
 */
export function recommendWorkload(
  observation: PerformanceObservation,
  comfortableDailyPages: number,
): WorkloadRecommendation {
  const { recallEvents, activeDays, windowDays, newPagesStudied } = observation;
  const sampleSize = recallEvents.length;

  // Not enough evidence to say anything. The user's own estimate stands.
  if (sampleSize < MIN_EVENTS_FOR_SIGNAL) {
    return {
      recommendedNewPages: comfortableDailyPages,
      basis: "onboarding",
      successRate: sampleSize > 0 ? successRateOf(recallEvents) : null,
      observedDailyPace: null,
      consistency: null,
      direction: "steady",
      rationale: "",
    };
  }

  const successRate = successRateOf(recallEvents);
  const observedDailyPace = activeDays > 0 ? newPagesStudied / activeDays : 0;
  const consistency = windowDays > 0 ? Math.min(1, activeDays / windowDays) : 0;

  // Observation's influence grows with the amount of evidence behind
  // it, so recommendations drift rather than jump as data accumulates
  // (Requirement 8: "recommendations should become increasingly
  // personalized").
  const observationWeight = Math.min(
    1,
    (sampleSize - MIN_EVENTS_FOR_SIGNAL) / (FULLY_OBSERVED_EVENTS - MIN_EVENTS_FOR_SIGNAL),
  );

  const retentionFactor = retentionFactorFor(successRate, confidenceRatioOf(recallEvents));

  // What the user actually sustains, blended toward what they said they
  // could sustain. A user quietly doing more than they planned is
  // followed; a user doing less is not pushed.
  const paceAnchor =
    observedDailyPace > 0
      ? comfortableDailyPages * (1 - observationWeight) + observedDailyPace * observationWeight
      : comfortableDailyPages;

  const raw = paceAnchor * retentionFactor;

  /*
   * The retention gate, and the single most important line in this
   * file: **the target may only exceed what the user said they were
   * comfortable with when recall is genuinely strong.**
   *
   * Without it, `paceAnchor` can overwhelm `retentionFactor` — a user
   * who worked through many pages badly looks "fast", and a fast pace
   * multiplied by even a heavy retention penalty could still land above
   * baseline. Verified live during Phase 6: a user recalling 45% was
   * handed an *increase*, described as "your recall has held at 45%".
   * That is precisely the failure Requirement 7 exists to prevent
   * ("Increase only when evidence consistently shows strong recall")
   * and the fabricated explanation Requirement 4 forbids.
   *
   * Expressed as a ceiling rather than folded into the multiplier so
   * the rule stays legible: pace may inform the target, but only
   * retention can raise it.
   */
  const ceiling =
    successRate >= STRONG_RETENTION
      ? comfortableDailyPages * MAX_INCREASE_MULTIPLIER
      : comfortableDailyPages;

  const recommendedNewPages = clamp(
    roundToHalf(raw),
    Math.max(MINIMUM_NEW_PAGES, comfortableDailyPages * MAX_REDUCTION_MULTIPLIER),
    ceiling,
  );

  return {
    recommendedNewPages,
    basis: observationWeight >= 1 ? "observed" : "blended",
    successRate,
    observedDailyPace,
    consistency,
    direction: directionOf(recommendedNewPages, comfortableDailyPages),
    rationale: rationaleFor(recommendedNewPages, comfortableDailyPages, successRate, consistency),
  };
}

function successRateOf(events: readonly RecallEvent[]): number {
  if (events.length === 0) return 1;
  const successes = events.filter((event) => event.successfulRecall).length;
  return successes / events.length;
}

/**
 * Net confidence signal in [-1, 1]: how much more often recall felt
 * strong than shaky.
 *
 * Confidence modulates but never overrides objective recall — the same
 * rule the Memory Engine follows (SDS Part 10). It is used here only to
 * temper the retention factor, never to set it.
 */
function confidenceRatioOf(events: readonly RecallEvent[]): number {
  if (events.length === 0) return 0;
  let net = 0;
  for (const event of events) {
    if (event.confidence === ConfidenceLevel.High) net += 1;
    else if (event.confidence === ConfidenceLevel.Low) net -= 1;
  }
  return net / events.length;
}

/**
 * Translates retention evidence into a workload multiplier
 * (Requirement 7's "WHEN TO INCREASE" / "WHEN TO REDUCE").
 *
 * Deliberately asymmetric. Increases are capped tightly (at most 10%)
 * and require recall to be genuinely strong; reductions run deeper and
 * begin as soon as recall softens. That asymmetry *is* "RETENTION
 * ALWAYS WINS" expressed numerically — the cost of being slightly too
 * slow is a few extra days, and the cost of being too fast is
 * forgetting pages already learned.
 */
function retentionFactorFor(successRate: number, confidenceRatio: number): number {
  if (successRate >= STRONG_RETENTION) {
    // Strong recall earns a small increase, tempered by how confident
    // those recalls felt.
    return 1 + 0.1 * Math.max(0, confidenceRatio);
  }

  if (successRate <= WEAK_RETENTION) {
    // Scales down with how far below the threshold recall has fallen,
    // rather than dropping to a fixed penalty.
    const shortfall = (WEAK_RETENTION - successRate) / WEAK_RETENTION;
    return Math.max(0.4, 1 - shortfall * 1.5);
  }

  // Between the thresholds: holding steady is the correct response.
  return 1;
}

function directionOf(recommended: number, baseline: number): WorkloadDirection {
  if (recommended > baseline + 0.01) return "increase";
  if (recommended < baseline - 0.01) return "reduce";
  return "steady";
}

/**
 * The user-facing reason for a workload change
 * (PRODUCT_REQUIREMENTS Requirement 4's own worked examples).
 *
 * Empty when the workload has not meaningfully moved — Requirement 4
 * asks PHOS to "explain only meaningful recommendations", and narrating
 * an unchanged target every day is exactly the noise it warns against.
 */
function rationaleFor(
  recommended: number,
  baseline: number,
  successRate: number,
  consistency: number,
): string {
  const direction = directionOf(recommended, baseline);
  if (direction === "steady") return "";

  const percent = Math.round(successRate * 100);

  // Keyed on the evidence, not on the direction. An earlier version
  // chose its wording from the direction alone and so announced "your
  // recall has held at 45%" alongside an increase — a sentence that was
  // both wrong and self-contradicting. The retention gate above now
  // makes an unearned increase impossible, and reading the same
  // threshold here means the wording cannot drift from the rule even if
  // that gate is ever changed.
  if (direction === "increase" && successRate >= STRONG_RETENTION) {
    return (
      `Your recall has held at ${percent}% recently${consistency >= 0.7 ? " across a consistent stretch of days" : ""}, ` +
      `so today's memorization target has increased slightly to ${formatPages(recommended)}.`
    );
  }

  if (direction === "increase") {
    return `Today's memorization target is ${formatPages(recommended)}.`;
  }

  return (
    `Recent recall has been closer to ${percent}%, which suggests new pages are not settling as ` +
    `firmly as they were. Today's target has eased to ${formatPages(recommended)} to protect what ` +
    `you already know. It rises again as your recall does.`
  );
}

function formatPages(pages: number): string {
  if (pages === 0.5) return "half a page";
  if (pages === 1) return "1 page";
  return `${pages} pages`;
}

/** Targets move in half-page steps: finer granularity is false precision for a page of Quran. */
function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
