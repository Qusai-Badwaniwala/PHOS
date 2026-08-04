import {
  InvalidDateFormatError,
  InvalidEnumValueError,
  InvalidIdentifierError,
  InvalidNumericRangeError,
  InvalidStringFormatError,
  MissingFieldError,
  UnexpectedPropertyError,
} from "./errors";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * The shared Validation Layer (SDS Part 17). Answers only "can this
 * request be processed?" — never "should this request succeed?" (that
 * remains the Engine Layer's responsibility). Every function here is
 * pure and deterministic: no I/O, no repository or Engine access.
 */

export function validateIdentifier(
  value: unknown,
  fieldName: string,
  correlationId: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MissingFieldError(fieldName, correlationId);
  }
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new InvalidIdentifierError(fieldName, correlationId, { receivedValue: value });
  }
  return value;
}

export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string,
  correlationId: string,
): T {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new InvalidEnumValueError(fieldName, value, allowedValues, correlationId);
  }
  return value as T;
}

export interface NumericRangeOptions {
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
}

export function validateNumericRange(
  value: unknown,
  fieldName: string,
  options: NumericRangeOptions,
  correlationId: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidNumericRangeError(fieldName, correlationId, { receivedValue: value });
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new InvalidNumericRangeError(fieldName, correlationId, {
      receivedValue: value,
      reason: "must be an integer",
    });
  }
  if (options.min !== undefined && value < options.min) {
    throw new InvalidNumericRangeError(fieldName, correlationId, {
      receivedValue: value,
      min: options.min,
    });
  }
  if (options.max !== undefined && value > options.max) {
    throw new InvalidNumericRangeError(fieldName, correlationId, {
      receivedValue: value,
      max: options.max,
    });
  }
  return value;
}

export interface StringOptions {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly allowEmpty?: boolean;
}

export function validateString(
  value: unknown,
  fieldName: string,
  options: StringOptions,
  correlationId: string,
): string {
  if (typeof value !== "string") {
    throw new InvalidStringFormatError(fieldName, correlationId, { receivedValue: value });
  }
  const sanitized = sanitizeInput(value);
  if (!options.allowEmpty && sanitized.length === 0) {
    throw new MissingFieldError(fieldName, correlationId);
  }
  if (options.minLength !== undefined && sanitized.length < options.minLength) {
    throw new InvalidStringFormatError(fieldName, correlationId, {
      reason: `must be at least ${options.minLength} characters`,
    });
  }
  if (options.maxLength !== undefined && sanitized.length > options.maxLength) {
    throw new InvalidStringFormatError(fieldName, correlationId, {
      reason: `must be at most ${options.maxLength} characters`,
    });
  }
  return sanitized;
}

export function validateDate(value: unknown, fieldName: string, correlationId: string): Date {
  if (typeof value !== "string") {
    throw new InvalidDateFormatError(fieldName, correlationId, { receivedValue: value });
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidDateFormatError(fieldName, correlationId, { receivedValue: value });
  }
  return parsed;
}

/** Boolean values accept only explicit `boolean` types — no implicit conversion (SDS Part 17 "BOOLEAN VALIDATION"). */
export function validateBoolean(value: unknown, fieldName: string, correlationId: string): boolean {
  if (typeof value !== "boolean") {
    throw new MissingFieldError(fieldName, correlationId, {
      reason: "must be an explicit boolean",
      receivedValue: value,
    });
  }
  return value;
}

/** Trims leading/trailing whitespace only — never alters business meaning (SDS Part 17 "SANITIZATION CONTRACT"). */
export function sanitizeInput(value: string): string {
  return value.trim();
}

/**
 * Verifies a request body is a plain object containing every required
 * field and no properties outside `allowedFields` (SDS Part 17
 * "REQUEST VALIDATION": required fields, unknown properties).
 */
export function validateRequestShape(
  body: unknown,
  requiredFields: readonly string[],
  allowedFields: readonly string[],
  correlationId: string,
): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new MissingFieldError("body", correlationId);
  }
  const record = body as Record<string, unknown>;

  for (const field of requiredFields) {
    if (!(field in record) || record[field] === undefined || record[field] === null) {
      throw new MissingFieldError(field, correlationId);
    }
  }

  for (const key of Object.keys(record)) {
    if (!allowedFields.includes(key)) {
      throw new UnexpectedPropertyError(key, correlationId);
    }
  }

  return record;
}

/**
 * Generic entry point that delegates to a per-DTO validator function
 * (SDS Part 17 "PUBLIC INTERFACE": `validateDTO()`). Individual DTO
 * validation rules live alongside each DTO definition rather than in
 * one monolithic switch, since each request shape is genuinely
 * different — this function exists so callers have one consistent
 * named entry point regardless of which DTO is being validated.
 */
export function validateDTO<T>(
  body: unknown,
  validator: (body: unknown, correlationId: string) => T,
  correlationId: string,
): T {
  return validator(body, correlationId);
}

/**
 * Top-level entry point matching SDS Part 17's `validateRequest()`.
 * Thin alias over `validateDTO()` for endpoints that validate the
 * whole request body in one step.
 */
export function validateRequest<T>(
  body: unknown,
  validator: (body: unknown, correlationId: string) => T,
  correlationId: string,
): T {
  return validateDTO(body, validator, correlationId);
}
