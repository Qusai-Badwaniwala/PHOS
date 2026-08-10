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
 * How many pages of new memorization the day's plan protects from being
 * crowded out by revision entirely.
 *
 * One, deliberately: enough that progress can never reach zero, small
 * enough that a user whose revision is already over capacity is not
 * handed more to forget. Above this floor the ordinary priority rules
 * still apply, so a heavy day still postpones new work — it just cannot
 * postpone all of it, forever.
 */
const RESERVED_NEW_MEMORIZATION_PAGES = 1;

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
 *
 * **With one floor: postponed is not the same as abandoned.**
 *
 * Pure priority order made the postponement permanent. Revision that
 * does not fit today is still due tomorrow, by then *more* overdue and
 * so ranked higher still, which means a user whose revision fills their
 * day is never offered another new page as long as they live. Observed
 * on a first run with entirely ordinary answers — "I have memorized
 * several Juz", 60 minutes a day — which produced 34 pages of revision,
 * 9 pages of daily overflow, and "No assignment scheduled" on day one.
 *
 * So the highest-priority new page is admitted even when the clock is
 * full, displacing the *least* urgent revision already allocated rather
 * than extending the day. Retention still wins — it keeps every page it
 * had but the one it could most afford to defer — and the plan still
 * fits inside the minutes the user said they had.
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

  const isNew = (item: RankedPage) => item.category === WorkloadCategory.NewMemorization;
  if (allocated.filter(isNew).length >= RESERVED_NEW_MEMORIZATION_PAGES) {
    return allocated;
  }

  // `rankedPages` is sorted, so the first match is the new page the
  // roadmap says comes next — never an arbitrary one.
  const alreadyAllocated = new Set(allocated);
  const nextNewPage = rankedPages.find((item) => isNew(item) && !alreadyAllocated.has(item));
  if (!nextNewPage) {
    return allocated;
  }

  /*
   * Give up the least urgent revision until the new page fits — but
   * never the last of it (`index > 0`).
   *
   * A day with room for only one page is a day revision should simply
   * win: that is a genuinely tight day rather than the permanent stall
   * this floor exists to prevent, and clearing the plan of revision to
   * make room for expansion would invert "retention always wins"
   * instead of merely bounding it.
   */
  const revisionIndexes = allocated
    .map((item, index) => (isNew(item) ? -1 : index))
    .filter((index) => index >= 0);

  const evicted = new Set<number>();
  let freedSeconds = 0;
  for (let i = revisionIndexes.length - 1; i > 0; i -= 1) {
    if (usedSeconds - freedSeconds + nextNewPage.estimatedDurationSeconds <= availableSeconds) {
      break;
    }
    const index = revisionIndexes[i]!;
    freedSeconds += allocated[index]!.estimatedDurationSeconds;
    evicted.add(index);
  }

  // Still short even after giving up everything it was allowed to. The
  // user's own time budget wins over the floor.
  if (usedSeconds - freedSeconds + nextNewPage.estimatedDurationSeconds > availableSeconds) {
    return allocated;
  }

  return [...allocated.filter((_, index) => !evicted.has(index)), nextNewPage].sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );
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
