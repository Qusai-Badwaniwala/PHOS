import { ConfidenceLevel } from "@/shared/types";
import {
  BASE_STABILITY_GAIN_DAYS,
  CONFIDENCE_MULTIPLIER,
  STABILITY_DECAY_TIME_CONSTANT_DAYS,
} from "../constants";

/**
 * Applies slow time-based decay to a stability value (expressed in
 * days). Stability "decreases slowly over time" (SDS Part 10) — the
 * decay time constant here is deliberately much larger than
 * strength's, so stability erodes far more gradually.
 */
export function applyStabilityDecay(previousStabilityDays: number, elapsedDays: number): number {
  return previousStabilityDays * Math.exp(-elapsedDays / STABILITY_DECAY_TIME_CONSTANT_DAYS);
}

/**
 * Computes updated stability after one recall event, given the
 * already time-decayed stability.
 *
 * Only successful recall grows stability, and only by a small amount
 * relative to typical stability magnitudes — satisfying "changes
 * gradually... built through consistent revision over time" (SDS
 * Part 10). A failed recall does not directly reduce stability beyond
 * the time decay already applied; stability represents accumulated
 * resistance to forgetting, which one failure does not erase.
 */
export function calculateUpdatedStability(
  decayedStabilityDays: number,
  successfulRecall: boolean,
  confidence: ConfidenceLevel,
): number {
  if (!successfulRecall) {
    return decayedStabilityDays;
  }

  const confidenceMultiplier = CONFIDENCE_MULTIPLIER[confidence];
  return decayedStabilityDays + BASE_STABILITY_GAIN_DAYS * confidenceMultiplier;
}
