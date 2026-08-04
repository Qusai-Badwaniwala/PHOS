import { WorkloadCategory } from "@/shared/types";

/**
 * Externally configurable Adaptive Engine coefficients (SDS Part 11
 * "CONFIGURATION CONTRACT": "Adaptive coefficients shall be externally
 * configurable... shall not be hard-coded throughout the engine...
 * Configuration changes shall not require architectural
 * modification.").
 *
 * The SDS specifies the *behavioral invariants* these coefficients
 * must satisfy (Recovery always outranks everything else, retention
 * work always outranks new memorization, scheduling is deterministic
 * and never calendar-based) but not their exact values — every value
 * in `DEFAULT_ADAPTIVE_CONFIG` below is a documented, reasonable
 * default, not a specified one. Composing `AdaptiveEngine` with a
 * different `AdaptiveEngineConfig` changes its behavior with no code
 * changes, satisfying "Configuration changes shall not require
 * architectural modification."
 */
export interface AdaptiveEngineConfig {
  /**
   * Base score for each workload category, establishing the
   * invariant priority order from SDS Part 11 "WORKLOAD PRIORITY":
   * Recovery > Overdue Revision > Recent Revision > Long-Term Revision
   * > New Memorization. Must be set so no combination of
   * within-category adjustments can ever cross a category boundary.
   */
  readonly categoryBaseScores: Readonly<Record<WorkloadCategory, number>>;

  /** Weight applied to "how many days overdue" within a category's score. */
  readonly overdueWeight: number;

  /** Weight applied to a page's difficulty within a category's score. */
  readonly difficultyWeight: number;

  /** Weight applied to "how weak" (1 - memoryStrength) a page is within a category's score. */
  readonly weaknessWeight: number;

  /**
   * A page qualifies for Recovery if its most recent recall failed, or
   * if its memory strength has fallen below this threshold — driven
   * by objective learning history, never punitive (SDS Part 11
   * "RECOVERY MODE").
   */
  readonly recoveryStrengthThreshold: number;

  /** Multiplier applied to a page's own stability to determine when it becomes "due" — deliberately adaptive, per page, never a fixed calendar interval (SDS Part 11 "SCHEDULING PHILOSOPHY"). */
  readonly dueStabilityMultiplier: number;

  /** Multiplier applied to a page's own stability to determine when a due page counts as "overdue" rather than merely due. */
  readonly overdueStabilityMultiplier: number;

  /** Base estimated seconds to study one page, before difficulty adjustment (SDS Part 11 `estimateSessionDuration()`). */
  readonly baseDurationSeconds: number;

  /** How much a page's difficulty extends its estimated duration. */
  readonly difficultyDurationWeight: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveEngineConfig = {
  categoryBaseScores: {
    [WorkloadCategory.Recovery]: 10_000,
    [WorkloadCategory.OverdueRevision]: 8_000,
    [WorkloadCategory.RecentRevision]: 6_000,
    [WorkloadCategory.LongTermRevision]: 4_000,
    [WorkloadCategory.NewMemorization]: 2_000,
  },
  overdueWeight: 5,
  difficultyWeight: 20,
  weaknessWeight: 30,
  recoveryStrengthThreshold: 0.25,
  dueStabilityMultiplier: 1,
  overdueStabilityMultiplier: 1.5,
  baseDurationSeconds: 60,
  difficultyDurationWeight: 90,
};
