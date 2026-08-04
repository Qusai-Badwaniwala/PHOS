import { describe, expect, it } from "vitest";
import { ConfidenceLevel } from "@/shared/types";
import { applyStrengthDecay, calculateUpdatedStrength } from "@/engines/memory/calculators";

describe("StrengthCalculator", () => {
  it("increases strength on a successful recall", () => {
    const updated = calculateUpdatedStrength(0.4, true, ConfidenceLevel.Medium);
    expect(updated).toBeGreaterThan(0.4);
  });

  it("decreases strength on a failed recall", () => {
    const updated = calculateUpdatedStrength(0.8, false, ConfidenceLevel.High);
    expect(updated).toBeLessThan(0.8);
  });

  it("never exceeds 1 even after many consecutive successes", () => {
    let strength = 0;
    for (let i = 0; i < 50; i += 1) {
      strength = calculateUpdatedStrength(strength, true, ConfidenceLevel.High);
    }
    expect(strength).toBeLessThanOrEqual(1);
  });

  it("never goes below 0 even after many consecutive failures", () => {
    let strength = 0.05;
    for (let i = 0; i < 50; i += 1) {
      strength = calculateUpdatedStrength(strength, false, ConfidenceLevel.Low);
    }
    expect(strength).toBeGreaterThanOrEqual(0);
  });

  it("high confidence with a FAILED recall never improves strength (confidence never overrides objective failure)", () => {
    const withHighConfidence = calculateUpdatedStrength(0.5, false, ConfidenceLevel.High);
    const withLowConfidence = calculateUpdatedStrength(0.5, false, ConfidenceLevel.Low);
    expect(withHighConfidence).toBeLessThan(0.5);
    // Confidence is not even consulted on failure — both must move identically.
    expect(withHighConfidence).toBe(withLowConfidence);
  });

  it("low confidence with a SUCCESSFUL recall still increases strength (does not invalidate objective success)", () => {
    const updated = calculateUpdatedStrength(0.5, true, ConfidenceLevel.Low);
    expect(updated).toBeGreaterThan(0.5);
  });

  it("higher confidence yields a larger increase than lower confidence, on success", () => {
    const withHigh = calculateUpdatedStrength(0.5, true, ConfidenceLevel.High);
    const withLow = calculateUpdatedStrength(0.5, true, ConfidenceLevel.Low);
    expect(withHigh).toBeGreaterThan(withLow);
  });

  it("decays strength over elapsed time", () => {
    const decayed = applyStrengthDecay(0.8, 10, 30);
    expect(decayed).toBeLessThan(0.8);
  });

  it("higher stability causes slower decay over the same elapsed time", () => {
    const lowStabilityDecay = applyStrengthDecay(0.8, 1, 30);
    const highStabilityDecay = applyStrengthDecay(0.8, 100, 30);
    expect(highStabilityDecay).toBeGreaterThan(lowStabilityDecay);
  });

  it("applies no decay when no time has elapsed", () => {
    const decayed = applyStrengthDecay(0.6, 10, 0);
    expect(decayed).toBeCloseTo(0.6);
  });

  it("is deterministic: identical inputs always produce identical outputs", () => {
    const first = calculateUpdatedStrength(0.42, true, ConfidenceLevel.Medium);
    const second = calculateUpdatedStrength(0.42, true, ConfidenceLevel.Medium);
    expect(first).toBe(second);
  });
});
