/**
 * Generates a unique correlation identifier.
 *
 * Used to trace one logical operation across API -> Engine ->
 * Repository -> Background Jobs (SDS Part 23 "CORRELATION ID
 * CONTRACT"). Also used internally to generate unique timer handles.
 *
 * This is the one deliberate exception to the "prefer pure functions"
 * guideline (SDS Part 4): a correlation/identifier generator must
 * produce a different value on every call by definition, so it cannot
 * be pure in the strict sense. Everything else about it (no hidden
 * mutation of external state, no I/O) still holds.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
