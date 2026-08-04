import type { ReportingPeriod } from "@/shared/types";
import { container } from "../container";
import { toDashboardDTO, toHistoricalReportDTO, toTrendAnalysisDTO } from "@/shared/mappers";
import type { DashboardDTO, HistoricalReportDTO, TrendAnalysisDTO } from "@/shared/dto";

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
