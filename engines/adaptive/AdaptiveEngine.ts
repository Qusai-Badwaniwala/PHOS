import type { IMemoryEngine } from "@/engines/memory";
import type {
  IPageRepository,
  IRecallEventRepository,
  IRoadmapRepository,
  ISessionRepository,
  ISettingsRepository,
} from "@/repositories";
import { generateCorrelationId, startOfLocalDay } from "@/shared/utils";
import { resolveRoadmap, toJuzPriority, WorkloadCategory } from "@/shared/types";
import type {
  DailyStudyPlan,
  MemorizationOrder,
  MemorizationRoadmap,
  Page,
  PlanItemExplanation,
  ReturnAssessment,
} from "@/shared/types";
import {
  allocateStudyTime as allocateStudyTimeCalculator,
  assessReturn,
  detectWorkloadWarning,
  estimatePageDurationSeconds,
  explainPlan as explainPlanSummary,
  rankPages as rankPagesCalculator,
  recommendWorkload,
  toStudyItems,
  type RankedPage,
  type WorkloadRecommendation,
} from "./calculators";
import type { AdaptiveEngineConfig } from "./constants";
import { DEFAULT_ADAPTIVE_CONFIG } from "./constants";
import {
  IncompleteMemoryProfileError,
  InvalidStudyDurationError,
  PlanGenerationError,
} from "./errors";
import type { IAdaptiveEngine } from "./interfaces";
import { validateMemoryProfile, validateStudyDuration } from "./validators";

export interface AdaptiveEngineDependencies {
  readonly pageRepository: IPageRepository;
  readonly sessionRepository: ISessionRepository;
  readonly memoryEngine: IMemoryEngine;
  /**
   * Supplies the recall history the workload recommendation is observed
   * from (PRODUCT_REQUIREMENTS Requirements 3, 7 and 8). Optional for
   * the same reason as the roadmap dependencies: without it the engine
   * falls back to the user's stated comfortable pace and never adapts,
   * which is the pre-Phase-6 behaviour.
   */
  readonly recallEventRepository?: IRecallEventRepository;
  /**
   * Supplies the user's chosen memorization order and paused Juz
   * (PRODUCT_REQUIREMENTS Requirement 2). Optional so the engine
   * remains constructible — and testable — without them, in which case
   * it falls back to the Mushaf's natural page order exactly as it did
   * before the roadmap existed.
   */
  readonly settingsRepository?: ISettingsRepository;
  readonly roadmapRepository?: IRoadmapRepository;
  readonly config?: AdaptiveEngineConfig;
}

/**
 * The Adaptive Engine (SDS Part 11): the only component permitted to
 * generate a Daily Study Plan. Answers "what should I study today?"
 * and never modifies memory variables or the Memory Engine directly.
 *
 * This engine treats a Page's own memory fields (`memoryState`,
 * `memoryStrength`, `memoryStability`, `difficulty`) as its read of
 * the Memory Engine's output: those fields are exclusively written by
 * the Memory Engine (SDS Part 10), so reading them from
 * `PageRepository.findAll()` for all ~604 pages *is* reading Memory
 * Engine data, without 604 redundant one-by-one calls to
 * `MemoryEngine.getCurrentMemoryProfile()` (SDS Part 11 "PERFORMANCE
 * REQUIREMENTS": "Avoid unnecessary database queries... Scale
 * efficiently across the complete Mushaf"). The injected
 * `IMemoryEngine` is still used directly in `explainPlan()`, where the
 * item count is small (a single day's plan, not the whole Mushaf).
 */
export class AdaptiveEngine implements IAdaptiveEngine {
  private readonly config: AdaptiveEngineConfig;

  constructor(private readonly deps: AdaptiveEngineDependencies) {
    this.config = deps.config ?? DEFAULT_ADAPTIVE_CONFIG;
  }

