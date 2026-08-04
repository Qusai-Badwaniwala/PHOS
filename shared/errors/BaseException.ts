import type { ErrorCategory, StandardErrorModel } from "@/shared/types";

/**
 * Root of the PHOS exception hierarchy (SDS Part 19 "EXCEPTION
 * HIERARCHY" / "STANDARD ERROR MODEL").
 *
 * Interpretation note on the SDS's hierarchy diagram: the SDS lists
 *   Base Exception -> ValidationException -> DomainException ->
 *   RepositoryException -> InfrastructureException ->
 *   UnexpectedApplicationException
 * using the same downward-arrow notation the SDS uses elsewhere purely
 * to express ordering, not inheritance (e.g. the MODULE 00 -> MODULE 10
 * implementation roadmap in Part 3). Read as a literal `extends` chain,
 * this would make a DomainException also *be* a ValidationException,
 * which contradicts Part 19's own "ERROR CATEGORIES" section, where
 * Validation, Domain, Persistence, Infrastructure, and Unexpected are
 * described as five independent categories. This implementation
 * therefore makes all five category classes direct, sibling subclasses
 * of BaseException, matching the "ERROR CATEGORIES" section and the
 * `ErrorCategory` enum (SDS Part 19, `shared/types`) one-to-one.
 *
 * BaseException itself, and each of the five category classes below,
 * are abstract: they are never thrown directly. Concrete, throwable
 * errors (e.g. `MissingFieldError`, `MemoryUpdateError`) are defined
 * per-layer in later modules (SDS Part 19: "Each Engine shall define
 * explicit domain-specific exception classes"; Part 6: "Every engine
 * owns domain-specific errors") and extend the appropriate category
 * class from this file.
 */
export abstract class BaseException extends Error {
  /** Stable, versioned error code (SDS Part 19 "ERROR CODES"), e.g. "MEMORY_003". */
  readonly errorCode: string;

  abstract readonly category: ErrorCategory;

  readonly correlationId: string;
  readonly timestamp: Date;
  readonly optionalDetails?: Readonly<Record<string, unknown>>;

  protected constructor(
    errorCode: string,
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    // Ensures `instanceof` checks and `.name` work correctly across the
    // concrete subclasses that will extend this hierarchy.
    this.name = new.target.name;
    this.errorCode = errorCode;
    this.correlationId = correlationId;
    this.timestamp = new Date();
    if (optionalDetails !== undefined) {
      this.optionalDetails = optionalDetails;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Produces the safe, serializable error shape defined by
   * `StandardErrorModel` (SDS Part 19 "STANDARD ERROR MODEL").
   *
   * Deliberately excludes `this.stack`: "Stack traces shall never be
   * exposed outside the backend." Callers that need the stack trace
   * for internal diagnostic logging can still read `error.stack`
   * directly, since this class still extends `Error`.
   */
  toStandardErrorModel(): StandardErrorModel {
    return {
      errorCode: this.errorCode,
      message: this.message,
      category: this.category,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      ...(this.optionalDetails !== undefined ? { optionalDetails: this.optionalDetails } : {}),
    };
  }
}
