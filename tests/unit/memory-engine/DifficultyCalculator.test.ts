import { describe, expect, it } from "vitest";
import { calculateUpdatedDifficulty } from "@/engines/memory/calculators";

describe("DifficultyCalculator", () => {
  it("never changes abruptly from a single recall event", () => {
    const afterSuccess = calculateUpdatedDifficulty(0.5, true);
    const afterFailure = calculateUpdatedDifficulty(0.5, false);
    expect(Math.abs(afterSuccess - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(afterFailure - 0.5)).toBeLessThan(0.05);
  });

  it("decreases slightly after a success", () => {
    expect(calculateUpdatedDifficulty(0.5, true)).toBeLessThan(0.5);
  });

  it("increases slightly after a failure", () => {
    expect(calculateUpdatedDifficulty(0.5, false)).toBeGreaterThan(0.5);
  });

  it("never goes below 0 or above 1", () => {
    expect(calculateUpdatedDifficulty(0, true)).toBeGreaterThanOrEqual(0);
    expect(calculateUpdatedDifficulty(1, false)).toBeLessThanOrEqual(1);
  });
});
