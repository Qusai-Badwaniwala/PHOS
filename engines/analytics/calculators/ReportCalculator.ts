import { ReportingPeriod } from "@/shared/types";
import type { ProgressReport, RecallEvent, Session, SessionItem } from "@/shared/types";

/**
 * Builds a ProgressReport for one period from already-fetched raw
 * data. Deduplicates `completedPages` by pageId so a page revisited
 * multiple times within the period is counted once, not once per
 * visit.
 */
export function buildProgressReport(
  period: ReportingPeriod,
  sessions: readonly Session[],
  sessionItems: readonly SessionItem[],
  recallEvents: readonly RecallEvent[],
): ProgressReport {
  const completedSessions = sessions.filter((session) => session.completedAt !== null).length;
  const completedPages = new Set(sessionItems.map((item) => item.pageId)).size;

  const progressSummary = `${completedSessions} session${completedSessions === 1 ? "" : "s"} completed, ${completedPages} page${completedPages === 1 ? "" : "s"} studied, ${recallEvents.length} recall${recallEvents.length === 1 ? "" : "s"} recorded.`;

  return {
    period,
    completedSessions,
    completedPages,
    recallEvents: recallEvents.length,
    progressSummary,
  };
}
