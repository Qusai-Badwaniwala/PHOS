import type { ConfidenceLevel } from "./enums";

/**
 * Domain-safe representation of a persisted RecallEvent.
 *
 * Mirrors the `RecallEvent` Prisma model (SDS Part 8). Immutable and
 * append-only: once created, a RecallEvent is never updated or deleted
 * (SDS Part 8 "RECALLEVENT MODEL — Rules").
 */
export interface RecallEvent {
  readonly id: string;
  readonly pageId: string;
  readonly sessionId: string;
  readonly timestamp: Date;
  readonly successfulRecall: boolean;
  readonly confidence: ConfidenceLevel;
  readonly durationSeconds: number;
}
