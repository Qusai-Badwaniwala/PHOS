/**
 * The traditional revision cycle (Phase 12).
 *
 * A fixed rotation through everything memorized, in the user's own
 * order, repeating forever. This is the Manzil pattern most Hifz
 * institutions teach, and PHOS offers it because Requirement 9 settles
 * the argument about which approach is better: "PHOS recommends. The
 * user decides."
 */

/**
 * Days in a full pass, when the user has not said otherwise.
 *
 * Seven is the most common taught cycle — a week's rotation, one
 * portion a day, the pattern behind the word Manzil itself. It is also
 * short enough that a beginner with two Juz is not asked for one page a
 * day, and long enough that a Hafiz is not asked for eighty-six.
 */
export const DEFAULT_CYCLE_LENGTH_DAYS = 7;

/**
 * Bounds on the cycle length.
 *
 * A one-day cycle means reciting the entire Mushaf daily, which no
 * schedule can honour; beyond ninety days a "cycle" stops describing
 * anything a person experiences as a rotation. Both are sanity limits
 * rather than judgements — the usual choices sit between 7 and 30.
 */
export const MINIMUM_CYCLE_LENGTH_DAYS = 3;
export const MAXIMUM_CYCLE_LENGTH_DAYS = 90;
