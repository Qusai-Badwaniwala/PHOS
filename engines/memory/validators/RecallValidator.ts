import { ConfidenceLevel } from "@/shared/types";
import type { RecallOutcome } from "@/shared/types";
import { InvalidConfidenceError, MissingRecallDataError } from "../errors";

const VALID_CONFIDENCE_LEVELS: readonly string[] = Object.values(ConfidenceLevel);

/**
 * Validates a `RecallOutcome` carries everything the Memory Engine
 * needs before any calculation runs (SDS Part 10 "INPUT CONTRACT").
 * This is domain validation local to the Memory Engine, not the
 * general request Validation Layer (a separate, later concern).
 */
export function validateRecallOutcome(outcome: RecallOutcome, correlationId: string): void {
  if (!outcome.pageId) {
    throw new MissingRecallDataError("pageId", correlationId);
  }
  if (!outcome.sessionId) {
    throw new MissingRecallDataError("sessionId", correlationId);
  }
  if (typeof outcome.successfulRecall !== "boolean") {
    throw new MissingRecallDataError("successfulRecall", correlationId);
  }
  if (!VALID_CONFIDENCE_LEVELS.includes(outcome.confidence)) {
    throw new InvalidConfidenceError(String(outcome.confidence), correlationId);
  }
  if (typeof outcome.durationSeconds !== "number" || outcome.durationSeconds < 0) {
    throw new MissingRecallDataError("durationSeconds", correlationId, {
      receivedValue: outcome.durationSeconds,
    });
  }
  if (
    outcome.secondsSinceLastReview !== null &&
    (typeof outcome.secondsSinceLastReview !== "number" || outcome.secondsSinceLastReview < 0)
  ) {
    throw new MissingRecallDataError("secondsSinceLastReview", correlationId, {
      receivedValue: outcome.secondsSinceLastReview,
    });
  }
}
