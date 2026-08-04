import { DomainException } from "@/shared/errors";

/** Thrown by `validateStateTransition()` (and internally before ever applying an illegal transition). */
export class InvalidMemoryStateTransitionError extends DomainException {
  constructor(
    fromState: string,
    toState: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "MEMORY_INVALID_TRANSITION_001",
      `Illegal memory state transition from "${fromState}" to "${toState}".`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when a RecallOutcome carries a confidence value outside the known `ConfidenceLevel` set. */
export class InvalidConfidenceError extends DomainException {
  constructor(
    receivedValue: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "MEMORY_INVALID_CONFIDENCE_001",
      `Invalid confidence value: "${receivedValue}".`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when a computed memory profile falls outside its allowed range — a defensive check; the calculators are designed to never produce this. */
export class InvalidMemoryProfileError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("MEMORY_INVALID_PROFILE_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when a RecallOutcome is missing data required to process it. */
export class MissingRecallDataError extends DomainException {
  constructor(
    missingField: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "MEMORY_MISSING_DATA_001",
      `RecallOutcome is missing required field "${missingField}".`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Fallback error for an unexpected failure while calculating a memory update. */
export class MemoryUpdateError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("MEMORY_UPDATE_001", message, correlationId, optionalDetails);
  }
}
