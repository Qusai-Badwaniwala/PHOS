import type { MemoryProfile, MemoryUpdateResult, RecallOutcome, MemoryState } from "@/shared/types";

/**
 * Public contract of the Memory Engine (SDS Part 10 "PUBLIC
 * INTERFACE").
 */
export interface IMemoryEngine {
  /**
   * Pure calculation: given a page's current memory profile and one
   * recall outcome, computes the updated profile without reading or
   * writing anything. Used internally by `applyRecallResult()`, and
   * exposed directly for testability and for callers that already
   * have a loaded profile in hand.
   */
  calculateMemoryUpdate(profile: MemoryProfile, outcome: RecallOutcome): MemoryUpdateResult;

  /**
   * The full recall processing pipeline (SDS Part 10 "PROCESSING
   * PIPELINE"): loads the page's current profile, calculates the
   * update, persists the updated profile and state, records the
   * RecallEvent, and updates review timestamps.
   */
  applyRecallResult(outcome: RecallOutcome): Promise<MemoryUpdateResult>;

  updateStrength(
    previousStrength: number,
    previousStabilityDays: number,
    elapsedDays: number,
    outcome: Pick<RecallOutcome, "successfulRecall" | "confidence">,
  ): number;

  updateStability(
    previousStabilityDays: number,
    elapsedDays: number,
    outcome: Pick<RecallOutcome, "successfulRecall" | "confidence">,
  ): number;

  updateDifficulty(previousDifficulty: number, successfulRecall: boolean): number;

  determineMemoryState(
    previousState: MemoryState,
    newStrength: number,
    newStabilityDays: number,
  ): MemoryState;

  validateStateTransition(from: MemoryState, to: MemoryState): boolean;

  getCurrentMemoryProfile(pageId: string): Promise<MemoryProfile>;

  /**
   * Establishes an initial memory profile for pages the user tells
   * PHOS they had already memorized before installing it
   * (PRODUCT_REQUIREMENTS Requirement 1 — "Huffaz are supported").
   *
   * This is *initialization*, not a state transition, which is why it
   * lives here rather than being expressed as synthetic recall events:
   * it sets a starting condition where none existed, so the
   * one-step-per-event rule enforced by `validateStateTransition()`
   * does not apply. Keeping it inside the Memory Engine preserves the
   * rule that matters — that this engine remains the only writer of
   * `memoryState` (SDS Part 10).
   *
   * Only `Unseen` pages are touched. A page PHOS has already observed
   * has real evidence behind its profile, and an estimate must never
   * overwrite evidence.
   *
   * Review dates are staggered across a revision cycle sized to the
   * volume, so the pages arrive as a steady stream rather than one
   * block that recurs together forever. `dailyRevisionCapacity` shapes
   * that spread — roughly how many pages a day the user can revise.
   *
   * Returns how many pages were seeded.
   */
  seedPriorMemorization(
    pageIds: readonly string[],
    dueImmediately: boolean,
    dailyRevisionCapacity?: number,
  ): Promise<number>;

  /**
   * Repairs revision seeded into an interleaved cycle, turning it into
   * the contiguous blocks seeding now produces.
   *
   * Preserves the exact set of review dates and only changes which page
   * carries which, so the daily workload cannot move. Pages with real
   * recall history are left untouched.
   *
   * Returns how many pages were rewritten.
   */
  reblockSeededRevision(pageIdsInMemorizationOrder: readonly string[]): Promise<number>;
}
