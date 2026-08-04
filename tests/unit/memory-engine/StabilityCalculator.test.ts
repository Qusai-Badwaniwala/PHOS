import { describe, expect, it } from "vitest";
import { ConfidenceLevel } from "@/shared/types";
import { applyStabilityDecay, calculateUpdatedStability } from "@/engines/memory/calculators";

describe("StabilityCalculator", () => {
  it("increases stability on a successful recall", () => {
    const updated = calculateUpdatedStability(5, true, ConfidenceLevel.Medium);
    expect(updated).toBeGreaterThan(5);
  });

  it("does not increase stability on a failed recall", () => {
    const updated = calculateUpdatedStability(5, false, ConfidenceLevel.High);
    expect(updated).toBe(5);
  });

  it("decays slowly over elapsed time", () => {
    const decayed = applyStabilityDecay(10, 30);
    expect(decayed).toBeLessThan(10);
    // The decay time constant is deliberately large
    // (STABILITY_DECAY_TIME_CONSTANT_DAYS = 180), so a 30-day gap
    // retains exp(-30/180) ≈ 85% of stability. Asserted as a floor
    // rather than an exact value, so this states the SDS Part 10
    // invariant ("stability decreases slowly") without pinning the
    // calibration constant itself.
    expect(decayed).toBeGreaterThan(8);
  });

  it("higher confidence yields a larger stability gain than lower confidence, on success", () => {
    const withHigh = calculateUpdatedStability(5, true, ConfidenceLevel.High);
    const withLow = calculateUpdatedStability(5, true, ConfidenceLevel.Low);
    expect(withHigh).toBeGreaterThan(withLow);
  });

  it("is deterministic", () => {
    const first = calculateUpdatedStability(7, true, ConfidenceLevel.Medium);
    const second = calculateUpdatedStability(7, true, ConfidenceLevel.Medium);
    expect(first).toBe(second);
  });
});
