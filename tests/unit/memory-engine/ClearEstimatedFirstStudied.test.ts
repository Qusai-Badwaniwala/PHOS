import { beforeEach, describe, expect, it } from "vitest";
import { MemoryState, type Page, type RecallEvent } from "@/shared/types";
import type { IPageRepository, IRecallEventRepository } from "@/repositories";
import { MemoryEngine } from "@/engines/memory";

/**
 * The one-time clearing of invented first-studied dates.
 *
 * Seeding used to stamp every page of declared prior memorization with
 * its staggered review date. Both readers of that field then took the
 * estimate for evidence — most visibly the goal projection, which told
 * a user seeding 304 pages "at about 16 pages a day, you'd reach 424
 * pages around 18/08/2026" on the same screen as "nothing recorded in
 * the last seven days".
 *
 * The seeding rule is fixed, but a rule cannot reach dates already
 * written to somebody's device, and PHOS has users.
 *
 * The property that makes this safe to run unattended is that it only
 * ever touches pages with no recall event behind them — pages PHOS
 * estimated rather than observed.
 */
const MILLISECONDS_PER_DAY = 86_400_000;
const NOW = new Date(2026, 7, 10, 9, 0);

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * MILLISECONDS_PER_DAY);
}

function seededPage(pageNumber: number, days: number): Page {
  const reviewedAt = daysAgo(days);
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.6,
    memoryStability: 7,
    difficulty: 0.5,
    // Exactly what the old seeding wrote.
    firstStudiedAt: reviewedAt,
    lastReviewedAt: reviewedAt,
    lastSuccessfulRecallAt: reviewedAt,
    createdAt: NOW,
    updatedAt: NOW,
  } as Page;
}

let pages: Map<string, Page>;
let recallsByPage: Map<string, RecallEvent[]>;
let engine: MemoryEngine;

function build(initial: Page[]) {
  pages = new Map(initial.map((page) => [page.id, page]));
  recallsByPage = new Map();

  const pageRepository = {
    findAll: async () => [...pages.values()],
    findById: async (id: string) => pages.get(id) ?? null,
    updateReviewTimestamps: async (id: string, stamps: Record<string, Date | null>) => {
      pages.set(id, { ...pages.get(id)!, ...stamps } as Page);
      return pages.get(id)!;
    },
  } as unknown as IPageRepository;

  const recallEventRepository = {
    findByPage: async (pageId: string) => recallsByPage.get(pageId) ?? [],
  } as unknown as IRecallEventRepository;

  engine = new MemoryEngine({ pageRepository, recallEventRepository });
}

beforeEach(() => {
  build([seededPage(1, 5), seededPage(2, 3), seededPage(3, 1)]);
});

describe("clearing invented first-studied dates", () => {
  it("clears the estimate PHOS wrote for itself", async () => {
    const cleared = await engine.clearEstimatedFirstStudied();

    expect(cleared).toBe(3);
    for (const page of pages.values()) {
      expect(page.firstStudiedAt).toBeNull();
    }
  });

  /*
   * The rule that makes this safe, and it is finer than "has a recall
   * event".
   *
   * When PHOS genuinely watched a page leave `Unseen`, `recordRecall()`
   * stamped `firstStudiedAt` with that first event's timestamp, so the
   * two agree exactly. That is evidence, and it is left alone.
   */
  it("refuses to touch a page whose date PHOS actually observed", async () => {
    const observed = daysAgo(3);
    recallsByPage.set("page-2", [
      { id: "e1", pageId: "page-2", timestamp: observed } as RecallEvent,
    ]);

    const cleared = await engine.clearEstimatedFirstStudied();

    expect(cleared).toBe(2);
    expect(pages.get("page-2")!.firstStudiedAt).toEqual(observed);
    expect(pages.get("page-1")!.firstStudiedAt).toBeNull();
  });

  /*
   * The gap a code review caught, and the one that would have kept the
   * original bug alive.
   *
   * A seeded page the user has since *revised* has recall events — but
   * its `firstStudiedAt` is still the invented date, not an observed
   * one. Skipping every page with any event would leave exactly those
   * pages untouched, and they carry the *most recent* fabricated dates.
   * `daysSinceLastNewPage()` takes the maximum across all pages, so one
   * survivor withholds new memorization just as before.
   *
   * The events are necessarily *later* than the fabricated date, which
   * is what separates the two cases.
   */
  it("clears a seeded page the user has since revised", async () => {
    recallsByPage.set("page-2", [
      // Revised yesterday; seeding claimed it was first studied 3 days ago.
      { id: "e1", pageId: "page-2", timestamp: daysAgo(1) } as RecallEvent,
    ]);

    const cleared = await engine.clearEstimatedFirstStudied();

    expect(cleared).toBe(3);
    expect(pages.get("page-2")!.firstStudiedAt).toBeNull();
  });

  /*
   * The repair changes what the user is *told*, never what they are
   * asked to do. `firstStudiedAt` steers nothing that picks pages, and
   * the review dates that do are restated exactly as found.
   */
  it("moves no revision, because it leaves every review date where it was", async () => {
    const before = [...pages.values()].map((page) => ({
      id: page.id,
      reviewed: page.lastReviewedAt!.getTime(),
      recalled: page.lastSuccessfulRecallAt!.getTime(),
      stability: page.memoryStability,
      state: page.memoryState,
    }));

    await engine.clearEstimatedFirstStudied();

    expect(
      [...pages.values()].map((page) => ({
        id: page.id,
        reviewed: page.lastReviewedAt!.getTime(),
        recalled: page.lastSuccessfulRecallAt!.getTime(),
        stability: page.memoryStability,
        state: page.memoryState,
      })),
    ).toEqual(before);
  });

  it("is idempotent, so a retry after a half-finished run costs nothing", async () => {
    await engine.clearEstimatedFirstStudied();

    expect(await engine.clearEstimatedFirstStudied()).toBe(0);
  });

  it("ignores pages that were never memorized at all", async () => {
    build([
      { ...seededPage(1, 5), memoryState: MemoryState.Unseen, firstStudiedAt: null } as Page,
      seededPage(2, 3),
    ]);

    expect(await engine.clearEstimatedFirstStudied()).toBe(1);
  });
});
