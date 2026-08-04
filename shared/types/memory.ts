import type { ConfidenceLevel, MemoryState } from "./enums";

/**
 * A complete memory profile for one page (SDS Part 10 "MEMORY PROFILE").
 *
 * "The Memory Engine shall internally treat every page as a complete
 * memory profile. A memory profile consists of: MemoryState, Strength,
 * Stability, Difficulty. Confidence is treated as an event input rather
 * than a permanent memory attribute" — so Confidence is deliberately
 * excluded from this type.
 */
export interface MemoryProfile {
  readonly pageId: string;
  readonly memoryState: MemoryState;
  readonly memoryStrength: number;
  readonly memoryStability: number;
  readonly difficulty: number;
}

/**
 * An objective learning event supplied to the Memory Engine
 * (SDS Part 10 "INPUT CONTRACT"). Represents one completed recall
 * attempt, before it has been evaluated and turned into an updated
 * MemoryProfile.
 *
 * The Memory Engine never consumes calculated analytics — every field
 * here is an objective fact, not a derived metric.
 */
export interface RecallOutcome {
  readonly pageId: string;
  readonly sessionId: string;
  readonly successfulRecall: boolean;
  readonly confidence: ConfidenceLevel;
  readonly durationSeconds: number;
  /** Time elapsed since this page's previous review, in seconds. */
  readonly secondsSinceLastReview: number | null;
  readonly timestamp: Date;
}

/**
 * The result of processing one RecallOutcome through the Memory Engine
 * (SDS Part 10 "OUTPUT CONTRACT"): an updated memory profile, not yet
 * persisted. Persistence happens through the PageRepository, never
 * inside the Memory Engine itself.
 */
export interface MemoryUpdateResult {
  readonly previousProfile: MemoryProfile;
  readonly updatedProfile: MemoryProfile;
  /** Whether this update caused a MemoryState transition. */
  readonly stateChanged: boolean;
}
