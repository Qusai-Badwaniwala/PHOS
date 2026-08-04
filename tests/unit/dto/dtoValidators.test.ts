import { describe, expect, it } from "vitest";
import {
  validateConfidenceSubmissionRequest,
  validateRecallSubmissionRequest,
  validateSessionStartRequest,
} from "@/shared/dto";
import { InvalidEnumValueError, MissingFieldError } from "@/validators/errors";

describe("validateSessionStartRequest", () => {
  it("accepts a valid request", () => {
    const result = validateSessionStartRequest(
      { sessionType: "Sabaq", availableStudyMinutes: 30 },
      "c1",
    );
    expect(result).toEqual({ sessionType: "Sabaq", availableStudyMinutes: 30 });
  });

  it("rejects an invalid sessionType", () => {
    expect(() =>
      validateSessionStartRequest({ sessionType: "Invalid", availableStudyMinutes: 30 }, "c1"),
    ).toThrow(InvalidEnumValueError);
  });

  it("rejects a missing availableStudyMinutes", () => {
    expect(() => validateSessionStartRequest({ sessionType: "Sabaq" }, "c1")).toThrow(
      MissingFieldError,
    );
  });
});

describe("validateRecallSubmissionRequest", () => {
  it("accepts a valid request", () => {
    const result = validateRecallSubmissionRequest(
      { sessionId: "s1", pageId: "p1", successfulRecall: true, durationSeconds: 20 },
      "c1",
    );
    expect(result.successfulRecall).toBe(true);
  });

  it("rejects a non-boolean successfulRecall", () => {
    expect(() =>
      validateRecallSubmissionRequest(
        { sessionId: "s1", pageId: "p1", successfulRecall: "yes", durationSeconds: 20 },
        "c1",
      ),
    ).toThrow();
  });
});

describe("validateConfidenceSubmissionRequest", () => {
  it("accepts a valid request", () => {
    const result = validateConfidenceSubmissionRequest(
      { sessionId: "s1", pageId: "p1", confidence: "High" },
      "c1",
    );
    expect(result.confidence).toBe("High");
  });

  it("rejects an invalid confidence value", () => {
    expect(() =>
      validateConfidenceSubmissionRequest(
        { sessionId: "s1", pageId: "p1", confidence: "Extreme" },
        "c1",
      ),
    ).toThrow(InvalidEnumValueError);
  });
});
