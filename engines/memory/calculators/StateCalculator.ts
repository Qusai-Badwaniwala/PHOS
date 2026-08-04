import { MemoryState } from "@/shared/types";
import { STATE_THRESHOLDS } from "../constants";
import { InvalidMemoryStateTransitionError } from "../errors";

/**
 * States in lifecycle order. Index is used to enforce the
 * "one adjacent step at a time" transition rule.
 */
const STATE_ORDER: readonly MemoryState[] = [
  MemoryState.Unseen,
  MemoryState.Encoding,
  MemoryState.Fragile,
  MemoryState.Growing,
  MemoryState.Stable,
  MemoryState.Mastered,
];

/**
 * Legal transition rule (SDS Part 10 "MEMORY STATE MACHINE"):
 * - No change is always legal.
 * - Moving exactly one step forward or backward along the lifecycle
 *   order is legal ("Legal MemoryState transitions... Illegal
 *   transitions... Mastered -> Encoding [is invalid]" — skipping
 *   multiple states is illegal in either direction).
 * - `Unseen` can never be a transition *target* once a page has left
 *   it: `Unseen` specifically means "never reviewed," and a page with
 *   at least one recorded RecallEvent cannot un-become that
 *   (SDS Part 10's own invalid example, "Stable -> Unseen," is exactly
 *   this case).
 */
export function isLegalStateTransition(from: MemoryState, to: MemoryState): boolean {
  if (from === to) {
    return true;
  }
  if (to === MemoryState.Unseen) {
    return false;
  }
  const fromIndex = STATE_ORDER.indexOf(from);
  const toIndex = STATE_ORDER.indexOf(to);
  return Math.abs(toIndex - fromIndex) === 1;
}

export function assertLegalStateTransition(
  from: MemoryState,
  to: MemoryState,
  correlationId: string,
): void {
  if (!isLegalStateTransition(from, to)) {
    throw new InvalidMemoryStateTransitionError(from, to, correlationId);
  }
}

/**
 * Determines the state a page's (strength, stability) *would* place it
 * in with no adjacency constraint, by scanning thresholds from
 * `Mastered` downward and taking the first one both values satisfy.
 */
function naturalStateFor(strength: number, stabilityDays: number): MemoryState {
  const candidates: readonly [MemoryState, { minStrength: number; minStabilityDays: number }][] = [
    [MemoryState.Mastered, STATE_THRESHOLDS.Mastered],
    [MemoryState.Stable, STATE_THRESHOLDS.Stable],
    [MemoryState.Growing, STATE_THRESHOLDS.Growing],
    [MemoryState.Fragile, STATE_THRESHOLDS.Fragile],
    [MemoryState.Encoding, STATE_THRESHOLDS.Encoding],
  ];

  for (const [state, threshold] of candidates) {
    if (strength >= threshold.minStrength && stabilityDays >= threshold.minStabilityDays) {
      return state;
    }
  }
  return MemoryState.Encoding;
}

/**
 * Determines the next MemoryState for a page, given its previous state
 * and its newly computed strength/stability.
 *
 * "Every recall event shall update the memory profile exactly once"
 * (SDS Part 10) is honored here by clamping movement to at most one
 * adjacent step per call, even if the natural (unclamped) target state
 * implied by the new strength/stability is further away — preventing a
 * single recall event from skipping states.
 *
 * A page in `Unseen` always moves to `Encoding` on its first recall
 * event, regardless of outcome — `Unseen` specifically means "never
 * attempted," and after one attempt that is no longer true.
 */
export function determineMemoryState(
  previousState: MemoryState,
  newStrength: number,
  newStabilityDays: number,
): MemoryState {
  if (previousState === MemoryState.Unseen) {
    return MemoryState.Encoding;
  }

  const naturalTarget = naturalStateFor(newStrength, newStabilityDays);
  const previousIndex = STATE_ORDER.indexOf(previousState);
  const targetIndex = STATE_ORDER.indexOf(naturalTarget);

  if (targetIndex === previousIndex) {
    return previousState;
  }

  const step = targetIndex > previousIndex ? 1 : -1;
  const clampedIndex = previousIndex + step;
  // `Unseen` is only ever the previous state that was already handled
  // above; clampedIndex can never legally regress to it from a state
  // that has left it, since Encoding is the lowest index a
  // non-Unseen page can hold.
  return STATE_ORDER[Math.max(1, clampedIndex)] as MemoryState;
}
