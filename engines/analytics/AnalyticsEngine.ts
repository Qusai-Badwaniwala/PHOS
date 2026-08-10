import type { IPageRepository, IRecallEventRepository, ISessionRepository } from "@/repositories";
import { generateCorrelationId } from "@/shared/utils";
import { MemoryState, ReportingPeriod } from "@/shared/types";
import type {
  DashboardMetrics,
  GoalProjection,
  HistoricalReport,
  LearningProgressSummary,
  MemorizationGoal,
  MemoryHealth,
  Page,
  ProgressReport,
  RetentionQuality,
  SessionStatistics,
  TrendAnalysis,
} from "@/shared/types";
import {
  buildProgressReport,
  buildSessionStatistics,
  calculateGoalProjection,
  calculateMemoryHealth,
  calculateRetentionQuality,
  calculateTrend,
  resolveDateRange,
  resolvePreviousDateRange,
} from "./calculators";
import { AnalyticsCalculationError, StatisticsGenerationError } from "./errors";
import type { IAnalyticsEngine } from "./interfaces";
import { validateReportingPeriod } from "./validators";

export interface AnalyticsEngineDependencies {
  readonly pageRepository: IPageRepository;
  readonly recallEventRepository: IRecallEventRepository;
  readonly sessionRepository: ISessionRepository;
}

/**
 * The Analytics Engine (SDS Part 14): the exclusive source of derived
 * insight in PHOS. Read-only — it never writes data and depends only
 * on repositories (SDS Part 14 "DEPENDENCIES"), never on the Memory,
 * Adaptive, or Learning Engines. Every result is computed on demand
 * and never persisted.
 */
export class AnalyticsEngine implements IAnalyticsEngine {
  constructor(private readonly deps: AnalyticsEngineDependencies) {}

