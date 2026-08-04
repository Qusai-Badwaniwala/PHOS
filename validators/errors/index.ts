import { ValidationException } from "@/shared/errors";

export class MissingFieldError extends ValidationException {
  constructor(
    fieldName: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "VALIDATION_MISSING_FIELD_001",
      `Missing required field "${fieldName}".`,
      correlationId,
      optionalDetails,
    );
  }
}

export class InvalidIdentifierError extends ValidationException {
  constructor(
    fieldName: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "VALIDATION_INVALID_IDENTIFIER_001",
      `Invalid identifier for field "${fieldName}".`,
      correlationId,
      optionalDetails,
    );
  }
}

export class InvalidEnumValueError extends ValidationException {
  constructor(
    fieldName: string,
    receivedValue: unknown,
    allowedValues: readonly string[],
    correlationId: string,
  ) {
    super(
      "VALIDATION_INVALID_ENUM_001",
      `Invalid value for field "${fieldName}": "${String(receivedValue)}". Expected one of: ${allowedValues.join(", ")}.`,
      correlationId,
    );
  }
}

export class InvalidNumericRangeError extends ValidationException {
  constructor(
    fieldName: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "VALIDATION_INVALID_NUMERIC_RANGE_001",
      `Field "${fieldName}" is outside its allowed numeric range.`,
      correlationId,
      optionalDetails,
    );
  }
}

export class InvalidDateFormatError extends ValidationException {
  constructor(
    fieldName: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "VALIDATION_INVALID_DATE_001",
      `Field "${fieldName}" is not a valid ISO-8601 date.`,
      correlationId,
      optionalDetails,
    );
  }
}

export class InvalidStringFormatError extends ValidationException {
  constructor(
    fieldName: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "VALIDATION_INVALID_STRING_001",
      `Field "${fieldName}" does not meet the required string format.`,
      correlationId,
      optionalDetails,
    );
  }
}

export class UnexpectedPropertyError extends ValidationException {
  constructor(
    propertyName: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "VALIDATION_UNEXPECTED_PROPERTY_001",
      `Unexpected property "${propertyName}" in request body.`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Generic validation failure that does not fit a more specific category above. */
export class ValidationError extends ValidationException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("VALIDATION_GENERIC_001", message, correlationId, optionalDetails);
  }
}
