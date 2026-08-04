import { TrendDirection } from "@/shared/types";
import type { ReportingPeriod, RecallEvent, TrendAnalysis } from "@/shared/types";
import { TREND_STABLE_THRESHOLD } from "../constants";

function successRatio(events: readonly RecallEvent[]): number {
  if (events.length === 0) {
    return 0;
  }
  return events.filter((event) => event.successfulRecall).length / events.length;
}

/**
 * Compares the success ratio of a "current" window against the
 * immediately preceding window of the same length (SDS Part 14 "TREND
 * ANALYSIS"). `trendStrength` is the absolute change in success ratio,
 * clamped to [0, 1].
 */
export function calculateTrend(
  period: ReportingPeriod,
  currentWindowEvents: readonly RecallEvent[],
  previousWindowEvents: readonly RecallEvent[],
): TrendAnalysis {
  const currentRatio = successRatio(currentWindowEvents);
  const previousRatio = successRatio(previousWindowEvents);
  const change = currentRatio - previousRatio;
  const trendStrength = Math.min(1, Math.abs(change));

  let trendDirection: TrendDirection;
  if (previousWindowEvents.length === 0 || Math.abs(change) < TREND_STABLE_THRESHOLD) {
    trendDirection = TrendDirection.Stable;
  } else if (change > 0) {
    trendDirection = TrendDirection.Improving;
  } else {
    trendDirection = TrendDirection.Declining;
  }

  const summary =
    trendDirection === TrendDirection.Stable
      ? "Recall performance has stayed steady compared to the previous period."
      : trendDirection === TrendDirection.Improving
        ? "Recall performance has improved compared to the previous period."
        : "Recall performance has declined compared to the previous period.";

  return { period, trendDirection, trendStrength, summary };
}
