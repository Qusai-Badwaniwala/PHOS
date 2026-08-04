import type { Page } from "@/shared/types";
import type { AdaptiveEngineConfig } from "../constants";

/**
 * Estimates how long a single page will take to study, in seconds
 * (SDS Part 11 `estimateSessionDuration()`). Deterministic: a fixed
 * base duration extended proportionally by the page's difficulty.
 */
export function estimatePageDurationSeconds(page: Page, config: AdaptiveEngineConfig): number {
  return Math.round(config.baseDurationSeconds + page.difficulty * config.difficultyDurationWeight);
}
