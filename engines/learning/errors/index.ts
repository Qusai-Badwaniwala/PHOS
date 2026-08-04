import { DomainException } from "@/shared/errors";

/** Thrown when `startSession()` receives an unrecognized SessionType. */
export class InvalidSessionTypeError extends DomainException {
  constructor(
    receivedValue: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "LEARNING_INVALID_SESSION_TYPE_001",
      `Invalid session type: "${receivedValue}".`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when an operation is attempted against a session that has already finished. */
export class SessionAlreadyCompletedError extends DomainException {
  constructor(
    sessionId: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "LEARNING_SESSION_ALREADY_COMPLETED_001",
      `Session "${sessionId}" has already been completed.`,
      correlationId,
      optionalDetails,
    );
  }
}

/**
 * Thrown when a session is started while another is still open.
 *
 * PHOS is single-user and only one session can meaningfully be in
 * progress at a time. Without this guard a second `startSession()` call
 * silently replaced the first in memory, leaving the original row
 * permanently uncompleted and untraceable.
 */
export class SessionAlreadyActiveError extends DomainException {
  constructor(
    sessionId: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "LEARNING_SESSION_ALREADY_ACTIVE_001",
      `Session "${sessionId}" is still in progress. Finish it before starting another.`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when an operation requires an active session but none has been started. */
export class SessionNotStartedError extends DomainException {
  constructor(correlationId: string, optionalDetails?: Readonly<Record<string, unknown>>) {
    super(
      "LEARNING_SESSION_NOT_STARTED_001",
      "No active session. Call startSession() and loadDailyPlan() first.",
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when a study item is referenced that does not match the current position in the plan. */
export class InvalidStudyItemError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("LEARNING_INVALID_STUDY_ITEM_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `submitRecall()` cannot be processed. */
export class RecallSubmissionError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("LEARNING_RECALL_SUBMISSION_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `submitConfidence()` cannot be processed (e.g. no pending recall to attach it to). */
export class ConfidenceSubmissionError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("LEARNING_CONFIDENCE_SUBMISSION_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `finishSession()` fails to complete the session. */
export class SessionCompletionError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("LEARNING_SESSION_COMPLETION_001", message, correlationId, optionalDetails);
  }
}
