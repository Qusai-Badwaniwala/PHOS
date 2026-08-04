/**
 * Memory Engine calibration constants.
 *
 * SDS Part 10 specifies the *behavioral invariants* the memory model
 * must satisfy (strength changes quickly, stability changes gradually,
 * difficulty never jumps abruptly, confidence modulates but never
 * overrides objective recall, state transitions are deterministic and
 * bounded to one step at a time) but does not specify an exact
 * mathematical formula or numeric thresholds — that is intentionally
 * left to the implementation.
 *
 * Every constant below is a documented, reasonable default calibration
 * chosen to satisfy those invariants deterministically. None of them
 * come from the SDS directly; they are flagged here rather than
 * silently presented as specified values, and are the first place to
 * adjust if real usage data suggests different pacing.
 */

/** Strength and difficulty are modeled on a normalized [0, 1] scale. */
export const MIN_NORMALIZED = 0;
export const MAX_NORMALIZED = 1;

/**
 * Floor applied to stability before using it as a decay time-constant,
 * so a brand-new page (stability 0) does not cause division by zero.
 * Expressed in days.
 */
export const MIN_STABILITY_DAYS = 1;

/** How much a single successful recall increases strength, before the diminishing-returns factor and confidence modulation. */
export const BASE_STRENGTH_GAIN = 0.35;

/** How much a single failed recall decreases strength, as a fraction of the current (post-decay) strength. Deliberately not punitive — a fraction, not a fixed penalty. */
export const FAILURE_STRENGTH_PENALTY_FACTOR = 0.3;

/** How much a single successful recall increases stability (in days), before confidence modulation. Small relative to typical stability values, so stability moves gradually across many reviews rather than in one jump. */
export const BASE_STABILITY_GAIN_DAYS = 1.5;

/**
 * Time constant (in days) governing how slowly stability itself decays
 * between reviews. Deliberately large so stability "decreases slowly
 * over time" (SDS Part 10) rather than tracking recent performance
 * closely the way strength does.
 */
export const STABILITY_DECAY_TIME_CONSTANT_DAYS = 180;

/**
 * How much a single recall event may adjust difficulty. Small by
 * design, satisfying "Difficulty shall never change abruptly from a
 * single recall event."
 */
export const DIFFICULTY_LEARNING_RATE = 0.02;

/** Confidence modulates the magnitude of a strength/stability increase on success only; it never determines direction and is never consulted at all on failure. */
export const CONFIDENCE_MULTIPLIER = {
  Low: 0.9,
  Medium: 1.0,
  High: 1.1,
} as const;

/**
 * Thresholds a page's (strength, stability) must both meet to qualify
 * for each state at or above `Encoding`. Scanned from the highest
 * state downward; the first satisfied threshold is the page's
 * "natural" target state before the one-step-per-event clamp is
 * applied (see `StateCalculator`).
 */
export const STATE_THRESHOLDS = {
  Mastered: { minStrength: 0.85, minStabilityDays: 21 },
  Stable: { minStrength: 0.7, minStabilityDays: 10 },
  Growing: { minStrength: 0.5, minStabilityDays: 3 },
  Fragile: { minStrength: 0.3, minStabilityDays: 0 },
  Encoding: { minStrength: 0, minStabilityDays: 0 },
} as const;