  async calculateMemoryHealth(): Promise<MemoryHealth> {
    const correlationId = generateCorrelationId();
    try {
      const pages = await this.deps.pageRepository.findAll();
      return calculateMemoryHealth(pages, new Date());
    } catch (error) {
      throw new AnalyticsCalculationError("Failed to calculate memory health.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async calculateRetentionQuality(): Promise<RetentionQuality> {
    const correlationId = generateCorrelationId();
    try {
      const now = new Date();
      const { start, end } = resolveDateRange(ReportingPeriod.Overall, now);
      const recallEvents = await this.deps.recallEventRepository.findBetweenDates(start, end);
      return calculateRetentionQuality(recallEvents, now);
    } catch (error) {
      throw new AnalyticsCalculationError("Failed to calculate retention quality.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async projectGoal(goal: MemorizationGoal): Promise<GoalProjection | null> {
    const correlationId = generateCorrelationId();
    try {
      const pages = await this.deps.pageRepository.findAll();
      return calculateGoalProjection(pages, goal, new Date());
    } catch (error) {
      throw new AnalyticsCalculationError("Failed to project the goal.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async generateProgressReport(period: ReportingPeriod): Promise<ProgressReport> {
    const correlationId = generateCorrelationId();
    validateReportingPeriod(period, correlationId);

    try {
      const now = new Date();
      const { start, end } = resolveDateRange(period, now);
      const { sessions, sessionItems, recallEvents } = await this.loadRange(start, end);
      return buildProgressReport(period, sessions, sessionItems, recallEvents);
    } catch (error) {
      throw new StatisticsGenerationError("Failed to generate progress report.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async generateTrendAnalysis(period: ReportingPeriod): Promise<TrendAnalysis> {
    const correlationId = generateCorrelationId();
    validateReportingPeriod(period, correlationId);

    try {
      const now = new Date();
      const current = resolveDateRange(period, now);
      const previous = resolvePreviousDateRange(period, now);

      const [currentEvents, previousEvents] = await Promise.all([
        this.deps.recallEventRepository.findBetweenDates(current.start, current.end),
        this.deps.recallEventRepository.findBetweenDates(previous.start, previous.end),
      ]);

      return calculateTrend(period, currentEvents, previousEvents);
    } catch (error) {
      throw new StatisticsGenerationError("Failed to generate trend analysis.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async generateSessionStatistics(sessionId: string): Promise<SessionStatistics> {
    const correlationId = generateCorrelationId();
    try {
      const [session, sessionItems, recallEvents, pages] = await Promise.all([
        this.deps.sessionRepository.findById(sessionId),
        this.deps.sessionRepository.findSessionItems(sessionId),
        this.deps.recallEventRepository.findBySession(sessionId),
        this.deps.pageRepository.findAll(),
      ]);

      if (!session) {
        throw new StatisticsGenerationError(
          `No session found with id "${sessionId}".`,
          correlationId,
        );
      }

      return buildSessionStatistics(session, sessionItems, recallEvents, pageNumbersById(pages));
    } catch (error) {
      if (error instanceof StatisticsGenerationError) {
        throw error;
      }
      throw new StatisticsGenerationError("Failed to generate session statistics.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async generateHistoricalReport(period: ReportingPeriod): Promise<HistoricalReport> {
    const correlationId = generateCorrelationId();
    validateReportingPeriod(period, correlationId);

    try {
      const now = new Date();
      const { start, end } = resolveDateRange(period, now);
      const sessions = await this.deps.sessionRepository.findBetweenDates(start, end);

      // Built once for the whole report rather than per session: a
      // weekly report covers many sessions and each would otherwise
      // re-read all 604 pages.
      const pageNumbers = pageNumbersById(await this.deps.pageRepository.findAll());

      const sessionStatistics = await Promise.all(
        sessions.map(async (session) => {
          const [sessionItems, recallEvents] = await Promise.all([
            this.deps.sessionRepository.findSessionItems(session.id),
            this.deps.recallEventRepository.findBySession(session.id),
          ]);
          return buildSessionStatistics(session, sessionItems, recallEvents, pageNumbers);
        }),
      );

      return { period, generatedAt: now, sessions: sessionStatistics };
    } catch (error) {
      throw new StatisticsGenerationError("Failed to generate historical report.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async summarizeLearningProgress(): Promise<LearningProgressSummary> {
    const correlationId = generateCorrelationId();
    try {
      const now = new Date();
      const pages = await this.deps.pageRepository.findAll();
      const summary = buildLearningProgressSummary(pages, now);
      return summary;
    } catch (error) {
      throw new AnalyticsCalculationError("Failed to summarize learning progress.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  async generateDashboard(): Promise<DashboardMetrics> {
    const correlationId = generateCorrelationId();
    try {
      const now = new Date();

      // Load shared aggregations once and reuse them across every
      // dashboard component (SDS Part 14 "PERFORMANCE REQUIREMENTS":
      // "Minimize repeated calculations. Reuse shared aggregations.").
      const allPages = await this.deps.pageRepository.findAll();
      const overallRange = resolveDateRange(ReportingPeriod.Overall, now);
      const allRecallEvents = await this.deps.recallEventRepository.findBetweenDates(
        overallRange.start,
        overallRange.end,
      );

      const memoryHealth = calculateMemoryHealth(allPages, now);
      const retentionQuality = calculateRetentionQuality(allRecallEvents, now);

      const [todayProgress, weeklyProgress, monthlyProgress] = await Promise.all([
        this.generateProgressReport(ReportingPeriod.Daily),
        this.generateProgressReport(ReportingPeriod.Weekly),
        this.generateProgressReport(ReportingPeriod.Monthly),
      ]);

      /*
       * Every page the user has memorized — which is every page PHOS is
       * tracking at all, since `Unseen` is precisely "not memorized".
       *
       * This counted only `Stable` and `Mastered`, so somebody who told
       * onboarding they had memorized 300 pages was shown "Memorized
       * Pages: 0" beside a 34-page revision queue built from those same
       * pages. Seeded prior memorization starts at `Growing` and reaches
       * `Stable` only after real recalls, so the dashboard contradicted
       * itself on the first screen of a first run.
       *
       * The old number was not meaningless — "how much has settled" is
       * worth knowing — but it is not what the label says, and the
       * label is what the user reads. How firmly these pages are held
       * is already reported, honestly and separately, by Memory Health.
       */
      const totalPagesMemorized = allPages.filter(
        (page) => page.memoryState !== MemoryState.Unseen,
      ).length;

      const reviewDistribution = Object.fromEntries(
        Object.values(MemoryState).map((state) => [
          state,
          allPages.filter((page) => page.memoryState === state).length,
        ]),
      ) as Record<MemoryState, number>;

      return {
        memoryHealth,
        retentionQuality,
        todayProgress,
        weeklyProgress,
        monthlyProgress,
        dashboardStatistics: { totalPagesMemorized, reviewDistribution },
      };
    } catch (error) {
      throw new AnalyticsCalculationError("Failed to generate dashboard.", correlationId, {
        cause: describeError(error),
      });
    }
  }

  private async loadRange(start: Date, end: Date) {
    const [sessions, recallEvents] = await Promise.all([
      this.deps.sessionRepository.findBetweenDates(start, end),
      this.deps.recallEventRepository.findBetweenDates(start, end),
    ]);
    const sessionItemLists = await Promise.all(
      sessions.map((session) => this.deps.sessionRepository.findSessionItems(session.id)),
    );
    return { sessions, sessionItems: sessionItemLists.flat(), recallEvents };
  }
}

/**
 * Builds a short, deterministic overview sentence of overall learning
 * progress (SDS Part 14, public interface `summarizeLearningProgress()`).
 * The SDS names this operation without specifying its exact content —
 * kept deliberately simple and free of any newly-invented metric.
 */
function buildLearningProgressSummary(
  pages: readonly Page[],
  generatedAt: Date,
): LearningProgressSummary {
  const totalPages = pages.length;
  const masteredOrStable = pages.filter(
    (page) => page.memoryState === MemoryState.Stable || page.memoryState === MemoryState.Mastered,
  ).length;
  const unseen = pages.filter((page) => page.memoryState === MemoryState.Unseen).length;

  const summary = `${masteredOrStable} of ${totalPages} pages are at Stable or Mastered strength. ${unseen} page${unseen === 1 ? "" : "s"} not yet started.`;

  return { summary, generatedAt };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Page id → the page number a human reads. */
function pageNumbersById(pages: readonly Page[]): ReadonlyMap<string, number> {
  return new Map(pages.map((page) => [page.id, page.pageNumber]));
}
