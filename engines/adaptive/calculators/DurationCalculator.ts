import type { Page } from "@/shared/types";
import type { AdaptiveEngineConfig } from "../constants";

/**
 * Estimates how long a single page will take to study, in seconds
 * (SDS Part 11 `estimateSessionDuration()`). Deterministic: a fixed
 * base duration extended proportionally by the page's difficulty.
 *
 * Takes only the field it actually reads, so callers that need the cost
 * of a *hypothetical* page — "what would a freshly seeded page cost?" —
 * can ask without fabricating a whole `Page`. That question has a real
 * caller: onboarding sizes its revision cycle from it. Before this, the
 * seeding path carried its own guess of "about a minute a page" while
 * the allocator charged 105 seconds, so PHOS scheduled roughly 75% more
 * revision per day than its own clock could fit, and the shortfall
 * compounded until new memorization never fitted again.
 */
export function estimatePageDurationSeconds(
  page: Pick<Page, "difficulty">,
  config: AdaptiveEngineConfig,
): number {
  return Math.round(config.baseDurationSeconds + page.difficulty * config.difficultyDurationWeight);
}
