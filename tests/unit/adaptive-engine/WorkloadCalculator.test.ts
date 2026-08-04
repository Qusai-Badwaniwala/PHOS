import { describe, expect, it } from "vitest";
import { ConfidenceLevel } from "@/shared/types";
import type { RecallEvent } from "@/shared/types";
import { recommendWorkload } from "@/engines/adaptive/calculators";
import type { PerformanceObservation } from "@/engines/adaptive/calculators";

/**
 * PRODUCT_REQUIREMENTS Requirements 3, 7 and 8.
 *
 * The rule under test throughout is Requirement 7's: "Whenever speed
 * and retention conflict, RETENTION ALWAYS WINS." Increases must be
 * earned by evidence and stay small; reductions may be larger and need
 * no permission.
 */
const COMFORTABLE = 2;

function events(count: number, successRate: number, confidence = ConfidenceLevel.Medium) {
  const successes = Math.round(count * successRate);
  return Array.from({ length: count }, (_, index): RecallEvent => {
    return {
      id: `event-${index}`,
      pageId: `page-${index}`,
      sessionId: "session-1",
      timestamp: new Date(),
      successfulRecall: index < successes,
      confidence,
      durationSeconds: 60,
    };
  });
}

function observation(overrides: Partial<PerformanceObservation> = {}): PerformanceObservation {
  return {
    recallEvents: [],
    activeDays: 20,
    windowDays: 30,
    newPagesStudied: 40,
    ...overrides,
  };
}

