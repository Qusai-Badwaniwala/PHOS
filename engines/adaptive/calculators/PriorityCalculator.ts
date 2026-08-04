import { MemoryState, WorkloadCategory } from "@/shared/types";
import type { Page } from "@/shared/types";
import type { AdaptiveEngineConfig } from "../constants";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Determines whether a page's most recent review failed, using only
 * fields already present on the Page record — never queries
 * RecallEventRepository per page. A page's most recent review failed
 * if it has been reviewed at least once and either it has never
 * recalled successfully, or its last successful recall predates its
 * last review (SDS Part 11 "PERFORMANCE REQUIREMENTS": "Avoid
 * unnecessary database queries").
 */
function didLastReviewFail(page: Page): boolean {
  if (!page.lastReviewedAt) {
    return false;
  }
  if (!page.lastSuccessfulRecallAt) {
    return true;
  }
  return page.lastSuccessfulRecallAt.getTime() < page.lastReviewedAt.getTime();
}

function daysSince(date: Date, referenceDate: Date): number {
  return Math.max(0, (referenceDate.getTime() - date.getTime()) / MILLISECONDS_PER_DAY);
}

/**
 * Determines a page's workload category (SDS Part 11 "WORKLOAD
 * PRIORITY"). Every page is eligible for exactly one category.
 *
 * - `Recovery`: objectively weak — most recent review failed, or
 *   strength has fallen below the configured threshold. Driven only
 *   by objective history, never punitive (SDS Part 11 "RECOVERY
 *   MODE").
 * - `NewMemorization`: never reviewed (`Unseen`).
 * - Otherwise, "due" is computed adaptively from the page's own
 *   stability (never a fixed calendar interval, per SDS Part 11
 *   "SCHEDULING PHILOSOPHY"): due when days-since-review reaches the
 *   page's stability, overdue at a further multiple of it. A due page
 *   still consolidating (`Encoding`/`Fragile`/`Growing`) is
 *   `RecentRevision`; a due page already `Stable`/`Mastered` is
 *   `LongTermRevision`.
 * - A page that is not yet due is not eligible for today's plan at
 *   all (returns `null`).
 */
export function categorizePage(
  page: Page,
  referenceDate: Date,
  config: AdaptiveEngineConfig,
): WorkloadCategory | null {
  if (page.memoryState === MemoryState.Unseen) {
    return WorkloadCategory.NewMemorization;
  }

  if (didLastReviewFail(page) || page.memoryStrength < config.recoveryStrengthThreshold) {
    return WorkloadCategory.Recovery;
  }

  const daysSinceReview = page.lastReviewedAt
    ? daysSince(page.lastReviewedAt, referenceDate)
    : Number.POSITIVE_INFINITY;
  const dueThresholdDays = page.memoryStability * config.dueStabilityMultiplier;
  const overdueThresholdDays = page.memoryStability * config.overdueStabilityMultiplier;

  if (daysSinceReview < dueThresholdDays) {
    // Not due yet — not eligible for today's plan.
    return null;
  }

  const isOverdue = daysSinceReview >= overdueThresholdDays;
  if (isOverdue) {
    return WorkloadCategory.OverdueRevision;
  }

  const isStillConsolidating =
    page.memoryState === MemoryState.Encoding ||
    page.memoryState === MemoryState.Fragile ||
    page.memoryState === MemoryState.Growing;

  return isStillConsolidating ? WorkloadCategory.RecentRevision : WorkloadCategory.LongTermRevision;
}

/**
 * Computes a page's Priority Score (SDS Part 11 "PRIORITY
 * CALCULATION"): an internal implementation detail, never persisted
 * and never exposed directly to the UI. The category's base score
 * dominates so the invariant priority order can never be crossed by
 * within-category adjustments; the remaining terms only order pages
 * within the same category.
 */
export function calculatePriorityScore(
  page: Page,
  category: WorkloadCategory,
  referenceDate: Date,
  config: AdaptiveEngineConfig,
): number {
  const daysOverdue = page.lastReviewedAt
    ? Math.max(0, daysSince(page.lastReviewedAt, referenceDate) - page.memoryStability)
    : 0;

  const withinCategoryScore =
    daysOverdue * config.overdueWeight +
    page.difficulty * config.difficultyWeight +
    (1 - page.memoryStrength) * config.weaknessWeight;

  return config.categoryBaseScores[category] + withinCategoryScore;
}
