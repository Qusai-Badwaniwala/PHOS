import { describe, expect, it } from "vitest";
import {
  sanitizeInput,
  validateBoolean,
  validateDate,
  validateEnum,
  validateIdentifier,
  validateNumericRange,
  validateRequestShape,
  validateString,
} from "@/validators";
import {
  InvalidDateFormatError,
  InvalidEnumValueError,
  InvalidIdentifierError,
  InvalidNumericRangeError,
  MissingFieldError,
  UnexpectedPropertyError,
} from "@/validators/errors";

describe("validateIdentifier", () => {
  it("accepts a well-formed identifier", () => {
    expect(validateIdentifier("cljk3f2a90001abc", "pageId", "c1")).toBe("cljk3f2a90001abc");
  });

  it("rejects an empty string", () => {
    expect(() => validateIdentifier("", "pageId", "c1")).toThrow(MissingFieldError);
  });

  it("rejects a value containing spaces", () => {
    expect(() => validateIdentifier("has space", "pageId", "c1")).toThrow(InvalidIdentifierError);
  });
});

describe("validateEnum", () => {
  it("accepts an allowed value", () => {
    expect(validateEnum("High", ["Low", "Medium", "High"], "confidence", "c1")).toBe("High");
  });

  it("rejects a value outside the allowed set", () => {
    expect(() => validateEnum("Extreme", ["Low", "Medium", "High"], "confidence", "c1")).toThrow(
      InvalidEnumValueError,
    );
  });
});

describe("validateNumericRange", () => {
  it("accepts a value within range", () => {
    expect(validateNumericRange(30, "minutes", { min: 1, max: 60 }, "c1")).toBe(30);
  });

  it("rejects a value below the minimum", () => {
    expect(() => validateNumericRange(0, "minutes", { min: 1, max: 60 }, "c1")).toThrow(
      InvalidNumericRangeError,
    );
  });

  it("rejects a value above the maximum", () => {
    expect(() => validateNumericRange(100, "minutes", { min: 1, max: 60 }, "c1")).toThrow(
      InvalidNumericRangeError,
    );
  });

  it("rejects a non-integer when integer is required", () => {
    expect(() => validateNumericRange(1.5, "pageNumber", { integer: true }, "c1")).toThrow(
      InvalidNumericRangeError,
    );
  });

  it("rejects NaN", () => {
    expect(() => validateNumericRange(Number.NaN, "minutes", {}, "c1")).toThrow(
      InvalidNumericRangeError,
    );
  });
});

describe("validateBoolean", () => {
  it("accepts explicit booleans only, never implicit conversion", () => {
    expect(validateBoolean(true, "successfulRecall", "c1")).toBe(true);
    expect(() => validateBoolean("true", "successfulRecall", "c1")).toThrow();
    expect(() => validateBoolean(1, "successfulRecall", "c1")).toThrow();
  });
});

describe("validateDate", () => {
  it("accepts a valid ISO-8601 date string", () => {
    const result = validateDate("2026-07-30T00:00:00.000Z", "timestamp", "c1");
    expect(result instanceof Date).toBe(true);
  });

  it("rejects an invalid date string", () => {
    expect(() => validateDate("not-a-date", "timestamp", "c1")).toThrow(InvalidDateFormatError);
  });
});

describe("sanitizeInput", () => {
  it("trims leading and trailing whitespace only", () => {
    expect(sanitizeInput("  hello world  ")).toBe("hello world");
  });

  it("never alters internal whitespace or business meaning", () => {
    expect(sanitizeInput("  multi  word  value  ")).toBe("multi  word  value");
  });
});

describe("validateString", () => {
  it("rejects an empty string by default", () => {
    expect(() => validateString("", "theme", {}, "c1")).toThrow(MissingFieldError);
  });

  it("allows an empty string when allowEmpty is set", () => {
    expect(validateString("", "theme", { allowEmpty: true }, "c1")).toBe("");
  });
});

describe("validateRequestShape", () => {
  it("accepts a body with exactly the required and allowed fields", () => {
    const result = validateRequestShape(
      { sessionType: "Sabaq" },
      ["sessionType"],
      ["sessionType"],
      "c1",
    );
    expect(result.sessionType).toBe("Sabaq");
  });

  it("rejects a body missing a required field", () => {
    expect(() => validateRequestShape({}, ["sessionType"], ["sessionType"], "c1")).toThrow(
      MissingFieldError,
    );
  });

  it("rejects a body with an unexpected property", () => {
    expect(() =>
      validateRequestShape(
        { sessionType: "Sabaq", extra: "nope" },
        ["sessionType"],
        ["sessionType"],
        "c1",
      ),
    ).toThrow(UnexpectedPropertyError);
  });
});
