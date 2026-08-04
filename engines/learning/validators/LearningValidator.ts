import { ConfidenceLevel, SessionType } from "@/shared/types";
import {
  InvalidSessionTypeError,
  RecallSubmissionError,
  ConfidenceSubmissionError,
} from "../errors";

const VALID_SESSION_TYPES: readonly string[] = Object.values(SessionType);
const VALID_CONFIDENCE_LEVELS: readonly string[] = Object.values(ConfidenceLevel);

export function validateSessionType(sessionType: string, correlationId: string): void {
  if (!VALID_SESSION_TYPES.includes(sessionType)) {
    throw new InvalidSessionTypeError(sessionType, correlationId);
  }
}

export function validateRecallSubmission(
  pageId: string,
  durationSeconds: number,
  correlationId: string,
): void {
  if (!pageId) {
    throw new RecallSubmissionError("A recall submission must include a pageId.", correlationId);
  }
  if (typeof durationSeconds !== "number" || durationSeconds < 0) {
    throw new RecallSubmissionError(
      "A recall submission must include a non-negative durationSeconds.",
      correlationId,
      { receivedValue: durationSeconds },
    );
  }
}

export function validateConfidence(confidence: string, correlationId: string): void {
  if (!VALID_CONFIDENCE_LEVELS.includes(confidence)) {
    throw new ConfidenceSubmissionError(
      `Invalid confidence value: "${confidence}".`,
      correlationId,
    );
  }
}
