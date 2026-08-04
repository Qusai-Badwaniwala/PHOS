import { ErrorCategory } from "@/shared/types";
import { BaseException } from "./BaseException";

/**
 * Base class for Domain Errors (SDS Part 19 "DOMAIN ERRORS":
 * "Generated exclusively by the Engine Layer... represent valid
 * application failures.").
 *
 * Never thrown directly. Each Engine module defines its own concrete
 * subclasses within its own `errors/` folder (SDS Part 6: "Every
 * engine owns domain-specific errors"), for example
 * `MemoryUpdateError`, `AdaptivePlanningError`,
 * `InvalidSessionStateError`, `SessionCompletionError`,
 * `AnalyticsCalculationError`, and `RestoreFailedError`.
 */
export abstract class DomainException extends BaseException {
  readonly category = ErrorCategory.Domain;
}
