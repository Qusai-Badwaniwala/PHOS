import { WorkloadCategory } from "@/shared/types";
import type { MemorizationRoadmap, Page, StudyItem } from "@/shared/types";
import { toJuzPriority } from "@/shared/types";
import type { AdaptiveEngineConfig } from "../constants";
import { calculatePriorityScore, categorizePage } from "./PriorityCalculator";
import { estimatePageDurationSeconds } from "./DurationCalculator";

export interface RankedPage {
  readonly page: Page;
  readonly category: WorkloadCategory;
  readonly priorityScore: number;
  readonly estimatedDurationSeconds: number;
}

/**
 * Categorizes and ranks every eligible page (SDS Part 11
 * `rankPages()`). Pages that are not yet due are excluded entirely
 * (they are not part of "today's" competition for study time — SDS
 * Part 11 "SCHEDULING PHILOSOPHY": "each page competes for today's
 * available study time").
 *
 * When a `roadmap` is supplied (PRODUCT_REQUIREMENTS Requirement 2,
 * "Flexible Memorization Order") it governs **new memorization only**:
 *
 * - pages in a paused Juz are not offered as new memorization;
 * - among new-memorization pages, the roadmap's Juz sequence decides
 *   which comes first, rather than the Mushaf's page order.
 *
 * Revision is deliberately untouched by the roadmap. Requirement 2 is
 * explicit that "Already memorized pages remain memorized. Only future
 * scheduling changes" — so pausing Juz 5 stops PHOS assigning *new*
 * pages from it, and never stops revising the pages of Juz 5 already
 * learned. Filtering revision by the roadmap would quietly strand
 * memorized work, which is precisely the data-loss-by-scheduling the
 * requirement forbids.
 *
 * Ties are broken by roadmap position first (for new memorization) and
 * then by `pageNumber` ascending, so the result stays fully
 * deterministic (SDS Part 11 "PLAN GENERATION CONTRACT").
 */
export function rankPages(
  pages: readonly Page[],
  referenceDate: Date,
  config: AdaptiveEngineConfig,
  roadmap?: MemorizationRoadmap,
): readonly RankedPage[] {
  const ranked: RankedPage[] = [];
  const juzPriority = roadmap ? toJuzPriority(roadmap) : null;

  for (const page of pages) {
    const category = categorizePage(page, referenceDate, config);
    if (category === null) {
      continue;
    }

    // A Juz missing from the sequence is paused. Only new memorization
    // is withheld; revision of that Juz continues normally.
    if (
      juzPriority &&
      category === WorkloadCategory.NewMemorization &&
      !juzPriority.has(page.juzNumber)
    ) {
      continue;
    }

    ranked.push({
      page,
      category,
      priorityScore: calculatePriorityScore(page, category, referenceDate, config),
      estimatedDurationSeconds: estimatePageDurationSeconds(page, config),
    });
  }

  return ranked.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    if (
      juzPriority &&
      a.category === WorkloadCategory.NewMemorization &&
      b.category === WorkloadCategory.NewMemorization
    ) {
      const aJuz = juzPriority.get(a.page.juzNumber) ?? Number.MAX_SAFE_INTEGER;
      const bJuz = juzPriority.get(b.page.juzNumber) ?? Number.MAX_SAFE_INTEGER;
      if (aJuz !== bJuz) {
        return aJuz - bJuz;
      }
    }

    return a.page.pageNumber - b.page.pageNumber;
  });
}

/**
 * Allocates available study time across ranked pages (SDS Part 11
 * `allocateStudyTime()` / `balanceWorkload()`).
 *
 * Greedily accepts pages in priority order until the available time
 * would be exceeded. Because `NewMemorization` always has the lowest
 * category base score (SDS Part 11 "WORKLOAD PRIORITY"), it is
 * naturally the first work postponed when time is limited — this *is*
 * how "retention shall always be protected before expansion" and "new
 * memorization shall be postponed before revision" are satisfied,
 * rather than through a separate reserved-quota mechanism the SDS does
 * not specify. The engine never exceeds the supplied duration (SDS
 * Part 11 "AVAILABLE TIME CONTRACT").
 */
export function allocateStudyTime(
  rankedPages: readonly RankedPage[],
  availableStudyMinutes: number,
): readonly RankedPage[] {
  const availableSeconds = availableStudyMinutes * 60;
  const allocated: RankedPage[] = [];
  let usedSeconds = 0;

  for (const ranked of rankedPages) {
    if (usedSeconds + ranked.estimatedDurationSeconds > availableSeconds) {
      continue;
    }
    allocated.push(ranked);
    usedSeconds += ranked.estimatedDurationSeconds;
  }

  return allocated;
}

/** Converts allocated, ranked pages into the ordered StudyItems that make up a DailyStudyPlan. */
export function toStudyItems(allocatedPages: readonly RankedPage[]): readonly StudyItem[] {
  return allocatedPages.map((ranked, index) => ({
    pageId: ranked.page.id,
    pageNumber: ranked.page.pageNumber,
    memoryState: ranked.page.memoryState,
    workloadCategory: ranked.category,
    juzNumber: ranked.page.juzNumber,
    recommendedOrder: index,
    estimatedDurationSeconds: ranked.estimatedDurationSeconds,
  }));
}
