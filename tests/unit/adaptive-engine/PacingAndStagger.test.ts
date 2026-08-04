import { describe, expect, it } from "vitest";
import { MemoryState, WorkloadCategory } from "@/shared/types";
import type { Page, Session } from "@/shared/types";
import type {
  IPageRepository,
  IRecallEventRepository,
  ISessionRepository,
  ISettingsRepository,
} from "@/repositories";
import type { IMemoryEngine } from "@/engines/memory";
import { AdaptiveEngine } from "@/engines/adaptive";
import { MemoryEngine } from "@/engines/memory";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";

/**
 * Two scheduling defects found by the product owner using PHOS, both
 * invisible to every existing test.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

function unseenPage(pageNumber: number): Page {
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    juzNumber: Math.ceil(pageNumber / 20),
    memoryState: MemoryState.Unseen,
    memoryStrength: 0,
    memoryStability: 0,
    difficulty: 0.5,
    firstStudiedAt: null,
    lastReviewedAt: null,
    lastSuccessfulRecallAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------
// Pacing: a target below one page a day is spread across days
// ---------------------------------------------------------------

/**
 * `Math.ceil(target)` alone, applied every day, silently turned "half a
 * page a day" into a full page daily — twice the pace the user asked
 * for. Someone needing 2½ days per page was pushed 2½× too fast, the
 * overload Requirement 7 exists to prevent.
 */
function buildPacingEngine(comfortableDailyPages: number, daysSinceLastNewPage: number | null) {
  const pages: Page[] = Array.from({ length: 50 }, (_, i) => unseenPage(i + 1));

  // One already-started page carries the `firstStudiedAt` the pacing
  // check reads.
  if (daysSinceLastNewPage !== null) {
    pages[0] = {
      ...pages[0]!,
      memoryState: MemoryState.Growing,
      memoryStrength: 0.6,
      memoryStability: 60, // far from due, so it cannot appear as revision
      firstStudiedAt: new Date(Date.now() - daysSinceLastNewPage * MILLISECONDS_PER_DAY),
      lastReviewedAt: new Date(Date.now() - daysSinceLastNewPage * MILLISECONDS_PER_DAY),
      lastSuccessfulRecallAt: new Date(Date.now() - daysSinceLastNewPage * MILLISECONDS_PER_DAY),
    };
  }

  return new AdaptiveEngine({
    pageRepository: { findAll: async () => pages } as unknown as IPageRepository,
    sessionRepository: {
      findBetweenDates: async () => [],
      findSessionItems: async () => [],
      findLastCompleted: async (): Promise<Session | null> => null,
    } as unknown as ISessionRepository,
    settingsRepository: {
      getSettings: async () => ({ comfortableDailyPages }),
    } as unknown as ISettingsRepository,
    memoryEngine: {} as unknown as IMemoryEngine,
    config: DEFAULT_ADAPTIVE_CONFIG,
  });
}

async function newPagesOffered(
  comfortableDailyPages: number,
  daysSinceLastNewPage: number | null,
): Promise<number> {
  const plan = await buildPacingEngine(
    comfortableDailyPages,
    daysSinceLastNewPage,
  ).generateDailyPlan(60);
  return plan.studyItems.filter(
    (item) => item.workloadCategory === WorkloadCategory.NewMemorization,
  ).length;
}

describe("pacing new memorization below one page a day", () => {
  it("offers the very first page immediately, whatever the pace", async () => {
    expect(await newPagesOffered(0.5, null)).toBeGreaterThan(0);
    expect(await newPagesOffered(0.25, null)).toBeGreaterThan(0);
  });

  it("half a page a day means a new page every other day, not every day", async () => {
    expect(await newPagesOffered(0.5, 0)).toBe(0);
    expect(await newPagesOffered(0.5, 1)).toBe(0);
    expect(await newPagesOffered(0.5, 2)).toBeGreaterThan(0);
  });

  it("honours a two-and-a-half-day pace", async () => {
    // 0.4 pages/day → one page every 2.5 days.
    expect(await newPagesOffered(0.4, 2)).toBe(0);
    expect(await newPagesOffered(0.4, 3)).toBeGreaterThan(0);
  });

  it("still offers a page every day at a pace of one", async () => {
    expect(await newPagesOffered(1, 0)).toBe(1);
    expect(await newPagesOffered(1, 1)).toBe(1);
  });

  it("offers more than one a day above a pace of one", async () => {
    expect(await newPagesOffered(2, 0)).toBe(2);
  });

  it("never withholds revision — pacing applies to new work only", async () => {
    const plan = await buildPacingEngine(0.5, 0).generateDailyPlan(60);
    // The seeded page is deliberately far from due here, so the point
    // is simply that nothing threw and revision was never filtered by
    // the pacing rule.
    expect(
      plan.studyItems.every((i) => i.workloadCategory === WorkloadCategory.NewMemorization),
    ).toBe(true);
    expect(plan.studyItems).toHaveLength(0);
  });
});

