import { it, expect } from "vitest";
import { AdaptiveEngine } from "@/engines/adaptive";
import { MemoryState, WorkloadCategory } from "@/shared/types";
import type { Page } from "@/shared/types";
import type { IPageRepository, ISessionRepository } from "@/repositories";
import type { IMemoryEngine } from "@/engines/memory";
function engineWithNewPageToday() {
  const now = new Date();
  const pages: Page[] = Array.from({ length: 5 }, (_, index) => ({
    id: `page-${index + 1}`,
    pageNumber: index + 1,
    juzNumber: 1,
    memoryState: index === 0 ? MemoryState.Encoding : MemoryState.Unseen,
    memoryStrength: index === 0 ? 0.2 : 0,
    memoryStability: index === 0 ? 1 : 0,
    difficulty: 0.3,
    firstStudiedAt: index === 0 ? now : null,
    lastReviewedAt: index === 0 ? now : null,
    lastSuccessfulRecallAt: index === 0 ? now : null,
    createdAt: now,
    updatedAt: now,
  }));
  return new AdaptiveEngine({
    pageRepository: { findAll: async () => pages } as unknown as IPageRepository,
    sessionRepository: {
      findBetweenDates: async () => [],
      findLastCompleted: async () => null,
      findSessionItems: async () => [],
    } as unknown as ISessionRepository,
    memoryEngine: {} as IMemoryEngine,
  });
}
it("does not replace a completed daily new page with another ordinary recommendation", async () => {
  const plan = await engineWithNewPageToday().generateDailyPlan(60);
  expect(
    plan.studyItems.filter((item) => item.workloadCategory === WorkloadCategory.NewMemorization),
  ).toHaveLength(0);
});

it("offers extra new study only through the explicit voluntary option", async () => {
  const plan = await engineWithNewPageToday().generateDailyPlan(60, { extraNewMemorization: true });
  expect(
    plan.studyItems.filter((item) => item.workloadCategory === WorkloadCategory.NewMemorization),
  ).toHaveLength(1);
});
