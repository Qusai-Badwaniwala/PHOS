import { describe, expect, it } from "vitest";
import {
  MemorizationOrder,
  resolveRoadmap,
  toJuzPriority,
  TOTAL_JUZ,
  type RoadmapEntry,
} from "@/shared/types";

/**
 * PRODUCT_REQUIREMENTS Requirement 2, "Flexible Memorization Order":
 * "PHOS must never force users into one memorization sequence."
 */
function entries(overrides: Partial<Record<number, Partial<RoadmapEntry>>> = {}): RoadmapEntry[] {
  return Array.from({ length: TOTAL_JUZ }, (_, index) => {
    const juzNumber = index + 1;
    return {
      id: `entry-${juzNumber}`,
      juzNumber,
      position: index,
      paused: false,
      ...overrides[juzNumber],
    };
  });
}

describe("resolveRoadmap", () => {
  it("orders Juz 1 to 30 for the standard order", () => {
    const { juzSequence } = resolveRoadmap(MemorizationOrder.Standard, entries());
    expect(juzSequence[0]).toBe(1);
    expect(juzSequence[29]).toBe(30);
    expect(juzSequence).toHaveLength(TOTAL_JUZ);
  });

  it("orders Juz 30 to 1 for the reverse order", () => {
    const { juzSequence } = resolveRoadmap(MemorizationOrder.Reverse, entries());
    expect(juzSequence[0]).toBe(30);
    expect(juzSequence[29]).toBe(1);
  });

  it("puts Juz 30 first and keeps the rest in natural order", () => {
    const { juzSequence } = resolveRoadmap(MemorizationOrder.Juz30First, entries());
    expect(juzSequence.slice(0, 4)).toEqual([30, 1, 2, 3]);
    expect(juzSequence[29]).toBe(29);
  });

  it("follows stored positions for a custom order", () => {
    const custom = entries({
      5: { position: 0 },
      1: { position: 1 },
      12: { position: 2 },
    }).map((entry) =>
      [5, 1, 12].includes(entry.juzNumber) ? entry : { ...entry, position: entry.juzNumber + 100 },
    );

    const { juzSequence } = resolveRoadmap(MemorizationOrder.Custom, custom);

    expect(juzSequence.slice(0, 3)).toEqual([5, 1, 12]);
  });

  it("breaks equal custom positions by Juz number, so the order is never ambiguous", () => {
    const tied = entries().map((entry) => ({ ...entry, position: 0 }));
    const { juzSequence } = resolveRoadmap(MemorizationOrder.Custom, tied);
    expect(juzSequence[0]).toBe(1);
    expect(juzSequence[1]).toBe(2);
  });

  it("removes paused Juz from the sequence rather than deferring them", () => {
    // A paused Juz means "not right now", not "later" — leaving it at
    // the end would let PHOS schedule it as soon as the rest finished.
    const withPause = entries({ 2: { paused: true }, 3: { paused: true } });
    const { juzSequence, pausedJuz } = resolveRoadmap(MemorizationOrder.Standard, withPause);

    expect(juzSequence).not.toContain(2);
    expect(juzSequence).not.toContain(3);
    expect(juzSequence).toHaveLength(TOTAL_JUZ - 2);
    expect(pausedJuz).toEqual([2, 3]);
  });
});

describe("toJuzPriority", () => {
  it("maps each Juz to its place in the sequence", () => {
    const roadmap = resolveRoadmap(MemorizationOrder.Juz30First, entries());
    const priority = toJuzPriority(roadmap);

    expect(priority.get(30)).toBe(0);
    expect(priority.get(1)).toBe(1);
  });

  it("omits paused Juz, which is how callers exclude them", () => {
    const roadmap = resolveRoadmap(MemorizationOrder.Standard, entries({ 7: { paused: true } }));
    const priority = toJuzPriority(roadmap);

    expect(priority.has(7)).toBe(false);
    expect(priority.has(8)).toBe(true);
  });
});
