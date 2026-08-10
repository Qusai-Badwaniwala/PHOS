import { describe, expect, it, vi } from "vitest";

/**
 * Turning "I have memorized three Juz" into a page count.
 *
 * The wizard used to ask for pages outright, having just offered four
 * choices phrased in Juz. Juz are not a uniform length — Juz 30 is 23
 * pages, Juz 1 is 21 — so the user was left doing real arithmetic in
 * their head, and worse arithmetic still if their memorization was not
 * one contiguous run.
 *
 * The rule has to be applied against the user's own *order*, which is
 * why the wizard now asks for that first. Three Juz means Juz 30, 29
 * and 28 for someone working back from the end of the Mushaf, and those
 * are not the same pages — nor the same number of them — as Juz 1, 2
 * and 3.
 */
vi.mock("@/client/container", () => ({ container: {} }));

const { pagesForJuzMemorized } = await import("@/client/operations/settings");

/** Juz of deliberately unequal length, as the real Mushaf has. */
const JUZ_LENGTHS: Record<number, number> = { 1: 21, 2: 20, 3: 22, 29: 21, 30: 23 };

function sequenceFor(juzNumbers: readonly number[]) {
  return juzNumbers.flatMap((juzNumber) =>
    Array.from({ length: JUZ_LENGTHS[juzNumber] ?? 20 }, () => ({ juzNumber })),
  );
}

describe("converting a Juz answer into pages", () => {
  it("counts the real length of each Juz, not twenty apiece", () => {
    const standard = sequenceFor([1, 2, 3, 29, 30]);

    // 21 + 20 + 22 — the kind of sum the user was previously asked to
    // do unaided.
    expect(pagesForJuzMemorized(standard, 3, 0)).toBe(63);
  });

  /*
   * The reason the order step had to move before the amount step. Both
   * users say "three Juz"; they mean different pages and a different
   * number of them.
   */
  it("resolves the same answer differently under a different order", () => {
    const standard = sequenceFor([1, 2, 3, 29, 30]);
    const juz30First = sequenceFor([30, 29, 1, 2, 3]);

    expect(pagesForJuzMemorized(standard, 3, 0)).toBe(63);
    expect(pagesForJuzMemorized(juz30First, 3, 0)).toBe(65);
  });

  it("adds pages into the next Juz for anyone who did not stop on a boundary", () => {
    const standard = sequenceFor([1, 2, 3, 29, 30]);

    expect(pagesForJuzMemorized(standard, 2, 7)).toBe(48);
  });

  it("records nothing for someone just starting", () => {
    expect(pagesForJuzMemorized(sequenceFor([1, 2, 3]), 0, 0)).toBe(0);
  });

  it("takes loose pages alone, for someone part-way through their first Juz", () => {
    expect(pagesForJuzMemorized(sequenceFor([1, 2, 3]), 0, 9)).toBe(9);
  });

  it("never claims more of the Mushaf than exists", () => {
    const whole = sequenceFor([1, 2, 3]);

    // A Hafiz who also nudges the extra-pages field must not end up
    // seeded past the end of their own sequence.
    expect(pagesForJuzMemorized(whole, 3, 50)).toBe(whole.length);
  });

  it("ignores a negative extra rather than eating into the Juz count", () => {
    expect(pagesForJuzMemorized(sequenceFor([1, 2, 3]), 2, -5)).toBe(41);
  });
});
