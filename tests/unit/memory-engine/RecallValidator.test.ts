import { describe, expect, it } from "vitest";
import { ConfidenceLevel } from "@/shared/types";
import type { RecallOutcome } from "@/shared/types";
import { validateRecallOutcome } from "@/engines/memory/validators";
import { InvalidConfidenceError, MissingRecallDataError } from "@/engines/memory/errors";

function buildValidOutcome(overrides: Partial<RecallOutcome> = {}): RecallOutcome {
  return {
    pageId: "page-1",
    sessionId: "session-1",
    successfulRecall: true,
    confidence: ConfidenceLevel.Medium,
    durationSeconds: 12,
    secondsSinceLastReview: 3600,
    timestamp: new Date(),
    ...overrides,
  };
}

describe("validateRecallOutcome", () => {
  it("accepts a fully valid outcome without throwing", () => {
    expect(() => validateRecallOutcome(buildValidOutcome(), "correlation-1")).not.toThrow();
  });

  it("accepts a null secondsSinceLastReview (first-ever review)", () => {
    expect(() =>
      validateRecallOutcome(buildValidOutcome({ secondsSinceLastReview: null }), "correlation-1"),
    ).not.toThrow();
  });

  it("rejects a missing pageId", () => {
    expect(() => validateRecallOutcome(buildValidOutcome({ pageId: "" }), "correlation-1")).toThrow(
      MissingRecallDataError,
    );
  });

  it("rejects a negative durationSeconds", () => {
    expect(() =>
      validateRecallOutcome(buildValidOutcome({ durationSeconds: -1 }), "correlation-1"),
    ).toThrow(MissingRecallDataError);
  });

  it("rejects an invalid confidence value", () => {
    const invalidOutcome = buildValidOutcome({
      confidence: "VeryHigh" as unknown as ConfidenceLevel,
    });
    expect(() => validateRecallOutcome(invalidOutcome, "correlation-1")).toThrow(
      InvalidConfidenceError,
    );
  });
});
