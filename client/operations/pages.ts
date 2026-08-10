import { MemoryState } from "@/shared/types";
import { TOTAL_MUSHAF_PAGES } from "@/shared/constants";
import { generateCorrelationId } from "@/shared/utils";
import { ValidationError, validateBoolean, validateNumericRange } from "@/validators";
import { container } from "../container";
import { estimateDailyRevisionCapacity } from "./settings";

export interface LogMemorizedInput {
  readonly count?: number;
  readonly pageNumbers?: number[];
  readonly startRevisionNow?: boolean;
}

export interface LogMemorizedResult {
  /** How many pages were newly recorded as memorized. */
  readonly loggedPages: number;
  readonly requestedPages: number;
  /** Pages PHOS was already tracking, which were left untouched. */
  readonly skippedAlreadyTracked: number;
}

/**
 * Records memorization the user completed outside PHOS
 * (PRODUCT_REQUIREMENTS Requirement 9).
 *
 * Two shapes are accepted, matching how people actually describe what
 * they did:
 *
 * - `pageNumbers` — specific pages.
 * - `count` — "I did n more pages", taken from the next unstudied pages
 *   along the user's roadmap. This is the common case, and resolving it
 *   against the roadmap rather than page numbers 1..n means a user who
 *   memorizes Juz 30 first has their work recorded where they actually
 *   did it.
 *
 * The pages are seeded through the Memory Engine exactly as onboarding's
 * prior memorization is, so a manual log and a first-run estimate reach
 * the same state by the same path. Requirement 9 requires this to
 * "incorporate into future scheduling without disrupting previous
 * progress": `seedPriorMemorization()` skips any page PHOS has already
 * observed, so logging can never overwrite real recall history.
 */
export async function logMemorizedOutside(input: LogMemorizedInput): Promise<LogMemorizedResult> {
  const correlationId = generateCorrelationId();

  const startRevisionNow =
    input.startRevisionNow === undefined
      ? true
      : validateBoolean(input.startRevisionNow, "startRevisionNow", correlationId);

  const pageIds = await resolvePageIds(input, correlationId);

  // Same staggering as onboarding, sized to the user's own time budget,
  // so pages logged in bulk do not all fall due together. The capacity
  // is imported rather than recomputed: this line used to hold its own
  // copy of the formula, and when onboarding's copy was corrected to
  // charge the engine's real per-page cost, this one would have been
  // left seeding cycles 75% too dense.
  const settings = await container.settingsRepository.getSettings();
  const loggedPages = await container.memoryEngine.seedPriorMemorization(
    pageIds,
    startRevisionNow,
    estimateDailyRevisionCapacity(settings.dailyAvailableMinutes),
  );

  return {
    loggedPages,
    // A page already known to PHOS is skipped rather than rewritten, so
    // the caller is told when their request was partly a no-op.
    requestedPages: pageIds.length,
    skippedAlreadyTracked: pageIds.length - loggedPages,
  };
}

async function resolvePageIds(
  input: LogMemorizedInput,
  correlationId: string,
): Promise<readonly string[]> {
  if (Array.isArray(input.pageNumbers)) {
    const pageNumbers = input.pageNumbers.map((value, index) =>
      validateNumericRange(
        value,
        `pageNumbers[${index}]`,
        { min: 1, max: TOTAL_MUSHAF_PAGES, integer: true },
        correlationId,
      ),
    );

    const resolved: string[] = [];
    for (const pageNumber of pageNumbers) {
      const page = await container.pageRepository.findByPageNumber(pageNumber);
      if (page) resolved.push(page.id);
    }
    return resolved;
  }

  if (input.count !== undefined) {
    const count = validateNumericRange(
      input.count,
      "count",
      { min: 1, max: TOTAL_MUSHAF_PAGES, integer: true },
      correlationId,
    );

    // Taken from the roadmap sequence, skipping anything already
    // studied, so "3 more pages" means the next three the user would
    // have reached anyway.
    const sequence = await container.adaptiveEngine.getMemorizationSequence();
    return sequence
      .filter((page) => page.memoryState === MemoryState.Unseen)
      .slice(0, count)
      .map((page) => page.id);
  }

  throw new ValidationError(
    'Provide either "pageNumbers" (an array of page numbers) or "count" (how many pages you memorized).',
    correlationId,
  );
}
