import { DIFFICULTY_LEARNING_RATE, MAX_NORMALIZED, MIN_NORMALIZED } from "../constants";

/**
 * Computes updated difficulty after one recall event.
 *
 * "Difficulty shall never change abruptly from a single recall event"
 * (SDS Part 10) — enforced here by a small, fixed learning rate rather
 * than a proportional or unbounded adjustment, so difficulty only ever
 * moves a small, constant step per event regardless of how surprising
 * the outcome was.
 */
export function calculateUpdatedDifficulty(
  previousDifficulty: number,
  successfulRecall: boolean,
): number {
  // A failure nudges difficulty up (harder than currently modeled); a
  // success nudges it down (easier than currently modeled).
  const direction = successfulRecall ? -1 : 1;
  const updated = previousDifficulty + direction * DIFFICULTY_LEARNING_RATE;
  return Math.min(MAX_NORMALIZED, Math.max(MIN_NORMALIZED, updated));
}