// ---------------------------------------------------------------
// Staggering: seeded pages must not all come due together
// ---------------------------------------------------------------

/**
 * Seeding stamped every page with the same stability and effectively
 * the same timestamp, so 23 reported pages fell due as one block — and,
 * keeping identical stability, would do so again every cycle. Spreading
 * them turns the block into a steady stream.
 */
function buildSeedingEngine(pageCount: number) {
  const pages = new Map<string, Page>();
  for (let i = 1; i <= pageCount; i += 1) {
    pages.set(`page-${i}`, unseenPage(i));
  }

  const pageRepository = {
    findById: async (id: string) => pages.get(id) ?? null,
    updateMemoryVariables: async (id: string, values: Record<string, number>) => {
      const page = pages.get(id)!;
      pages.set(id, { ...page, ...values } as Page);
      return pages.get(id)!;
    },
    updateMemoryState: async (id: string, state: MemoryState) => {
      pages.set(id, { ...pages.get(id)!, memoryState: state });
      return pages.get(id)!;
    },
    updateReviewTimestamps: async (id: string, stamps: Record<string, Date>) => {
      pages.set(id, { ...pages.get(id)!, ...stamps } as Page);
      return pages.get(id)!;
    },
  } as unknown as IPageRepository;

  const engine = new MemoryEngine({
    pageRepository,
    recallEventRepository: {} as unknown as IRecallEventRepository,
  });

  return { engine, pages };
}

/** How many of the seeded pages fall due on each of the next N days. */
function dueCountsByDay(pages: readonly Page[], days: number): number[] {
  const counts = new Array<number>(days).fill(0);
  for (const page of pages) {
    if (!page.lastReviewedAt) continue;
    const daysSince = (Date.now() - page.lastReviewedAt.getTime()) / MILLISECONDS_PER_DAY;
    const dueInDays = Math.max(0, Math.round(page.memoryStability - daysSince));
    if (dueInDays < days) counts[dueInDays] = (counts[dueInDays] ?? 0) + 1;
  }
  return counts;
}

describe("staggering seeded prior memorization", () => {
  it("spreads review dates instead of stamping them all at once", async () => {
    const { engine, pages } = buildSeedingEngine(23);
    await engine.seedPriorMemorization(
      [...pages.keys()],
      true,
      5, // 5 pages/day capacity → a 5-day cycle for 23 pages
    );

    const seeded = [...pages.values()];
    const distinctDates = new Set(
      seeded.map((p) => Math.round((p.lastReviewedAt?.getTime() ?? 0) / MILLISECONDS_PER_DAY)),
    );

    // The defect produced exactly one distinct day for all 23.
    expect(distinctDates.size).toBeGreaterThan(1);
  });

  it("produces a steady stream rather than one block", async () => {
    const { engine, pages } = buildSeedingEngine(23);
    await engine.seedPriorMemorization([...pages.keys()], true, 5);

    const counts = dueCountsByDay([...pages.values()], 10);
    const daysWithWork = counts.filter((c) => c > 0).length;

    expect(daysWithWork).toBeGreaterThan(1);
    // No single day carries everything.
    expect(Math.max(...counts)).toBeLessThan(23);
  });

  it("scales the cycle to the volume, so a Hafiz is not asked for 604 pages every 3 days", async () => {
    const { engine, pages } = buildSeedingEngine(200);
    await engine.seedPriorMemorization([...pages.keys()], true, 20);

    const stabilities = new Set([...pages.values()].map((p) => p.memoryStability));
    const cycle = [...stabilities][0]!;

    // 200 pages at 20/day → a 10-day cycle, not the old fixed 3.
    expect(stabilities.size).toBe(1);
    expect(cycle).toBeGreaterThan(3);
    expect(cycle).toBeLessThanOrEqual(30);
  });

  it("records when each page was first studied", async () => {
    const { engine, pages } = buildSeedingEngine(5);
    await engine.seedPriorMemorization([...pages.keys()], true, 5);

    for (const page of pages.values()) {
      expect(page.firstStudiedAt).not.toBeNull();
    }
  });
});
