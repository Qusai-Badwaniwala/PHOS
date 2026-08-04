import { ConfidenceLevel } from "@/shared/types";
import {
  BASE_STRENGTH_GAIN,
  CONFIDENCE_MULTIPLIER,
  FAILURE_STRENGTH_PENALTY_FACTOR,
  MAX_NORMALIZED,
  MIN_NORMALIZED,
  MIN_STABILITY_DAYS,
} from "../constants";

/**
 * Applies time-based decay to a strength value.
 *
 * Models the forgetting curve: strength decays exponentially over
 * elapsed time, more slowly the higher the current stability is
 * (SDS Part 10: "the memory engine shall account for elapsed time
 * between reviews").
 */
export function applyStrengthDecay(
  previousStrength: number,
  previousStabilityDays: number,
  elapsedDays: number,
): number {
  const decayTimeConstant = Math.max(previousStabilityDays, MIN_STABILITY_DAYS);
  return previousStrength * Math.exp(-elapsedDays / decayTimeConstant);
}

/**
 * Computes the updated strength after one recall event, given the
 * already time-decayed strength.
 *
 * Confidence only ever modulates the size of an *increase* on a
 * successful recall — it never determines direction, and it is never
 * consulted at all on a failed recall (SDS Part 10 "CONFIDENCE
 * CONTRACT": "High confidence with poor recall shall not improve
 * memory variables"; "Low confidence with successful recall shall not
 * invalidate objective performance").
 */
export function calculateUpdatedStrength(
  decayedStrength: number,
  successfulRecall: boolean,
  confidence: ConfidenceLevel,
): number {
  if (successfulRecall) {
    const confidenceMultiplier = CONFIDENCE_MULTIPLIER[confidence];
    // Diminishing returns as strength approaches its ceiling, so a
    // single success cannot push an already-strong page past 1.
    const gain = BASE_STRENGTH_GAIN * confidenceMultiplier * (1 - decayedStrength);
    return clamp(decayedStrength + gain);
  }

  const penalty = decayedStrength * FAILURE_STRENGTH_PENALTY_FACTOR;
  return clamp(decayedStrength - penalty);
}

function clamp(value: number): number {
  return Math.min(MAX_NORMALIZED, Math.max(MIN_NORMALIZED, value));
}
