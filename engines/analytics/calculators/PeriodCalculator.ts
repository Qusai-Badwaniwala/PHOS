import { ReportingPeriod } from "@/shared/types";
import { TREND_WINDOW_DAYS } from "../constants";

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

const MILLISECONDS_PER_DAY = 86_400_000;
const EPOCH_START = new Date(0);

/**
 * Resolves the [start, end] window for a given reporting period,
 * ending at `referenceDate`. `Overall` spans all recorded history.
 */
export function resolveDateRange(period: ReportingPeriod, referenceDate: Date): DateRange {
  if (period === ReportingPeriod.Overall) {
    return { start: EPOCH_START, end: referenceDate };
  }

  const windowDays = TREND_WINDOW_DAYS[period] ?? 1;
  const start = new Date(referenceDate.getTime() - windowDays * MILLISECONDS_PER_DAY);
  return { start, end: referenceDate };
}

/**
 * Resolves the window immediately preceding `resolveDateRange()`'s
 * result, of the same length — used to compare "this period" against
 * "the period before it" for trend analysis.
 */
export function resolvePreviousDateRange(period: ReportingPeriod, referenceDate: Date): DateRange {
  const current = resolveDateRange(period, referenceDate);
  const windowLengthMs = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - windowLengthMs),
    end: current.start,
  };
}
