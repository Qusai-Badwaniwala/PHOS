/**
 * The user's memorization roadmap (PRODUCT_REQUIREMENTS Requirement 2,
 * "Flexible Memorization Order").
 *
 * PHOS must never force one memorization sequence. Some people begin at
 * Juz 1, many begin at Juz 30, others follow a teacher's own plan. The
 * roadmap is the record of that choice, expressed at Juz granularity —
 * which is also the granularity Requirement 2 uses when it asks for
 * "pause an entire Juz".
 */

/** The number of Juz in the Mushaf. */
export const TOTAL_JUZ = 30;

/**
 * How a roadmap's Juz sequence is derived.
 *
 * The three built-in orders are computed from the Juz number itself, so
 * they need no stored sequence and cannot drift out of step. `Custom`
 * is the only one that reads `RoadmapEntry.position`.
 */
export enum MemorizationOrder {
  /** Juz 1 → 30. */
  Standard = "Standard",
  /** Juz 30 → 1. */
  Reverse = "Reverse",
  /** Juz 30 first (the common starting point), then Juz 1 → 29. */
  Juz30First = "Juz30First",
  /**
   * Juz 30 → 26, then Juz 1 → 25.
   *
   * Shaped by the exam ladder rather than by the Mushaf: the first three
   * stages examine Juz 30, then 28–30, then 26–30, so somebody intending
   * to sit exams from the start needs the last five Juz before anything
   * else. Descending within that block is deliberate — 30, then 29 and
   * 28 completes the second stage, then 27 and 26 completes the third.
   * Ascending 26 → 30 would leave the first stage unreachable until the
   * whole block was finished.
   */
  ExamOrder = "ExamOrder",
  /** A sequence the user arranged themselves, or their teacher set. */
  Custom = "Custom",
}

/** One Juz's place in the roadmap. */
export interface RoadmapEntry {
  readonly id: string;
  readonly juzNumber: number;
  /** Only meaningful when the order is `Custom`. */
  readonly position: number;
  /** Temporarily excluded from *new* memorization; existing progress is untouched. */
  readonly paused: boolean;
}

/**
 * A resolved roadmap: the Juz sequence to memorize, in order, with
 * paused Juz already removed.
 *
 * This is a computed view, never persisted — consistent with the SDS's
 * "Store Facts. Compute Insights." The stored facts are the chosen
 * order and each Juz's paused flag; the sequence is derived from them.
 */
export interface MemorizationRoadmap {
  readonly order: MemorizationOrder;
  /** Juz numbers in memorization order, excluding paused Juz. */
  readonly juzSequence: readonly number[];
  /** Juz currently paused, in ascending order. */
  readonly pausedJuz: readonly number[];
}

/**
 * Derives the Juz sequence for a set of roadmap entries.
 *
 * Paused Juz are removed rather than moved to the end: a paused Juz is
 * not "lower priority", it is "not right now". Leaving it in the
 * sequence would let PHOS schedule it as soon as everything ahead was
 * finished, which is not what pausing means.
 */
export function resolveRoadmap(
  order: MemorizationOrder,
  entries: readonly RoadmapEntry[],
): MemorizationRoadmap {
  const active = entries.filter((entry) => !entry.paused);

  const sorted = [...active].sort((a, b) => {
    switch (order) {
      case MemorizationOrder.Reverse:
        return b.juzNumber - a.juzNumber;
      case MemorizationOrder.Juz30First:
        // Juz 30 leads; everything else keeps its natural order behind
        // it. Expressed as a sort key so the comparator stays total.
        return juz30FirstKey(a.juzNumber) - juz30FirstKey(b.juzNumber);
      case MemorizationOrder.ExamOrder:
        return examOrderKey(a.juzNumber) - examOrderKey(b.juzNumber);
      case MemorizationOrder.Custom:
        // `position` is user-arranged and not guaranteed distinct, so
        // Juz number breaks ties and keeps the result deterministic.
        return a.position !== b.position ? a.position - b.position : a.juzNumber - b.juzNumber;
      case MemorizationOrder.Standard:
      default:
        return a.juzNumber - b.juzNumber;
    }
  });

  return {
    order,
    juzSequence: sorted.map((entry) => entry.juzNumber),
    pausedJuz: entries
      .filter((entry) => entry.paused)
      .map((entry) => entry.juzNumber)
      .sort((a, b) => a - b),
  };
}

function juz30FirstKey(juzNumber: number): number {
  return juzNumber === TOTAL_JUZ ? 0 : juzNumber;
}

/** The first Juz of the descending exam block, i.e. Juz 26. */
const EXAM_BLOCK_FIRST_JUZ = 26;

/**
 * Sort key for `ExamOrder`: 30, 29, 28, 27, 26, then 1 → 25.
 *
 * The last five Juz descend so that each exam stage completes as early
 * as possible; everything else follows in Mushaf order behind them.
 */
function examOrderKey(juzNumber: number): number {
  const examBlockLength = TOTAL_JUZ - EXAM_BLOCK_FIRST_JUZ + 1;
  return juzNumber >= EXAM_BLOCK_FIRST_JUZ
    ? TOTAL_JUZ - juzNumber
    : examBlockLength - 1 + juzNumber;
}

/**
 * Builds a lookup from Juz number to its index in the sequence.
 *
 * A Juz that is absent (because it is paused) is deliberately not in
 * the map — callers use that absence to exclude its pages from new
 * memorization, rather than needing a second paused-check.
 */
export function toJuzPriority(roadmap: MemorizationRoadmap): ReadonlyMap<number, number> {
  return new Map(roadmap.juzSequence.map((juzNumber, index) => [juzNumber, index]));
}
