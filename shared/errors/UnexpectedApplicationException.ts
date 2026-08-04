import { ErrorCategory } from "@/shared/types";
import { BaseException } from "./BaseException";

/**
 * Base class for Unexpected Errors (SDS Part 19 "ERROR CATEGORIES":
 * "Unhandled internal failures.").
 *
 * This is the category used by the API layer's centralized global
 * exception handler (SDS Part 19 "GLOBAL ERROR HANDLER") as the
 * fallback when a caught error does not already belong to one of the
 * other four categories — it is the safety net at the top of the
 * hierarchy, not a base class other modules are expected to subclass
 * further. It is therefore concrete (not abstract), with a stable,
 * fixed error code, unlike the other four category classes.
 */
export class UnexpectedApplicationException extends BaseException {
  readonly category = ErrorCategory.Unexpected;

  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("UNEXPECTED_001", message, correlationId, optionalDetails);
  }
}
