import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryState } from "@/shared/types";
import type { Page } from "@/shared/types";
import { estimatePageDurationSeconds } from "@/engines/adaptive/calculators";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";
import { PRIOR_MEMORIZATION_DIFFICULTY } from "@/engines/memory";

/**
 * Logging memorization done away from PHOS (Requirement 9).
 *
 * Covered because this path and onboarding now share one definition of
 * "how many pages a day can this user revise". `pages.ts` used to carry
 * its own copy of that formula; when onboarding's copy was corrected to
 * charge the engine's real per-page cost, this one would have been left
 * seeding cycles 75% too dense — the same defect, surviving in the one
 * place nobody was looking.
 */
const settingsRepository = vi.hoisted(() => ({ getSettings: vi.fn() }));
const memoryEngine = vi.hoisted(() => ({ seedPriorMemorization: vi.fn() }));
const adaptiveEngine = vi.hoisted(() => ({
  getMemorizationSequence: vi.fn(),
  estimateSessionDuration: vi.fn(),
}));

vi.mock("@/client/container", () => ({
  container: { settingsRepository, memoryEngine, adaptiveEngine },
}));

vi.mock("@/client/commit-setup", () => ({
  seedBrowserPriorMemorization: (...args: unknown[]) => memoryEngine.seedPriorMemorization(...args),
}));

const { logMemorizedOutside } = await import("@/client/operations/pages");

/**
 * The user's roadmap. Every page is `Unseen`, because `resolvePageIds()`
 * takes "3 more pages" as the next three *unstudied* pages in the
 * sequence — a page PHOS already tracks is never re-logged.
 */
function sequence(): Page[] {
  return Array.from(
    { length: 20 },
    (_, i) => ({ id: `page-${i + 1}`, pageNumber: i + 1, memoryState: MemoryState.Unseen }) as Page,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  settingsRepository.getSettings.mockResolvedValue({ dailyAvailableMinutes: 30 });
  adaptiveEngine.getMemorizationSequence.mockResolvedValue(sequence());
  adaptiveEngine.estimateSessionDuration.mockImplementation((page: Pick<Page, "difficulty">) =>
    estimatePageDurationSeconds(page, DEFAULT_ADAPTIVE_CONFIG),
  );
  memoryEngine.seedPriorMemorization.mockResolvedValue(3);
});

describe("logging memorization done outside PHOS", () => {
  it("seeds a cycle the user's own day can actually hold", async () => {
    await logMemorizedOutside({ count: 3 });

    const [, , capacity] = memoryEngine.seedPriorMemorization.mock.calls[0]!;
    const secondsPerPage = estimatePageDurationSeconds(
      { difficulty: PRIOR_MEMORIZATION_DIFFICULTY },
      DEFAULT_ADAPTIVE_CONFIG,
    );

    // The invariant, not the number: whatever cycle this seeds must fit
    // the 30 minutes the user said they had.
    expect(capacity * secondsPerPage).toBeLessThanOrEqual(30 * 60);
    // And the old hard-coded formula would have said 24 pages.
    expect(capacity).toBeLessThan(24);
  });

  it("takes the next pages along the user's order, not page numbers 1..n", async () => {
    // Someone who began at Juz 30 has their Hifz at the end of the
    // Mushaf; resolving "2 more pages" against 1 and 2 would credit them
    // for pages they have never read.
    adaptiveEngine.getMemorizationSequence.mockResolvedValue([
      { id: "page-582", pageNumber: 582, memoryState: MemoryState.Unseen },
      { id: "page-583", pageNumber: 583, memoryState: MemoryState.Unseen },
      { id: "page-584", pageNumber: 584, memoryState: MemoryState.Unseen },
    ] as Page[]);

    await logMemorizedOutside({ count: 2 });

    const [pageIds] = memoryEngine.seedPriorMemorization.mock.calls[0]!;
    expect(pageIds).toEqual(["page-582", "page-583"]);
  });

  it("skips pages PHOS already tracks, so logging twice cannot double-count", async () => {
    adaptiveEngine.getMemorizationSequence.mockResolvedValue([
      { id: "page-1", pageNumber: 1, memoryState: MemoryState.Growing },
      { id: "page-2", pageNumber: 2, memoryState: MemoryState.Stable },
      { id: "page-3", pageNumber: 3, memoryState: MemoryState.Unseen },
      { id: "page-4", pageNumber: 4, memoryState: MemoryState.Unseen },
    ] as Page[]);

    await logMemorizedOutside({ count: 2 });

    const [pageIds] = memoryEngine.seedPriorMemorization.mock.calls[0]!;
    expect(pageIds).toEqual(["page-3", "page-4"]);
  });

  it("reports what it actually recorded, so a partial no-op is visible", async () => {
    // Pages PHOS already tracks are skipped rather than rewritten, and
    // the card's wording depends on knowing that happened.
    memoryEngine.seedPriorMemorization.mockResolvedValue(1);

    const result = await logMemorizedOutside({ count: 3 });

    expect(result.loggedPages).toBe(1);
    expect(result.requestedPages).toBe(3);
    expect(result.skippedAlreadyTracked).toBe(2);
  });
});
