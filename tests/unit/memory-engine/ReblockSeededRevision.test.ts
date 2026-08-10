import { beforeEach, describe, expect, it } from "vitest";
import { MemoryState, type Page, type RecallEvent } from "@/shared/types";
import type { IPageRepository, IRecallEventRepository } from "@/repositories";
import { MemoryEngine } from "@/engines/memory";

/**
 * The one-time repair of interleaved seeded revision.
 *
 * Reported by the product owner from their phone: revision listed 582,
 * 585, 588, 591, 594, 597, 600, 603 — the right quantity in an order
 * nobody recites. The seeding rule was fixed, but a rule cannot reach
 * dates already on somebody's device, and several people are using
 * PHOS.
 *
 * The property that makes this safe to run unattended is that the
 * *multiset* of review dates never changes. Every test below is
 * ultimately checking that.
 */
const MILLISECONDS_PER_DAY = 86_400_000;
const NOW = new Date(2026, 7, 6, 9, 0);

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * MILLISECONDS_PER_DAY);
}

/**
 * Juz 30 as the OLD seeding rule left it: `index % 3`, so page 582
 * (index 0) was "reviewed" three days ago and comes due first, 583
 * (index 1) two days ago, 584 (index 2) one day ago, and round again.
 */
function interleavedJuz30(): Page[] {
  return Array.from({ length: 23 }, (_, index) => {
    const positionInCycle = index % 3;
    const reviewedAt = daysAgo(3 - positionInCycle);
    return {
      id: `page-${582 + index}`,
      pageNumber: 582 + index,
      juzNumber: 30,
      memoryState: MemoryState.Growing,
      memoryStrength: 0.6,
      memoryStability: 3,
      difficulty: 0.5,
      firstStudiedAt: reviewedAt,
      lastReviewedAt: reviewedAt,
      lastSuccessfulRecallAt: reviewedAt,
      createdAt: NOW,
      updatedAt: NOW,
    } as Page;
  });
}

let pages: Map<string, Page>;
let recallsByPage: Map<string, RecallEvent[]>;
let engine: MemoryEngine;

function build(initial: Page[]) {
  pages = new Map(initial.map((page) => [page.id, page]));
  recallsByPage = new Map();

  const pageRepository = {
    findById: async (id: string) => pages.get(id) ?? null,
    updateReviewTimestamps: async (id: string, stamps: Record<string, Date>) => {
      pages.set(id, { ...pages.get(id)!, ...stamps } as Page);
      return pages.get(id)!;
    },
  } as unknown as IPageRepository;

  const recallEventRepository = {
    findByPage: async (pageId: string) => recallsByPage.get(pageId) ?? [],
  } as unknown as IRecallEventRepository;

  engine = new MemoryEngine({ pageRepository, recallEventRepository });
}

/** Page numbers due on each of the next N days, given stability. */
function dueByDay(days: number): number[][] {
  const groups: number[][] = Array.from({ length: days }, () => []);
  for (const page of pages.values()) {
    if (!page.lastReviewedAt) continue;
    const elapsed = (NOW.getTime() - page.lastReviewedAt.getTime()) / MILLISECONDS_PER_DAY;
    const dueIn = Math.max(0, Math.round(page.memoryStability - elapsed));
    if (dueIn < days) groups[dueIn]!.push(page.pageNumber);
  }
  return groups.map((group) => group.sort((a, b) => a - b));
}

const inOrder = () =>
  [...pages.values()].sort((a, b) => a.pageNumber - b.pageNumber).map((p) => p.id);

beforeEach(() => {
  build(interleavedJuz30());
});

describe("the reported case", () => {
  it("turns 582, 585, 588, 591 into 582–589", async () => {
    expect(dueByDay(3)[0]).toEqual([582, 585, 588, 591, 594, 597, 600, 603]);

    await engine.reblockSeededRevision(inOrder());

    const [today, tomorrow, dayThree] = dueByDay(3);
    expect(today).toEqual([582, 583, 584, 585, 586, 587, 588, 589]);
    expect(tomorrow).toEqual([590, 591, 592, 593, 594, 595, 596, 597]);
    expect(dayThree).toEqual([598, 599, 600, 601, 602, 603, 604]);
  });

  it("moves not one page from one day to another", async () => {
    /*
     * The property the whole repair rests on. It re-pairs existing
     * dates rather than recomputing any, so the number of pages falling
     * due on each day is arithmetically identical before and after —
     * nobody wakes up to a heavier morning because PHOS tidied up.
     */
    const before = dueByDay(5).map((day) => day.length);

    await engine.reblockSeededRevision(inOrder());

    expect(dueByDay(5).map((day) => day.length)).toEqual(before);
  });

  it("preserves the exact set of dates, only who holds them", async () => {
    const before = [...pages.values()].map((p) => p.lastReviewedAt!.getTime()).sort();

    await engine.reblockSeededRevision(inOrder());

    expect([...pages.values()].map((p) => p.lastReviewedAt!.getTime()).sort()).toEqual(before);
  });
});

