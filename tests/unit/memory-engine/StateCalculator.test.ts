import { describe, expect, it } from "vitest";
import { MemoryState } from "@/shared/types";
import { determineMemoryState, isLegalStateTransition } from "@/engines/memory/calculators";

describe("StateCalculator", () => {
  describe("isLegalStateTransition", () => {
    it("allows staying in the same state", () => {
      expect(isLegalStateTransition(MemoryState.Growing, MemoryState.Growing)).toBe(true);
    });

    it("allows moving one step forward", () => {
      expect(isLegalStateTransition(MemoryState.Fragile, MemoryState.Growing)).toBe(true);
    });

    it("allows moving one step backward", () => {
      expect(isLegalStateTransition(MemoryState.Stable, MemoryState.Growing)).toBe(true);
    });

    it("rejects skipping multiple states forward", () => {
      expect(isLegalStateTransition(MemoryState.Encoding, MemoryState.Stable)).toBe(false);
    });

    it("rejects skipping multiple states backward (SDS Part 10 example: Mastered -> Encoding)", () => {
      expect(isLegalStateTransition(MemoryState.Mastered, MemoryState.Encoding)).toBe(false);
    });

    it("rejects any transition targeting Unseen (SDS Part 10 example: Stable -> Unseen)", () => {
      expect(isLegalStateTransition(MemoryState.Stable, MemoryState.Unseen)).toBe(false);
      expect(isLegalStateTransition(MemoryState.Encoding, MemoryState.Unseen)).toBe(false);
    });
  });

  describe("determineMemoryState", () => {
    it("always moves Unseen to Encoding on the first recall event, regardless of outcome", () => {
      expect(determineMemoryState(MemoryState.Unseen, 0.05, 0)).toBe(MemoryState.Encoding);
      expect(determineMemoryState(MemoryState.Unseen, 0, 0)).toBe(MemoryState.Encoding);
    });

    it("clamps a large jump in strength/stability to a single adjacent step", () => {
      // Strength/stability here would naturally qualify for Mastered,
      // but starting from Encoding must only move one step to Fragile.
      const result = determineMemoryState(MemoryState.Encoding, 0.99, 100);
      expect(result).toBe(MemoryState.Fragile);
    });

    it("every result is always a legal transition from the previous state", () => {
      const allStates = [
        MemoryState.Unseen,
        MemoryState.Encoding,
        MemoryState.Fragile,
        MemoryState.Growing,
        MemoryState.Stable,
        MemoryState.Mastered,
      ];
      for (const previousState of allStates) {
        for (const strength of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
          for (const stability of [0, 2, 5, 15, 30]) {
            const next = determineMemoryState(previousState, strength, stability);
            expect(isLegalStateTransition(previousState, next)).toBe(true);
          }
        }
      }
    });

    it("is deterministic", () => {
      const first = determineMemoryState(MemoryState.Growing, 0.6, 5);
      const second = determineMemoryState(MemoryState.Growing, 0.6, 5);
      expect(first).toBe(second);
    });
  });
});
