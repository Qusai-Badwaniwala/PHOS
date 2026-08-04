import { ReportingPeriod } from "@/shared/types";
import { InvalidReportingPeriodError } from "../errors";

const VALID_PERIODS: readonly string[] = Object.values(ReportingPeriod);

export function validateReportingPeriod(period: string, correlationId: string): void {
  if (!VALID_PERIODS.includes(period)) {
    throw new InvalidReportingPeriodError(period, correlationId);
  }
}
