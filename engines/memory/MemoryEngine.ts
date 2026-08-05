import type { IPageRepository, IRecallEventRepository } from "@/repositories";
import { generateCorrelationId } from "@/shared/utils";
import { MemoryState as MemoryStateEnum } from "@/shared/types";
import type {
  MemoryProfile,
  MemoryUpdateResult,
  Page,
  RecallOutcome,
  MemoryState,
} from "@/shared/types";
import {
  applyStabilityDecay,
  applyStrengthDecay,
  calculateUpdatedDifficulty,
  calculateUpdatedStability,
  calculateUpdatedStrength,
  determineMemoryState as calculateNextState,
  isLegalStateTransition,
} from "./calculators";
import { MemoryUpdateError } from "./errors";
import type { IMemoryEngine } from "./interfaces";
import { validateRecallOutcome } from "./validators";

export interface MemoryEngineDependencies {
  readonly pageRepository: IPageRepository;
  readonly recallEventRepository: IRecallEventRepository;
}

const SECONDS_PER_DAY = 86_400;
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Starting profile for pages the user reports having memorized before
 * PHOS existed (`seedPriorMemorization()`).
 *
 * Deliberately modest rather than flattering. PHOS has no evidence
 * about these pages, so seeding them as `Mastered` would suppress
 * revision for weeks on material it has never once tested — the exact
 * opposite of "RETENTION ALWAYS WINS" (Requirement 7). These values sit
 * on the `Growing` threshold in `STATE_THRESHOLDS`, which means the
 * pages enter the revision rotation quickly, PHOS learns their true
 * condition from real recalls, and the estimate is replaced by evidence
 * within days.
 */
const PRIOR_MEMORIZATION_STRENGTH = 0.6;
/** Neutral: no reason yet to think these pages are easy or hard for this user. */
const PRIOR_MEMORIZATION_DIFFICULTY = 0.5;

/**
 * Bounds on the initial revision cycle for seeded pages.
 *
 * The floor keeps a small amount of prior memorization from being
 * revised so often it crowds out new work; the ceiling keeps a
 * completed Hifz on a rotation comparable to a traditional Manzil
 * cycle, rather than letting pages drift for months untested.
 */
const MIN_SEED_CYCLE_DAYS = 3;
const MAX_SEED_CYCLE_DAYS = 30;

/**
 * Pages per day assumed when the caller does not say.
 *
 * Only affects how widely seeded pages are spread; real scheduling is
 * always bounded by the user's actual time budget.
 */
const DEFAULT_DAILY_REVISION_CAPACITY = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The Memory Engine (SDS Part 10). The sole owner of MemoryState,
 * memory strength, stability, and difficulty. Contains no scheduling
 * or analytics logic, and never touches the Adaptive or Analytics
 * Engines (SDS Part 10 "FORBIDDEN DEPENDENCIES").
 */
export class MemoryEngine implements IMemoryEngine {
  constructor(private readonly deps: MemoryEngineDependencies) {}

  calculateMemoryUpdate(profile: MemoryProfile, outcome: RecallOutcome): MemoryUpdateResult {
    const elapsedDays = (outcome.secondsSinceLastReview ?? 0) / SECONDS_PER_DAY;

    const decayedStrength = applyStrengthDecay(
      profile.memoryStrength,
      profile.memoryStability,
      elapsedDays,
    );
    const decayedStability = applyStabilityDecay(profile.memoryStability, elapsedDays);

    const newStrength = calculateUpdatedStrength(
      decayedStrength,
      outcome.successfulRecall,
      outcome.confidence,
    );
    const newStability = calculateUpdatedStability(
      decayedStability,
      outcome.successfulRecall,
      outcome.confidence,
    );
    const newDifficulty = calculateUpdatedDifficulty(profile.difficulty, outcome.successfulRecall);
    const newState = calculateNextState(profile.memoryState, newStrength, newStability);

    const updatedProfile: MemoryProfile = {
      pageId: profile.pageId,
      memoryState: newState,
      memoryStrength: newStrength,
      memoryStability: newStability,
      difficulty: newDifficulty,
    };

    return {
      previousProfile: profile,
      updatedProfile,
      stateChanged: newState !== profile.memoryState,
    };
  }

