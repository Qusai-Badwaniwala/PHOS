import { ErrorCategory } from "@/shared/types";
import { BaseException } from "./BaseException";

/**
 * Base class for Validation Errors (SDS Part 19 "VALIDATION ERRORS":
 * "Generated exclusively by the Validation Layer... Validation errors
 * terminate request execution immediately.").
 *
 * Never thrown directly. The Validation Layer (a later module) defines
 * concrete subclasses such as `MissingFieldError`,
 * `InvalidEnumValueError`, `InvalidIdentifierError`,
 * `InvalidDateFormatError`, `InvalidNumericRangeError`, and
 * `UnexpectedPropertyError`.
 */
export abstract class ValidationException extends BaseException {
  readonly category = ErrorCategory.Validation;
}
