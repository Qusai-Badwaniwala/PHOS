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

/**
 * The exam-wise order (Phase 11).
 *
 * Its shape is driven by the exam ladder, not by the Mushaf, so the
 * tests are written against the ladder's requirements rather than
 * against the sequence they produce — a sequence assertion alone would
 * pass just as happily for an order that unlocked no exam stage early.
 */
describe("the exam-wise order", () => {
  const sequence = () => resolveRoadmap(MemorizationOrder.ExamOrder, entries()).juzSequence;

  it("puts the last five Juz first, descending", () => {
    expect(sequence().slice(0, 5)).toEqual([30, 29, 28, 27, 26]);
  });

  it("then continues through Juz 1 to 25 in order", () => {
    expect(sequence().slice(5)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it("covers every Juz exactly once", () => {
    const juzSequence = sequence();
    expect(juzSequence).toHaveLength(TOTAL_JUZ);
    expect(new Set(juzSequence).size).toBe(TOTAL_JUZ);
  });

  it("unlocks each of the first three exam stages as early as it can", () => {
    /*
     * The reason for descending rather than ascending through 26–30.
     * Stage 1 examines Juz 30, stage 2 examines 28–30, stage 3
     * examines 26–30. Ascending 26 → 30 would leave stage 1 locked
     * until the entire five-Juz block was memorized.
     */
    const juzSequence = sequence();
    const positionOf = (juz: number) => juzSequence.indexOf(juz);
    const stageComplete = (stageJuz: readonly number[]) => Math.max(...stageJuz.map(positionOf));

    expect(stageComplete([30])).toBe(0);
    expect(stageComplete([28, 29, 30])).toBe(2);
    expect(stageComplete([26, 27, 28, 29, 30])).toBe(4);
  });

  it("still removes paused Juz, like every other order", () => {
    const { juzSequence } = resolveRoadmap(
      MemorizationOrder.ExamOrder,
      entries({ 30: { paused: true } }),
    );
    expect(juzSequence[0]).toBe(29);
    expect(juzSequence).not.toContain(30);
  });
});
