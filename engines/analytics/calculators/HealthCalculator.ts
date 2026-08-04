import { MemoryState } from "@/shared/types";
import type { Page } from "@/shared/types";
import type { MemoryHealth } from "@/shared/types";
import {
  HEALTH_STABILITY_REFERENCE_DAYS,
  HEALTH_STABILITY_WEIGHT,
  HEALTH_STRENGTH_WEIGHT,
} from "../constants";

/**
 * Computes overall Memory Health across every page that has been
 * reviewed at least once (SDS Part 14 "MEMORY HEALTH CONTRACT").
 * Always computed on demand from Page data alone; never persisted.
 *
 * Blends average strength and normalized stability into a single
 * 0-100 score. Pages still `Unseen` are excluded — a page that has
 * never been studied has no memory to assess yet.
 */
export function calculateMemoryHealth(pages: readonly Page[], calculatedAt: Date): MemoryHealth {
  const reviewedPages = pages.filter((page) => page.memoryState !== MemoryState.Unseen);

  if (reviewedPages.length === 0) {
    return { score: 0, calculatedAt, assessedPages: 0 };
  }

  const averageStrength =
    reviewedPages.reduce((sum, page) => sum + page.memoryStrength, 0) / reviewedPages.length;
  const averageNormalizedStability =
    reviewedPages.reduce(
      (sum, page) => sum + Math.min(1, page.memoryStability / HEALTH_STABILITY_REFERENCE_DAYS),
      0,
    ) / reviewedPages.length;

  const blended =
    averageStrength * HEALTH_STRENGTH_WEIGHT + averageNormalizedStability * HEALTH_STABILITY_WEIGHT;

  return {
    score: Math.round(blended * 100),
    calculatedAt,
    assessedPages: reviewedPages.length,
  };
}