describe("what it refuses to touch", () => {
  it("leaves any page the user has actually recited", async () => {
    /*
     * An estimate may be corrected; evidence may not — the same rule
     * `seedPriorMemorization()` follows when it skips a started page.
     *
     * Page 583 specifically, because the repair *does* move it: index 1
     * sits two days back before and three days back after. A page whose
     * date happens to be identical either way would prove nothing, and
     * this test asserted exactly that until an injected defect went
     * unnoticed.
     */
    const target = "page-583";
    const before = pages.get(target)!.lastReviewedAt!.getTime();

    // Without the guard this page is re-dated; with it, untouched.
    build(interleavedJuz30());
    recallsByPage.set(target, [{ id: "r1" } as RecallEvent]);

    await engine.reblockSeededRevision(inOrder());

    expect(pages.get(target)!.lastReviewedAt!.getTime()).toBe(before);
  });

  it("would otherwise have moved that page, which is what makes the guard real", async () => {
    // The control for the test above.
    await engine.reblockSeededRevision(inOrder());

    expect(pages.get("page-583")!.lastReviewedAt!.getTime()).not.toBe(daysAgo(2).getTime());
  });

  it("leaves pages that were never memorized", async () => {
    build([
      ...interleavedJuz30(),
      {
        id: "page-1",
        pageNumber: 1,
        juzNumber: 1,
        memoryState: MemoryState.Unseen,
        memoryStrength: 0,
        memoryStability: 0,
        difficulty: 0.5,
        firstStudiedAt: null,
        lastReviewedAt: null,
        lastSuccessfulRecallAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      } as Page,
    ]);

    await engine.reblockSeededRevision(inOrder());

    expect(pages.get("page-1")!.lastReviewedAt).toBeNull();
  });

  it("moves both review timestamps together, never just one", async () => {
    /*
     * Seeding sets `lastReviewedAt` and `lastSuccessfulRecallAt` to the
     * same instant. Leaving the success stamp behind would make the
     * Adaptive Engine read "reviewed but never recalled successfully"
     * and file the page under Recovery — telling a user their Hifz was
     * failing, as a side effect of a repair.
     */
    await engine.reblockSeededRevision(inOrder());

    for (const page of pages.values()) {
      expect(page.lastSuccessfulRecallAt!.getTime()).toBe(page.lastReviewedAt!.getTime());
    }
  });

  /*
   * `firstStudiedAt` is a different fact from "when was this last
   * revised", and this repair only rearranges the latter. It used to
   * drag the first-studied date along with it, which meant the repair
   * kept refreshing an estimate that PHOS should never have written —
   * see `clearEstimatedFirstStudied()`.
   */
  it("leaves the first-studied date alone, because it is not a review date", async () => {
    const before = new Map([...pages].map(([id, page]) => [id, page.firstStudiedAt]));

    await engine.reblockSeededRevision(inOrder());

    for (const [id, page] of pages) {
      expect(page.firstStudiedAt).toEqual(before.get(id));
    }
  });
});

describe("running it more than once", () => {
  it("changes nothing the second time", async () => {
    const first = await engine.reblockSeededRevision(inOrder());
    const second = await engine.reblockSeededRevision(inOrder());

    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);
  });

  it("reports zero for data that was already blocked", async () => {
    // Somebody who onboarded after the fix. The repair must recognise
    // there is nothing to do rather than shuffle correct data.
    build(
      Array.from({ length: 23 }, (_, index) => {
        const reviewedAt = daysAgo(3 - Math.floor(index / 8));
        return {
          id: `page-${582 + index}`,
          pageNumber: 582 + index,
          juzNumber: 30,
          memoryState: MemoryState.Growing,
          memoryStrength: 0.6,
          memoryStability: 3,
          difficulty: 0.5,
          firstStudiedAt: reviewedAt,
          lastReviewedAt: reviewedAt,
          lastSuccessfulRecallAt: reviewedAt,
          createdAt: NOW,
          updatedAt: NOW,
        } as Page;
      }),
    );

    expect(await engine.reblockSeededRevision(inOrder())).toBe(0);
  });
});

describe("order", () => {
  it("blocks along the memorization order it is given, not page number", async () => {
    /*
     * Somebody who began at Juz 30 has their Hifz at the end of the
     * Mushaf. Blocking by page number would build runs across material
     * in an order they never learned it.
     */
    const juz30 = interleavedJuz30();
    const juz1 = Array.from({ length: 21 }, (_, index) => {
      const reviewedAt = daysAgo(3 - (index % 3));
      return {
        id: `page-${1 + index}`,
        pageNumber: 1 + index,
        juzNumber: 1,
        memoryState: MemoryState.Growing,
        memoryStrength: 0.6,
        memoryStability: 3,
        difficulty: 0.5,
        firstStudiedAt: reviewedAt,
        lastReviewedAt: reviewedAt,
        lastSuccessfulRecallAt: reviewedAt,
        createdAt: NOW,
        updatedAt: NOW,
      } as Page;
    });
    build([...juz30, ...juz1]);

    // Juz 30 first, then Juz 1 — the user's own order.
    const order = [...juz30, ...juz1].map((page) => page.id);
    await engine.reblockSeededRevision(order);

    const day0 = dueByDay(3)[0]!;
    // The run starts at 582, not at page 1.
    expect(day0[0]).toBe(582);
    expect(day0.every((n, i) => i === 0 || n === day0[i - 1]! + 1)).toBe(true);
  });

  it("does nothing at all when there is nothing seeded", async () => {
    build([]);
    expect(await engine.reblockSeededRevision([])).toBe(0);
  });
});