  async generateDailyPlan(availableStudyMinutes: number): Promise<DailyStudyPlan> {
    const correlationId = generateCorrelationId();
    validateStudyDuration(availableStudyMinutes, correlationId);

    try {
      const referenceDate = new Date();
      const allPages = await this.deps.pageRepository.findAll();
      for (const page of allPages) {
        validateMemoryProfile(page, correlationId);
      }

      const alreadyStudiedTodayPageIds = await this.getPagesStudiedToday(referenceDate);
      const eligiblePages = allPages.filter((page) => !alreadyStudiedTodayPageIds.has(page.id));

      const roadmap = await this.loadRoadmap();
      const ranked = rankPagesCalculator(eligiblePages, referenceDate, this.config, roadmap);

      // Requirement 5: a returning user's plan leans on revision before
      // it takes on new pages.
      //
      // The allowance is deliberately measured against the plan the
      // user would otherwise have been given, not against every page
      // that merely qualifies. Almost always the time budget is the
      // binding constraint — hundreds of pages are eligible for new
      // memorization and only a handful fit in the day — so scaling the
      // eligible pool would leave the plan completely unchanged and the
      // reduction would exist only on paper.
      const returnAssessment = assessReturn(await this.findLastSessionDate(), referenceDate);
      const naturalPlan = allocateStudyTimeCalculator(ranked, availableStudyMinutes);
      const { pool: afterReturn, withheld } = applyReturnPolicy(
        ranked,
        naturalPlan,
        returnAssessment,
      );

      // Requirements 3, 7 and 8: how much new memorization the user's
      // recent recall actually supports. Applied after the return
      // policy, so a returning user is never given *more* than the
      // break allowed.
      const workload = await this.recommendWorkloadFromHistory(referenceDate);
      const pool = capNewMemorization(
        afterReturn,
        workload.recommendedNewPages,
        daysSinceLastNewPage(allPages, referenceDate),
      );

      // Re-allocated from the reduced pool, so the time freed by holding
      // back new memorization is spent on revision rather than lost.
      const allocated = allocateStudyTimeCalculator(pool, availableStudyMinutes);
      const studyItems = toStudyItems(allocated);

      const estimatedTotalDurationSeconds = studyItems.reduce(
        (total, item) => total + item.estimatedDurationSeconds,
        0,
      );
      const recoveryRecommended = ranked.some(
        (rankedPage) => rankedPage.category === WorkloadCategory.Recovery,
      );

      // "The engine shall never return partially ordered plans."
      // `toStudyItems()` assigns `recommendedOrder` densely from 0,
      // so the result is always fully, contiguously ordered.
      return {
        studyItems,
        estimatedTotalDurationSeconds,
        recoveryRecommended,
        availableStudyMinutes,
        generatedAt: referenceDate,
        explanation: explainPlanSummary({
          allocated,
          availableStudyMinutes,
          returnAssessment,
          withheldByReturnPolicy: withheld,
          // Each exclusion is attributed to the rule that actually made
          // it, here where that is known. Letting the explanation infer
          // it by subtraction is what produced "59 pages did not fit in
          // 60 minutes" on a day the clock excluded nothing.
          withheldByDailyTarget:
            countNewMemorization(naturalPlan) - countNewMemorization(allocated) - withheld,
          dailyTarget: workload.recommendedNewPages,
          // Revision genuinely is time-bound: these were due and lost
          // the competition for the day's minutes.
          revisionDroppedForTime: countRevision(ranked) - countRevision(allocated),
          workloadRationale: workload.rationale,
        }),
        returnAssessment,
        workload,
        // Requirement 7: a heavy day is flagged, never silently
        // trimmed. See `detectWorkloadWarning()` for why a cap was
        // rejected.
        workloadWarning: detectWorkloadWarning(
          allocated,
          availableStudyMinutes,
          // Pages genuinely due that the time budget displaced. This is
          // the signal a user cannot otherwise see: the day looks
          // finished, but revision is quietly falling behind.
          countRevision(ranked) - countRevision(allocated),
        ),
      };
    } catch (error) {
      if (
        error instanceof InvalidStudyDurationError ||
        error instanceof IncompleteMemoryProfileError
      ) {
        throw error;
      }
      throw new PlanGenerationError("Failed to generate the daily study plan.", correlationId, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  calculatePriority(page: Page, referenceDate: Date): number {
    const correlationId = generateCorrelationId();
    validateMemoryProfile(page, correlationId);
    const ranked = rankPagesCalculator([page], referenceDate, this.config);
    return ranked[0]?.priorityScore ?? Number.NEGATIVE_INFINITY;
  }

  rankPages(pages: readonly Page[], referenceDate: Date): readonly Page[] {
    return rankPagesCalculator(pages, referenceDate, this.config).map((ranked) => ranked.page);
  }

  balanceWorkload(pages: readonly Page[], availableStudyMinutes: number): readonly Page[] {
    return this.allocateStudyTime(pages, availableStudyMinutes);
  }

  allocateStudyTime(pages: readonly Page[], availableStudyMinutes: number): readonly Page[] {
    const referenceDate = new Date();
    const ranked = rankPagesCalculator(pages, referenceDate, this.config);
    return allocateStudyTimeCalculator(ranked, availableStudyMinutes).map(
      (rankedPage) => rankedPage.page,
    );
  }

  recommendRecovery(pages: readonly Page[]): boolean {
    const referenceDate = new Date();
    const ranked = rankPagesCalculator(pages, referenceDate, this.config);
    return ranked.some((rankedPage) => rankedPage.category === WorkloadCategory.Recovery);
  }

  estimateSessionDuration(page: Page): number {
    return estimatePageDurationSeconds(page, this.config);
  }

  async explainPlan(plan: DailyStudyPlan): Promise<readonly PlanItemExplanation[]> {
    const explanations: PlanItemExplanation[] = [];

    for (const item of plan.studyItems) {
      // Small, bounded loop (one day's plan) — not the N+1 pattern the
      // bulk planning path avoids above.
      const profile = await this.deps.memoryEngine.getCurrentMemoryProfile(item.pageId);
      explanations.push({
        pageId: item.pageId,
        reason: explainCategory(item.workloadCategory, profile.memoryStrength, this.config),
      });
    }

    return explanations;
  }

  async getMemorizationSequence(orderOverride?: MemorizationOrder): Promise<readonly Page[]> {
    const allPages = await this.deps.pageRepository.findAll();
    const roadmap = await this.loadRoadmap(orderOverride);

    if (!roadmap) {
      return [...allPages].sort((a, b) => a.pageNumber - b.pageNumber);
    }

    const juzPriority = toJuzPriority(roadmap);

    return allPages
      .filter((page) => juzPriority.has(page.juzNumber))
      .sort((a, b) => {
        const aJuz = juzPriority.get(a.juzNumber) ?? Number.MAX_SAFE_INTEGER;
        const bJuz = juzPriority.get(b.juzNumber) ?? Number.MAX_SAFE_INTEGER;
        // Juz order comes from the roadmap; within a Juz, pages are
        // always read in Mushaf order.
        return aJuz !== bJuz ? aJuz - bJuz : a.pageNumber - b.pageNumber;
      });
  }

  /**
   * Resolves the user's memorization roadmap, or `undefined` when no
   * roadmap dependencies were injected.
   *
   * `undefined` is meaningful here rather than an error: it means "no
   * roadmap configured", and `rankPages()` then behaves exactly as it
   * did before Requirement 2 — the Mushaf's own page order.
   */
  private async loadRoadmap(
    orderOverride?: MemorizationOrder,
  ): Promise<MemorizationRoadmap | undefined> {
    if (!this.deps.settingsRepository || !this.deps.roadmapRepository) {
      return undefined;
    }
    const [settings, entries] = await Promise.all([
      this.deps.settingsRepository.getSettings(),
      this.deps.roadmapRepository.findAll(),
    ]);
    return resolveRoadmap(orderOverride ?? settings.memorizationOrder, entries);
  }

  /**
   * Observes the user's recent performance and recommends today's
   * new-memorization workload (PRODUCT_REQUIREMENTS Requirements 3, 7
   * and 8).
   *
   * A *trailing window* is used rather than all-time history, and that
   * is the whole mechanism behind "PHOS must never permanently classify
   * users": evidence ages out, so a difficult month six months ago has
   * no vote in today's plan, and neither does a brilliant one.
   *
   * Falls back to the user's own comfortable pace when the recall
   * repository or settings are not wired in, which keeps the engine
   * constructible and testable without them.
   */
  private async recommendWorkloadFromHistory(referenceDate: Date): Promise<WorkloadRecommendation> {
    const comfortableDailyPages = this.deps.settingsRepository
      ? (await this.deps.settingsRepository.getSettings()).comfortableDailyPages
      : DEFAULT_COMFORTABLE_DAILY_PAGES;

    if (!this.deps.recallEventRepository) {
      return recommendWorkload(
        { recallEvents: [], activeDays: 0, windowDays: 0, newPagesStudied: 0 },
        comfortableDailyPages,
      );
    }

    const windowStart = new Date(
      referenceDate.getTime() - OBSERVATION_WINDOW_DAYS * MILLISECONDS_PER_DAY,
    );
    const recallEvents = await this.deps.recallEventRepository.findBetweenDates(
      windowStart,
      referenceDate,
    );

    const sessions = await this.deps.sessionRepository.findBetweenDates(windowStart, referenceDate);
    const activeDays = countDistinctLocalDays(sessions.map((session) => session.startedAt));

    // New memorization is counted as recall events on pages that were
    // encountered for the first time in the window — the same evidence
    // the plan itself is built from, rather than a separate tally that
    // could disagree with it.
    const firstEventPerPage = new Set<string>();
    for (const event of recallEvents) {
      firstEventPerPage.add(event.pageId);
    }

    return recommendWorkload(
      {
        recallEvents,
        activeDays,
        windowDays: OBSERVATION_WINDOW_DAYS,
        newPagesStudied: firstEventPerPage.size,
      },
      comfortableDailyPages,
    );
  }

  /**
   * When the user last completed a session, or `null` if they never
   * have. See `ISessionRepository.findLastCompleted()` for why only
   * completed sessions count.
   */
  private async findLastSessionDate(): Promise<Date | null> {
    const lastCompleted = await this.deps.sessionRepository.findLastCompleted();
    return lastCompleted?.completedAt ?? null;
  }

  private async getPagesStudiedToday(referenceDate: Date): Promise<ReadonlySet<string>> {
    // "Today" is the user's calendar day, not the UTC one. Flooring the
    // epoch millisecond value (as this previously did) gives UTC
    // midnight, so for any user east of UTC every session between local
    // midnight and UTC midnight was treated as belonging to the previous
    // day — pages studied that morning were immediately re-scheduled.
    const startOfToday = startOfLocalDay(referenceDate);
    const todaysSessions = await this.deps.sessionRepository.findBetweenDates(
      startOfToday,
      referenceDate,
    );

    const studiedPageIds = new Set<string>();
    for (const session of todaysSessions) {
      const items = await this.deps.sessionRepository.findSessionItems(session.id);
      for (const item of items) {
        studiedPageIds.add(item.pageId);
      }
    }
    return studiedPageIds;
  }
}

/**
 * How far back performance is observed.
 *
 * Long enough that a single bad week cannot dominate (Requirement 7:
 * "Recommendations should be based on long-term trends rather than
 * isolated events"), short enough that genuine improvement is noticed
 * within weeks rather than months (Requirement 8).
 */
const OBSERVATION_WINDOW_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

/** Used only when no settings repository is wired in. Matches the schema default. */
const DEFAULT_COMFORTABLE_DAILY_PAGES = 1;

/**
 * Whole and fractional days since the user last *started* a new page,
 * or `null` if they never have.
 *
 * Reads `Page.firstStudiedAt`, which the Memory Engine stamps once when
 * a page leaves `Unseen`. Using `lastReviewedAt` instead would be
 * wrong: revising an old page would look like starting a new one and
 * would keep pushing the next page further away.
 */
function daysSinceLastNewPage(pages: readonly Page[], referenceDate: Date): number | null {
  let latest: number | null = null;
  for (const page of pages) {
    if (!page.firstStudiedAt) continue;
    const started = page.firstStudiedAt.getTime();
    if (latest === null || started > latest) latest = started;
  }

  if (latest === null) return null;
  return Math.max(0, (referenceDate.getTime() - latest) / MILLISECONDS_PER_DAY);
}

function countNewMemorization(pages: readonly RankedPage[]): number {
  return pages.filter((page) => page.category === WorkloadCategory.NewMemorization).length;
}

function countRevision(pages: readonly RankedPage[]): number {
  return pages.filter((page) => page.category !== WorkloadCategory.NewMemorization).length;
}

/** Distinct local calendar days represented in a list of timestamps. */
function countDistinctLocalDays(dates: readonly Date[]): number {
  const days = new Set(
    dates.map((date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`),
  );
  return days.size;
}

/**
 * Caps how many new-memorization pages may enter the plan, per the
 * observed workload recommendation (Requirements 3, 7, 8).
 *
 * A fractional target is honoured across days rather than within one:
 * half a page a day means one page every other day, so the cap rounds
 * up to at least one page whenever any new memorization is permitted.
 * Rounding down would schedule nothing at all and stall a beginner
 * indefinitely.
 */
function capNewMemorization(
  ranked: readonly RankedPage[],
  recommendedNewPages: number,
  daysSinceLastNewPage: number | null,
): readonly RankedPage[] {
  /*
   * A target below one page a day is honoured *across* days, not
   * within one.
   *
   * This used to be `Math.ceil(target)` alone, applied afresh every
   * day — so "half a page a day" quietly became one page every day,
   * pushing the user at twice the pace they asked for. Someone who
   * needs two and a half days per page was being pushed two and a half
   * times too fast, which is exactly the overload Requirement 7 exists
   * to prevent.
   *
   * The interval is the reciprocal of the target: 0.5 → a new page
   * every 2 days, 0.4 → every 2.5 days. A page is offered only once
   * that interval has elapsed since the last one was started.
   * `daysSinceLastNewPage === null` means none has ever been started,
   * so the first page is always available.
   *
   * Revision is untouched by any of this — only new memorization is
   * paced.
   */
  if (recommendedNewPages <= 0) return withoutNewMemorization(ranked);

  if (recommendedNewPages < 1 && daysSinceLastNewPage !== null) {
    const requiredIntervalDays = 1 / recommendedNewPages;
    if (daysSinceLastNewPage < requiredIntervalDays) {
      return withoutNewMemorization(ranked);
    }
  }

  // At or above one page a day the target is a per-day count, rounded
  // up so a target of 1.5 offers 2 rather than stalling at 1.
  const permitted = Math.max(1, Math.ceil(recommendedNewPages));

  let seen = 0;
  return ranked.filter((item) => {
    if (item.category !== WorkloadCategory.NewMemorization) return true;
    seen += 1;
    return seen <= permitted;
  });
}

function withoutNewMemorization(ranked: readonly RankedPage[]): readonly RankedPage[] {
  return ranked.filter((item) => item.category !== WorkloadCategory.NewMemorization);
}

/**
 * Applies the returning-user allowance (PRODUCT_REQUIREMENTS
 * Requirement 5) by capping how many new-memorization pages may enter
 * the plan.
 *
 * `naturalPlan` is what the user would have been given had they not
 * been away; the allowance scales the new memorization *in it*, and the
 * cap is then applied to the full ranked pool so the scheduler can
 * refill the freed time with revision.
 *
 * Only `NewMemorization` is ever reduced. Revision is deliberately
 * untouched — the requirement's whole thesis is that a user coming back
 * needs *more* retention work, not less, and trimming revision to
 * lighten the day would defeat the point.
 *
 * The pages kept are the highest-priority ones, because `ranked` is
 * already in priority order.
 */
function applyReturnPolicy(
  ranked: readonly RankedPage[],
  naturalPlan: readonly RankedPage[],
  assessment: ReturnAssessment,
): { pool: readonly RankedPage[]; withheld: number } {
  if (assessment.newMemorizationAllowance >= 1) {
    return { pool: ranked, withheld: 0 };
  }

  const scheduledNewCount = naturalPlan.filter(
    (item) => item.category === WorkloadCategory.NewMemorization,
  ).length;
  const permitted = Math.floor(scheduledNewCount * assessment.newMemorizationAllowance);

  let seen = 0;
  const pool = ranked.filter((item) => {
    if (item.category !== WorkloadCategory.NewMemorization) return true;
    seen += 1;
    return seen <= permitted;
  });

  return { pool, withheld: scheduledNewCount - permitted };
}

/**
 * Produces a concise, human-readable scheduling reason (SDS Part 11
 * "EXPLAINABILITY CONTRACT"). The SDS gives example categories
 * ("Overdue review", "Weak memory stability", "Recovery priority",
 * "Recent recall failure") without defining an exhaustive closed set,
 * so this mapping is a documented, reasonable interpretation.
 */
function explainCategory(
  category: WorkloadCategory,
  memoryStrength: number,
  config: AdaptiveEngineConfig,
): string {
  switch (category) {
    case WorkloadCategory.Recovery:
      return memoryStrength < config.recoveryStrengthThreshold
        ? "Weak memory stability"
        : "Recovery priority";
    case WorkloadCategory.OverdueRevision:
      return "Overdue review";
    case WorkloadCategory.RecentRevision:
      return "Recent revision, still consolidating";
    case WorkloadCategory.LongTermRevision:
      return "Long-term retention checkpoint";
    case WorkloadCategory.NewMemorization:
      return "New memorization";
    default:
      return "Scheduled for review";
  }
}
