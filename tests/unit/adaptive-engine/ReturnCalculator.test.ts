import { describe, expect, it } from "vitest";
import { ReturnStatus } from "@/shared/types";
import { assessReturn } from "@/engines/adaptive/calculators";

/**
 * PRODUCT_REQUIREMENTS Requirement 5, "Recovery After Missed Days":
 * "The user should never be punished for missing days" and "PHOS should
 * always encourage returning, never punish absence."
 */
const NOW = new Date("2026-08-03T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

describe("assessReturn", () => {
  it("treats a first-time user as new, not as lapsed", () => {
    const assessment = assessReturn(null, NOW);

    expect(assessment.status).toBe(ReturnStatus.NeverStudied);
    expect(assessment.daysSinceLastSession).toBeNull();
    // Someone who has never studied has not been away from anything.
    expect(assessment.welcomeBackMessage).toBeNull();
    expect(assessment.newMemorizationAllowance).toBe(1);
  });

  it("changes nothing after studying today", () => {
    const assessment = assessReturn(daysAgo(0), NOW);

    expect(assessment.status).toBe(ReturnStatus.Current);
    expect(assessment.newMemorizationAllowance).toBe(1);
    expect(assessment.welcomeBackMessage).toBeNull();
  });

  it("changes nothing after a single missed day", () => {
    // Requirement 5's own example: "One missed day: Continue almost
    // normally."
    const assessment = assessReturn(daysAgo(1), NOW);

    expect(assessment.status).toBe(ReturnStatus.Current);
    expect(assessment.newMemorizationAllowance).toBe(1);
  });

  it("reduces new memorization after several days, without stopping it", () => {
    const assessment = assessReturn(daysAgo(4), NOW);

    expect(assessment.status).toBe(ReturnStatus.ShortBreak);
    expect(assessment.newMemorizationAllowance).toBeGreaterThan(0);
    expect(assessment.newMemorizationAllowance).toBeLessThan(1);
  });

  it("reduces new memorization further after a week", () => {
    const shortBreak = assessReturn(daysAgo(4), NOW);
    const extended = assessReturn(daysAgo(10), NOW);

    expect(extended.status).toBe(ReturnStatus.ExtendedBreak);
    expect(extended.newMemorizationAllowance).toBeLessThan(shortBreak.newMemorizationAllowance);
  });

  it("pauses new memorization entirely after a month", () => {
    const assessment = assessReturn(daysAgo(45), NOW);

    expect(assessment.status).toBe(ReturnStatus.LongBreak);
    expect(assessment.newMemorizationAllowance).toBe(0);
  });

  it("allowance never increases as the absence lengthens", () => {
    const allowances = [0, 1, 3, 5, 8, 20, 40, 90].map(
      (days) => assessReturn(daysAgo(days), NOW).newMemorizationAllowance,
    );

    for (let i = 1; i < allowances.length; i += 1) {
      expect(allowances[i]!).toBeLessThanOrEqual(allowances[i - 1]!);
    }
  });

  it("welcomes the user back without implying failure or guilt", () => {
    // Requirement 5: "The application must never display messages
    // implying failure or guilt." This asserts the absence of the
    // vocabulary such messages are built from.
    const forbidden = [
      "fail",
      "missed",
      "behind",
      "should have",
      "streak",
      "lost",
      "broke",
      "neglect",
    ];

    for (const days of [3, 10, 45]) {
      const message = assessReturn(daysAgo(days), NOW).welcomeBackMessage;
      expect(message).not.toBeNull();
      const lower = message!.toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toContain(word);
      }
      expect(lower).toContain("welcome back");
    }
  });
});