describe("recommendWorkload", () => {
  it("uses the user's own estimate before there is any evidence", () => {
    const result = recommendWorkload(observation(), COMFORTABLE);

    expect(result.recommendedNewPages).toBe(COMFORTABLE);
    expect(result.basis).toBe("onboarding");
    expect(result.direction).toBe("steady");
    expect(result.rationale).toBe("");
  });

  it("ignores a handful of sessions, good or bad", () => {
    // "Never increase workload based on one unusually good session.
    // Never reduce workload because of one unusually poor session."
    const brilliant = recommendWorkload(observation({ recallEvents: events(5, 1) }), COMFORTABLE);
    const dismal = recommendWorkload(observation({ recallEvents: events(5, 0) }), COMFORTABLE);

    expect(brilliant.recommendedNewPages).toBe(COMFORTABLE);
    expect(dismal.recommendedNewPages).toBe(COMFORTABLE);
    expect(brilliant.basis).toBe("onboarding");
  });

  it("reduces the target when recall has weakened over many events", () => {
    const result = recommendWorkload(
      observation({ recallEvents: events(80, 0.5, ConfidenceLevel.Low) }),
      COMFORTABLE,
    );

    expect(result.recommendedNewPages).toBeLessThan(COMFORTABLE);
    expect(result.direction).toBe("reduce");
    expect(result.rationale).not.toBe("");
  });

  it("never reduces below a floor, so progress never stops entirely", () => {
    const result = recommendWorkload(
      observation({ recallEvents: events(120, 0, ConfidenceLevel.Low), newPagesStudied: 0 }),
      COMFORTABLE,
    );

    expect(result.recommendedNewPages).toBeGreaterThan(0);
  });

  it("caps how far the target may rise above what the user agreed to", () => {
    // A long run of perfect recall at a fast pace must not compound
    // into a workload the user never chose.
    const result = recommendWorkload(
      observation({
        recallEvents: events(200, 1, ConfidenceLevel.High),
        newPagesStudied: 400,
        activeDays: 20,
      }),
      COMFORTABLE,
    );

    expect(result.recommendedNewPages).toBeLessThanOrEqual(COMFORTABLE * 1.5);
  });

  it("holds steady when recall is neither strong nor weak", () => {
    const result = recommendWorkload(
      observation({ recallEvents: events(80, 0.78), newPagesStudied: 40, activeDays: 20 }),
      COMFORTABLE,
    );

    expect(result.direction).toBe("steady");
    expect(result.rationale).toBe("");
  });

  it("weights observation more heavily as evidence accumulates", () => {
    // Requirement 8: "recommendations should become increasingly
    // personalized" as data grows.
    const early = recommendWorkload(
      observation({ recallEvents: events(25, 0.4, ConfidenceLevel.Low) }),
      COMFORTABLE,
    );
    const established = recommendWorkload(
      observation({ recallEvents: events(150, 0.4, ConfidenceLevel.Low) }),
      COMFORTABLE,
    );

    expect(early.basis).toBe("blended");
    expect(established.basis).toBe("observed");
  });

  it("treats reduction more readily than increase, because retention wins", () => {
    const strong = recommendWorkload(
      observation({ recallEvents: events(150, 0.95, ConfidenceLevel.High), newPagesStudied: 40 }),
      COMFORTABLE,
    );
    const weak = recommendWorkload(
      observation({ recallEvents: events(150, 0.45, ConfidenceLevel.Low), newPagesStudied: 40 }),
      COMFORTABLE,
    );

    const increase = strong.recommendedNewPages - COMFORTABLE;
    const reduction = COMFORTABLE - weak.recommendedNewPages;

    expect(reduction).toBeGreaterThan(increase);
  });

  it("never raises the target above the user's own pace without strong recall", () => {
    // Regression test for a defect found by running the application: a
    // user recalling 45% was handed an *increase*, because a fast
    // observed pace overwhelmed the retention penalty. Requirement 7:
    // "Increase only when evidence consistently shows strong recall."
    const fastButStruggling = recommendWorkload(
      observation({
        recallEvents: events(120, 0.45, ConfidenceLevel.Low),
        // Looks fast: many pages covered across very few days.
        newPagesStudied: 200,
        activeDays: 2,
      }),
      COMFORTABLE,
    );

    expect(fastButStruggling.recommendedNewPages).toBeLessThanOrEqual(COMFORTABLE);
    expect(fastButStruggling.direction).not.toBe("increase");
  });

  it("never claims recall held strong when it did not", () => {
    // The same defect produced "Your recall has held at 45%" — an
    // explanation that contradicted its own number. Requirement 4:
    // "No misleading or fabricated explanations are shown."
    for (const rate of [0.3, 0.45, 0.6, 0.75]) {
      const result = recommendWorkload(
        observation({
          recallEvents: events(120, rate, ConfidenceLevel.Low),
          newPagesStudied: 200,
          activeDays: 2,
        }),
        COMFORTABLE,
      );
      expect(result.rationale).not.toContain("has held");
    }
  });

  it("still allows an increase when recall is genuinely strong", () => {
    const result = recommendWorkload(
      observation({
        recallEvents: events(150, 0.95, ConfidenceLevel.High),
        newPagesStudied: 60,
        activeDays: 20,
      }),
      COMFORTABLE,
    );

    expect(result.recommendedNewPages).toBeGreaterThan(COMFORTABLE);
    expect(result.rationale).toContain("has held");
  });

  it("explains a change in the user's terms, without blame", () => {
    const result = recommendWorkload(
      observation({ recallEvents: events(120, 0.5, ConfidenceLevel.Low) }),
      COMFORTABLE,
    );

    expect(result.rationale).toContain("%");
    expect(result.rationale).toContain("rises again");
    for (const word of ["fail", "poor", "should", "behind"]) {
      expect(result.rationale.toLowerCase()).not.toContain(word);
    }
  });

  it("reports what it observed, so the recommendation can be checked", () => {
    const result = recommendWorkload(
      observation({ recallEvents: events(60, 0.9), activeDays: 15, newPagesStudied: 30 }),
      COMFORTABLE,
    );

    expect(result.successRate).toBeCloseTo(0.9, 1);
    expect(result.observedDailyPace).toBeCloseTo(2, 1);
    expect(result.consistency).toBeCloseTo(0.5, 1);
  });
});