  async applyRecallResult(outcome: RecallOutcome): Promise<MemoryUpdateResult> {
    const correlationId = generateCorrelationId();
    validateRecallOutcome(outcome, correlationId);

    const profile = await this.getCurrentMemoryProfile(outcome.pageId);
    const result = this.calculateMemoryUpdate(profile, outcome);

    // Defensive check: `calculateNextState` is constructed to always
    // produce a legal one-step transition, so this should never fail.
    // Kept as a safety net per SDS Part 10 "MemoryState is always
    // derived through the engine" — never persisted without this
    // guarantee holding.
    if (!isLegalStateTransition(profile.memoryState, result.updatedProfile.memoryState)) {
      throw new MemoryUpdateError(
        "Calculated an illegal memory state transition; refusing to persist it.",
        correlationId,
        { from: profile.memoryState, to: result.updatedProfile.memoryState },
      );
    }

    try {
      await this.deps.pageRepository.updateMemoryVariables(outcome.pageId, {
        memoryStrength: result.updatedProfile.memoryStrength,
        memoryStability: result.updatedProfile.memoryStability,
        difficulty: result.updatedProfile.difficulty,
      });

      if (result.stateChanged) {
        await this.deps.pageRepository.updateMemoryState(
          outcome.pageId,
          result.updatedProfile.memoryState,
        );
      }

      await this.deps.pageRepository.updateReviewTimestamps(outcome.pageId, {
        lastReviewedAt: outcome.timestamp,
        ...(outcome.successfulRecall ? { lastSuccessfulRecallAt: outcome.timestamp } : {}),
        // Stamped once, on the study that takes this page out of
        // `Unseen`. The Adaptive Engine reads it to pace new
        // memorization across days, so it must record the *first*
        // encounter and never be overwritten by later revision.
        ...(profile.memoryState === MemoryStateEnum.Unseen
          ? { firstStudiedAt: outcome.timestamp }
          : {}),
      });

      await this.deps.recallEventRepository.create({
        pageId: outcome.pageId,
        sessionId: outcome.sessionId,
        timestamp: outcome.timestamp,
        successfulRecall: outcome.successfulRecall,
        confidence: outcome.confidence,
        durationSeconds: outcome.durationSeconds,
      });

      return result;
    } catch (error) {
      // Raw persistence errors shall never originate from the Memory
      // Engine (SDS Part 10) — repositories already translate raw
      // Prisma errors into RepositoryException, but this re-wraps any
      // unexpected failure into a Memory Engine-owned error so callers
      // only ever see Memory Engine exceptions from this method.
      if (error instanceof MemoryUpdateError) {
        throw error;
      }
      throw new MemoryUpdateError("Failed to persist a memory update.", correlationId, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  updateStrength(
    previousStrength: number,
    previousStabilityDays: number,
    elapsedDays: number,
    outcome: Pick<RecallOutcome, "successfulRecall" | "confidence">,
  ): number {
    const decayed = applyStrengthDecay(previousStrength, previousStabilityDays, elapsedDays);
    return calculateUpdatedStrength(decayed, outcome.successfulRecall, outcome.confidence);
  }

  updateStability(
    previousStabilityDays: number,
    elapsedDays: number,
    outcome: Pick<RecallOutcome, "successfulRecall" | "confidence">,
  ): number {
    const decayed = applyStabilityDecay(previousStabilityDays, elapsedDays);
    return calculateUpdatedStability(decayed, outcome.successfulRecall, outcome.confidence);
  }

  updateDifficulty(previousDifficulty: number, successfulRecall: boolean): number {
    return calculateUpdatedDifficulty(previousDifficulty, successfulRecall);
  }

  determineMemoryState(
    previousState: MemoryState,
    newStrength: number,
    newStabilityDays: number,
  ): MemoryState {
    return calculateNextState(previousState, newStrength, newStabilityDays);
  }

  validateStateTransition(from: MemoryState, to: MemoryState): boolean {
    return isLegalStateTransition(from, to);
  }

  async getCurrentMemoryProfile(pageId: string): Promise<MemoryProfile> {
    const correlationId = generateCorrelationId();
    const page = await this.deps.pageRepository.findById(pageId);
    if (!page) {
      throw new MemoryUpdateError(`No page found with id "${pageId}".`, correlationId);
    }
    return {
      pageId: page.id,
      memoryState: page.memoryState,
      memoryStrength: page.memoryStrength,
      memoryStability: page.memoryStability,
      difficulty: page.difficulty,
    };
  }

  async seedPriorMemorization(
    pageIds: readonly string[],
    dueImmediately: boolean,
    dailyRevisionCapacity = DEFAULT_DAILY_REVISION_CAPACITY,
  ): Promise<number> {
    // How far apart these pages should sit in the revision cycle.
    //
    // A single fixed interval cannot serve both a beginner with 20
    // memorized pages and a Hafiz with 604: revisiting 604 pages every
    // three days is impossible, while a 30-day cycle for 20 pages is
    // needlessly slack. Scaling the cycle to the volume gives each user
    // a cycle they can actually complete — roughly `capacity` pages a
    // day either way, which is what a Manzil rotation looks like in
    // practice.
    const cycleDays = clamp(
      Math.ceil(pageIds.length / Math.max(1, dailyRevisionCapacity)),
      MIN_SEED_CYCLE_DAYS,
      MAX_SEED_CYCLE_DAYS,
    );

    // How many pages share a day. Ceiling rather than floor so the last
    // block is the short one; a floor would leave a remainder with no
    // day to belong to.
    const pagesPerDay = Math.max(1, Math.ceil(pageIds.length / cycleDays));

    let seeded = 0;

    for (const [index, pageId] of pageIds.entries()) {
      const page = await this.deps.pageRepository.findById(pageId);
      // An estimate must never overwrite evidence: a page PHOS has
      // already observed keeps the profile its real recall history
      // earned.
      if (!page || page.memoryState !== MemoryStateEnum.Unseen) {
        continue;
      }

      await this.deps.pageRepository.updateMemoryVariables(page.id, {
        memoryStrength: PRIOR_MEMORIZATION_STRENGTH,
        memoryStability: cycleDays,
        difficulty: PRIOR_MEMORIZATION_DIFFICULTY,
      });
      await this.deps.pageRepository.updateMemoryState(page.id, MemoryStateEnum.Growing);

      /*
       * Review dates are *staggered* across the cycle rather than
       * stamped all at once.
       *
       * Seeding every page with the same timestamp made them all fall
       * due on the same day — and, because they then keep identical
       * stability, on the same day again every cycle afterwards. A user
       * reporting 23 memorized pages got 23 due at once, then nothing,
       * then 23 again. Spreading the dates turns that block into a
       * steady stream of roughly `capacity` pages a day, which is what
       * spaced repetition is supposed to produce.
       *
       * The stagger is by *contiguous block*, not `index % cycleDays`.
       * Both spread the load identically, but interleaving assigned one
       * day pages 582, 585, 588, 591 — nobody revises Hifz that way.
       * Recitation is continuous, and jumping over the pages between
       * breaks the flow the revision exists to maintain. Blocks give
       * that same day 582–589 instead.
       *
       * This governs the first cycle only. After a real review each page
       * earns its own interval from its own recall, so a page that was
       * stumbled over returns sooner than its neighbours and the blocks
       * loosen. That is spaced repetition working, not this decision
       * being undone — it only means the sequence starts tidy rather
       * than starting scattered.
       *
       * `dueImmediately` decides only where the stream starts: from
       * today, or from tomorrow onward.
       */
      const positionInCycle = Math.min(cycleDays - 1, Math.floor(index / pagesPerDay));
      const daysAgo = dueImmediately ? cycleDays - positionInCycle : positionInCycle;

      // Both timestamps are set together and to the same instant. If
      // only `lastReviewedAt` were set, `didLastReviewFail()` in the
      // Adaptive Engine would read "reviewed but never recalled
      // successfully" and file every seeded page under Recovery —
      // telling a Hafiz their entire Hifz is failing on day one.
      const reviewedAt = new Date(Date.now() - daysAgo * MILLISECONDS_PER_DAY);
      await this.deps.pageRepository.updateReviewTimestamps(page.id, {
        lastReviewedAt: reviewedAt,
        lastSuccessfulRecallAt: reviewedAt,
        // Seeded pages were first studied before PHOS existed. Dating
        // them at their staggered review point is the closest honest
        // answer, and keeps them from looking like brand-new work to
        // the pacing check.
        firstStudiedAt: reviewedAt,
      });

      seeded += 1;
    }

    return seeded;
  }

  /**
   * Repairs revision that was seeded into an interleaved cycle, turning
   * it into the contiguous blocks `seedPriorMemorization()` now
   * produces.
   *
   * WHY THIS EXISTS
   * ---------------
   * Seeding used to spread pages with `index % cycleDays`, which put
   * 582, 585, 588, 591 on one day. The load was right and the order was
   * not — Hifz is recited continuously, and nobody revises every third
   * page. The seeding rule was fixed, but a fix to the rule cannot
   * reach dates already written to somebody's device, and asking every
   * user to delete their data is not a repair.
   *
   * HOW IT WORKS, AND WHY IT CANNOT CHANGE THE WORKLOAD
   * ---------------------------------------------------
   * It does not recompute anything. It takes the review dates already
   * stored, sorts them, and re-pairs them with the pages in
   * memorization order — earliest date to earliest page. The *multiset*
   * of dates is untouched, so the number of pages falling due on any
   * given day is exactly what it was before; only which page carries
   * which date changes.
   *
   * That property is what makes this safe to run unattended. It needs
   * no knowledge of the original cycle length, of how many batches the
   * pages were seeded in, or of whether revision was set to start
   * immediately — all of which are unrecoverable after the fact, and
   * all of which a recomputation would have had to guess.
   *
   * WHAT IT REFUSES TO TOUCH
   * ------------------------
   * Any page with a recall event. Those dates were earned by the user
   * actually reciting, and are evidence rather than an estimate. This
   * is the same rule `seedPriorMemorization()` follows when it skips a
   * page that has left `Unseen` — an estimate must never overwrite
   * evidence.
   */
  async reblockSeededRevision(pageIdsInMemorizationOrder: readonly string[]): Promise<number> {
    const eligible: { page: Page; reviewedAt: Date }[] = [];

    for (const pageId of pageIdsInMemorizationOrder) {
      const page = await this.deps.pageRepository.findById(pageId);
      if (!page || page.memoryState === MemoryStateEnum.Unseen || !page.lastReviewedAt) {
        continue;
      }

      // Evidence, not an estimate. Left exactly as it is.
      const recalls = await this.deps.recallEventRepository.findByPage(pageId);
      if (recalls.length > 0) continue;

      eligible.push({ page, reviewedAt: page.lastReviewedAt });
    }

    if (eligible.length === 0) return 0;

    const datesInOrder = eligible.map((entry) => entry.reviewedAt.getTime()).sort((a, b) => a - b);

    let changed = 0;
    for (const [index, entry] of eligible.entries()) {
      const reviewedAt = new Date(datesInOrder[index]!);
      if (reviewedAt.getTime() === entry.reviewedAt.getTime()) continue;

      /*
       * All three timestamps move together, exactly as seeding sets
       * them together. Leaving `lastSuccessfulRecallAt` behind would
       * make `didLastReviewFail()` in the Adaptive Engine read
       * "reviewed but never recalled successfully" and file the page
       * under Recovery — telling a user their Hifz was failing as a
       * side effect of a repair.
       */
      await this.deps.pageRepository.updateReviewTimestamps(entry.page.id, {
        lastReviewedAt: reviewedAt,
        lastSuccessfulRecallAt: reviewedAt,
        firstStudiedAt: reviewedAt,
      });
      changed += 1;
    }

    return changed;
  }
}
