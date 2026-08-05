import type { ReportingPeriod } from "@/shared/types";
import { container } from "../container";
import {
  toDashboardDTO,
  toGoalProjectionDTO,
  toHistoricalReportDTO,
  toTrendAnalysisDTO,
} from "@/shared/mappers";
import type {
  DashboardDTO,
  GoalProjectionDTO,
  HistoricalReportDTO,
  TrendAnalysisDTO,
} from "@/shared/dto";

/** Was `GET /analytics/dashboard`. */
export async function getDashboard(): Promise<DashboardDTO> {
  return toDashboardDTO(await container.analyticsEngine.generateDashboard());
}

/**
 * Was `GET /analytics/history?period=…`.
 *
 * The route validated `period` because it arrived as a query string.
 * Here it is a `ReportingPeriod`, so the compiler makes the same
 * guarantee and the check would only restate it.
 */
export async function getHistoricalReport(period: ReportingPeriod): Promise<HistoricalReportDTO> {
  return toHistoricalReportDTO(await container.analyticsEngine.generateHistoricalReport(period));
}

/** Was `GET /analytics/progress?type=trend`. */
export async function getTrendAnalysis(period: ReportingPeriod): Promise<TrendAnalysisDTO> {
  return toTrendAnalysisDTO(await container.analyticsEngine.generateTrendAnalysis(period));
}

/**
 * The user's goal, measured against what they have memorized. `null`
 * when no goal is set.
 *
 * The goal is read from Settings here and handed to the engine, rather
 * than the engine fetching it. Analytics reports; it does not own the
 * user's intentions and cannot reach them.
 */
export async function getGoalProjection(): Promise<GoalProjectionDTO | null> {
  const settings = await container.settingsRepository.getSettings();
  const projection = await container.analyticsEngine.projectGoal(settings);
  return projection ? toGoalProjectionDTO(projection) : null;
}
