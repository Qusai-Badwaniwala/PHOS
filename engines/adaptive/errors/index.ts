import { DomainException } from "@/shared/errors";

/** Fallback error for an unexpected failure while generating a plan. */
export class AdaptivePlanningError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("ADAPTIVE_PLANNING_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `generateDailyPlan()` receives a non-positive or unreasonable study duration. */
export class InvalidStudyDurationError extends DomainException {
  constructor(
    receivedMinutes: number,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "ADAPTIVE_INVALID_DURATION_001",
      `Invalid available study duration: ${receivedMinutes} minutes.`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when a page's memory profile is missing fields required to calculate its priority. */
export class IncompleteMemoryProfileError extends DomainException {
  constructor(
    pageId: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "ADAPTIVE_INCOMPLETE_PROFILE_001",
      `Page "${pageId}" has an incomplete memory profile.`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when a plan cannot be generated at all (e.g. no eligible pages exist). */
export class PlanGenerationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("ADAPTIVE_PLAN_GENERATION_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when the injected AdaptiveEngineConfig is itself invalid (e.g. category scores that could overlap). */
export class SchedulingConfigurationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("ADAPTIVE_CONFIGURATION_001", message, correlationId, optionalDetails);
  }
}
