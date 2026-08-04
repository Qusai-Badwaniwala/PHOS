/**
 * Analytics Engine calibration constants.
 *
 * SDS Part 14 says Memory Health "may consider: Memory Strength,
 * Memory Stability, Recall history, Review frequency" and that
 * Retention Quality is "computed using historical learning data,"
 * without specifying an exact formula or weighting. Every value below
 * is a documented, reasonable default — not an SDS-specified value —
 * following the same "flag the assumption" approach used in the
 * Memory and Adaptive Engines.
 */

/** Stability (in days) that earns full credit toward Memory Health's stability component. A page need not exceed this to be considered fully stable for health purposes. */
export const HEALTH_STABILITY_REFERENCE_DAYS = 30;

/** Relative weight of average strength vs. normalized stability in the Memory Health blend. Must sum to 1. */
export const HEALTH_STRENGTH_WEIGHT = 0.7;
export const HEALTH_STABILITY_WEIGHT = 0.3;

/** Number of days considered "recent" vs. "previous" when comparing two windows for trend analysis. */
export const TREND_WINDOW_DAYS: Readonly<Record<string, number>> = {
  Daily: 1,
  Weekly: 7,
  Monthly: 30,
  Overall: 90,
};

/** Minimum absolute change in success ratio (0-1 scale) between two windows before a trend is reported as Improving/Declining rather than Stable. */
export const TREND_STABLE_THRESHOLD = 0.05;
