import { describe, expect, it } from "vitest";
import { ConfidenceLevel, ReportingPeriod, TrendDirection } from "@/shared/types";
import type { RecallEvent } from "@/shared/types";
import { calculateTrend } from "@/engines/analytics/calculators";

function buildEvents(successCount: number, failureCount: number): RecallEvent[] {
  const events: RecallEvent[] = [];
  for (let i = 0; i < successCount; i += 1) {
    events.push({
      id: `s-${i}`,
      pageId: "page-1",
      sessionId: "session-1",
      timestamp: new Date(),
      successfulRecall: true,
      confidence: ConfidenceLevel.Medium,
      durationSeconds: 10,
    });
  }
  for (let i = 0; i < failureCount; i += 1) {
    events.push({
      id: `f-${i}`,
      pageId: "page-1",
      sessionId: "session-1",
      timestamp: new Date(),
      successfulRecall: false,
      confidence: ConfidenceLevel.Medium,
      durationSeconds: 10,
    });
  }
  return events;
}

describe("calculateTrend", () => {
  it.each(["current", "previous", "both"])(
    "does not invent a comparison when %s evidence is absent",
    (missing) => {
      const result = calculateTrend(
        ReportingPeriod.Weekly,
        missing === "current" || missing === "both" ? [] : buildEvents(8, 1),
        missing === "previous" || missing === "both" ? [] : buildEvents(2, 1),
      );
      expect(result.trendStrength).toBe(0);
      expect(result.summary).toContain("needs recorded recall in both periods");
    },
  );
  it("reports Stable when there is no previous-period data to compare against", () => {
    const result = calculateTrend(ReportingPeriod.Weekly, buildEvents(5, 0), []);
    expect(result.trendDirection).toBe(TrendDirection.Stable);
  });

  it("reports Improving when the success ratio increased meaningfully", () => {
    const previous = buildEvents(2, 8); // 20% success
    const current = buildEvents(8, 2); // 80% success
    const result = calculateTrend(ReportingPeriod.Weekly, current, previous);
    expect(result.trendDirection).toBe(TrendDirection.Improving);
    expect(result.trendStrength).toBeGreaterThan(0);
  });

  it("reports Declining when the success ratio decreased meaningfully", () => {
    const previous = buildEvents(8, 2); // 80% success
    const current = buildEvents(2, 8); // 20% success
    const result = calculateTrend(ReportingPeriod.Weekly, current, previous);
    expect(result.trendDirection).toBe(TrendDirection.Declining);
  });

  it("reports Stable when the change is within the noise threshold", () => {
    const previous = buildEvents(50, 50); // 50%
    const current = buildEvents(51, 49); // 51%
    const result = calculateTrend(ReportingPeriod.Weekly, current, previous);
    expect(result.trendDirection).toBe(TrendDirection.Stable);
  });
});
