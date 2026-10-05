import type { MemoryState, WorkloadCategory } from "./enums";

/**
 * One scheduled learning item within a Daily Study Plan
 * (SDS Part 11 "PRIMARY OUTPUT"; field shape aligned with
 * `StudyItemDTO` in Part 16, minus presentation-only concerns).
 */
export interface StudyItem {
  readonly pageId: string;
  readonly pageNumber: number;
  readonly memoryState: MemoryState;
  readonly workloadCategory: WorkloadCategory;
  /** Which of the 30 Juz this page belongs to. Carried for presentation context. */
  readonly juzNumber: number;
  /** Position of this item within the plan's recommended sequence. */
  readonly recommendedOrder: number;
  readonly estimatedDurationSeconds: number;
}

/**
 * The complete Daily Study Plan produced by the Adaptive Engine
 * (SDS Part 11 "PRIMARY OUTPUT" / "PLAN GENERATION CONTRACT").
 *
 * Given identical inputs, plan generation is deterministic — the same
 * inputs always produce an identical plan. Random scheduling is
 * prohibited.
 */
export interface DailyStudyPlan {
  /** Ordered by `recommendedOrder`. */
  readonly studyItems: readonly StudyItem[];
  readonly estimatedTotalDurationSeconds: number;
  readonly recoveryRecommended: boolean;
  /** The available study time constraint used to build this plan. */
  readonly availableStudyMinutes: number;
  readonly generatedAt: Date;
  /** Why today's plan looks the way it does (PRODUCT_REQUIREMENTS Requirement 4). */
  readonly explanation: PlanExplanation;
  /** How long the user has been away, and how the plan responded (Requirement 5). */
  readonly returnAssessment: ReturnAssessment;
  /** Today's new-memorization target, observed from real performance (Requirements 3, 7, 8). */
  readonly workload: WorkloadSummary;
  /** Present only when today's plan is unusually heavy (Requirement 7). `null` otherwise. */
  readonly workloadWarning: WorkloadWarning | null;
}

/**
 * The workload PHOS settled on for today, and the evidence behind it
 * (PRODUCT_REQUIREMENTS Requirements 3, 7 and 8).
 *
 * Exposed rather than kept internal because Requirement 4 requires that
 * "Users understand why recommendations change" — a target that moves
 * without a visible reason is exactly the arbitrary-feeling behaviour
 * that erodes trust.
 */
export interface WorkloadSummary {
  readonly recommendedNewPages: number;
  /** Whether this came from the onboarding estimate, observation, or a blend. */
  readonly basis: "onboarding" | "blended" | "observed";
  readonly successRate: number | null;
  readonly observedDailyPace: number | null;
  readonly consistency: number | null;
  readonly direction: "increase" | "steady" | "reduce";
  /** Empty when the workload has not meaningfully moved. */
  readonly rationale: string;
}

/**
 * A plain-language account of today's plan
 * (PRODUCT_REQUIREMENTS Requirement 4, "Transparent Recommendations").
 *
 * Every string here is derived from facts the engine actually used —
 * page counts per workload category, the time budget, days away. The
 * requirement is explicit that "No misleading or fabricated
 * explanations are shown", so nothing in this type may be produced by
 * a separate narrative layer that guesses at the engine's reasoning:
 * if the engine did not use it, it does not get mentioned.
 */
export interface PlanExplanation {
  /** One supportive sentence summarising the day. */
  readonly headline: string;
  /** Short supporting points, each tied to a real scheduling decision. */
  readonly details: readonly string[];
}

/**
 * A notice that today's plan is unusually heavy
 * (PRODUCT_REQUIREMENTS Requirement 7, "Preventing burnout is better
 * than maximizing daily workload").
 *
 * Deliberately a *warning* and not a cap. Silently trimming revision
 * would leave genuinely due pages unreviewed, which decays them and
 * returns them later as Recovery work — a comfortable today bought at
 * the cost of a worse month. Requirement 9 settles it: "PHOS
 * recommends. The user decides." So PHOS says the day looks long,
 * names what it would set aside, and leaves the choice alone.
 */
export interface WorkloadWarning {
  /** Estimated minutes the full plan needs. */
  readonly estimatedMinutes: number;
  /** The budget the user said they had. */
  readonly availableMinutes: number;
  /** Pages that could be deferred with least cost, lowest priority first. */
  readonly deferrablePages: number;
  readonly message: string;
}

/** How PHOS classifies a gap since the user's last session (Requirement 5). */
export enum ReturnStatus {
  /** Studied today or yesterday — nothing to adjust. */
  Current = "Current",
  /** A few days away. Revision leads; new memorization continues at a reduced pace. */
  ShortBreak = "ShortBreak",
  /** A week or more. New memorization is heavily reduced to protect retention. */
  ExtendedBreak = "ExtendedBreak",
  /** A month or more. Rebuilding retention comes before any new memorization. */
  LongBreak = "LongBreak",
  /** No session has ever been completed. */
  NeverStudied = "NeverStudied",
}

/**
 * The result of checking how long the user has been away
 * (PRODUCT_REQUIREMENTS Requirement 5, "Recovery After Missed Days").
 *
 * Requirement 5 is emphatic that returning must never feel like
 * failure: "PHOS should always encourage returning, never punish
 * absence." So this type carries no notion of a broken streak or missed
 * target — only how many days passed and how much new memorization the
 * plan will take on as a result.
 */
export interface ReturnAssessment {
  readonly status: ReturnStatus;
  /** Whole days since the last completed session; `null` if there has never been one. */
  readonly daysSinceLastSession: number | null;
  /**
   * Fraction of the normal new-memorization load this plan will allow,
   * from 1 (unchanged) down to 0 (revision only).
   */
  readonly newMemorizationAllowance: number;
  /** Shown when the user has been away; `null` when there is nothing to say. */
  readonly welcomeBackMessage: string | null;
}

/**
 * Concise reasoning for one scheduling decision within a plan
 * (SDS Part 11 "EXPLAINABILITY CONTRACT"). The SDS gives example
 * reason categories (overdue review, weak memory stability, recovery
 * priority, recent recall failure) without defining a closed,
 * exhaustive set, so `reason` is intentionally a descriptive string
 * rather than a fixed enum.
 */
export interface PlanItemExplanation {
  readonly pageId: string;
  readonly reason: string;
}

/**
 * Today's portion of a traditional revision cycle (Phase 12).
 *
 * A fixed rotation through everything memorized, in the user's own
 * order, repeating forever — the Manzil pattern. Unlike an exam's
 * run-up this has no end date and is not a coverage *promise* against a
 * deadline; it is simply where the rotation has reached.
 */
export interface RevisionCyclePlan {
  /** Days in a full pass. */
  readonly cycleLengthDays: number;
  /** Which day of the current pass today is, 1-based. */
  readonly dayOfCycle: number;
  /** Scheduled cycles elapsed, not a count of completed study passes. */
  readonly passesCompleted: number;
  /** Everything memorized, which is what the cycle rotates through. */
  readonly pagesInCycle: number;
  /** Today's portion, in the user's memorization order. */
  readonly todaysPageNumbers: readonly number[];
  readonly pagesPerDay: number;
  /**
   * Set when the daily portion will not fit the user's stated time.
   *
   * Unlike an exam's equivalent, this one is actionable: the cycle
   * length is the user's own choice, so PHOS can honestly suggest a
   * longer one rather than only reporting the problem.
   */
  readonly exceedsDailyBudget: boolean;
  readonly estimatedMinutesPerDay: number;
  /** A cycle length that would fit the budget, when the current one does not. */
  readonly suggestedCycleLengthDays: number | null;
}
