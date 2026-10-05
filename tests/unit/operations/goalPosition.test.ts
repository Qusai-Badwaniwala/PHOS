import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryState, type Page } from "@/shared/types";

/**
 * A goal is stored in pages, because that is what the projection can do
 * arithmetic with. Nobody plans their Hifz that way, so the picker
 * offers Juz — and "through Juz 5" only means something along the
 * user's *own* order. These tests pin that translation, which is the
 * one place the two units meet.
 */
const adaptiveEngine = vi.hoisted(() => ({ getMemorizationSequence: vi.fn() }));
const pageRepository = vi.hoisted(() => ({ findAll: vi.fn() }));
vi.mock("@/client/container", () => ({ container: { adaptiveEngine, pageRepository } }));

const { getGoalPosition } = await import("@/client/operations/settings");

/**
 * Pages in the order the user memorizes them, the first `memorized` of
 * them already started.
 *
 * `juzSizes` is given as `[juzNumber, pageCount]` so a test can state a
 * Juz-30-first order — 23 pages of Juz 30, then 21 of Juz 1 — without
 * building 604 rows.
 */
function sequence(juzSizes: readonly [number, number][], memorized = 0): Page[] {
  const pages: Page[] = [];
  let pageNumber = 1;
  for (const [juzNumber, size] of juzSizes) {
    for (let i = 0; i < size; i += 1) {
      pages.push({
        id: `page-${pages.length + 1}`,
        pageNumber: pageNumber++,
        juzNumber,
        memoryState: pages.length < memorized ? MemoryState.Growing : MemoryState.Unseen,
      } as unknown as Page);
    }
  }
  return pages;
}

/** The real Juz-30-first opening: Juz 30, then 1, 2, 3, 4, 5. */
const JUZ_30_FIRST: [number, number][] = [
  [30, 23],
  [1, 21],
  [2, 20],
  [3, 20],
  [4, 20],
  [5, 20],
];

beforeEach(() => {
  vi.clearAllMocks();
  pageRepository.findAll.mockImplementation(() => adaptiveEngine.getMemorizationSequence());
});

describe("milestones along the user's own order", () => {
  it("lists Juz in memorization order, not Mushaf order", async () => {
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence(JUZ_30_FIRST));

    const { milestones } = await getGoalPosition();

    expect(milestones.map((m) => m.juzNumber)).toEqual([30, 1, 2, 3, 4, 5]);
    expect(milestones.map((m) => m.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("accumulates real Juz lengths rather than assuming twenty pages each", async () => {
    // Juz 30 is 23 pages and Juz 1 is 21. Multiplying by a flat 20 would
    // put "through Juz 5" at 100 pages instead of 124.
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence(JUZ_30_FIRST));

    const { milestones } = await getGoalPosition();

    expect(milestones.map((m) => m.cumulativePages)).toEqual([23, 44, 64, 84, 104, 124]);
  });

  it("gives the same words a different page count for a different order", async () => {
    // "Through Juz 5" is 124 pages above and 101 here. This is the whole
    // reason the picker cannot simply be a Juz number.
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(
      sequence([
        [1, 21],
        [2, 20],
        [3, 20],
        [4, 20],
        [5, 20],
      ]),
    );

    const { milestones } = await getGoalPosition();

    expect(milestones[4]).toMatchObject({ juzNumber: 5, cumulativePages: 101 });
  });

  it("marks the Juz already covered by what the user has memorized", async () => {
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence(JUZ_30_FIRST, 38));

    const { milestones } = await getGoalPosition();

    // 38 pages covers Juz 30 (23) but not Juz 1 (44).
    expect(milestones.map((m) => m.reached)).toEqual([true, false, false, false, false, false]);
  });
});

describe("where the user currently is", () => {
  it("still counts learned pages in paused Juz", async () => {
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence([[2, 20]], 0));
    pageRepository.findAll.mockResolvedValue(
      sequence(
        [
          [1, 21],
          [2, 20],
        ],
        21,
      ),
    );
    const position = await getGoalPosition();
    expect(position.pagesMemorized).toBe(21);
    expect(position.currentJuz).toBe(2);
  });
  it("reports the Juz holding their next unstudied page", async () => {
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence(JUZ_30_FIRST, 38));

    const position = await getGoalPosition();

    // 38 pages in: all of Juz 30, and 15 pages into Juz 1.
    expect(position.pagesMemorized).toBe(38);
    expect(position.currentJuz).toBe(1);
  });

  it("counts pages that have left Unseen, not pages that exist", async () => {
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence(JUZ_30_FIRST, 0));

    const position = await getGoalPosition();

    expect(position.pagesMemorized).toBe(0);
    expect(position.currentJuz).toBe(30);
  });

  it("says there is no current Juz once everything has been started", async () => {
    // "Currently on Juz 5" would be wrong for somebody who has finished
    // it, and the caller renders a different sentence for this.
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence(JUZ_30_FIRST, 124));

    const position = await getGoalPosition();

    expect(position.currentJuz).toBeNull();
    expect(position.pagesMemorized).toBe(124);
  });
});

describe("edge cases the picker must survive", () => {
  it("returns nothing rather than throwing when the sequence is empty", async () => {
    adaptiveEngine.getMemorizationSequence.mockResolvedValue([]);

    const position = await getGoalPosition();

    expect(position.milestones).toEqual([]);
    expect(position.currentJuz).toBeNull();
  });

  it("does not merge a Juz that the order visits twice into one milestone", async () => {
    /*
     * No shipped order does this, but a custom roadmap could. Grouping
     * by Juz number instead of by run would silently collapse the two
     * visits and hand the second one the first one's page count.
     */
    adaptiveEngine.getMemorizationSequence.mockResolvedValue(
      sequence([
        [30, 5],
        [1, 5],
        [30, 5],
      ]),
    );

    const { milestones } = await getGoalPosition();

    expect(milestones.map((m) => m.juzNumber)).toEqual([30, 1, 30]);
    expect(milestones.map((m) => m.cumulativePages)).toEqual([5, 10, 15]);
  });
});
