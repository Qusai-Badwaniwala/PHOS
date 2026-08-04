import { analyticsOps } from "@/client/operations";
import { formatDatePreferred, formatTimePreferred } from "@/lib/format";
import { ReportingPeriod } from "@/shared/types";
import type { HistoryDTO, HistoryFiltersDTO, TimelineEntryDTO } from "@/types/dto";

/**
 * History entries, read from the Analytics Engine.
 *
 * Honest limitations: "milestone" and "settings" activity types (e.g.
 * "Completed Juz 1", "Settings Updated") have no engine equivalent —
 * the Analytics Engine only tracks sessions — so only real `session`
 * entries are ever returned. `activityType`/`status`/`search`/
 * `dateFrom`/`dateTo` are all applied here, since the engine produces
 * the full "Overall" history rather than accepting filters itself.
 */
export async function getHistory(filters?: HistoryFiltersDTO): Promise<HistoryDTO> {
  const report = await analyticsOps.getHistoricalReport(ReportingPeriod.Overall);

  let entries: TimelineEntryDTO[] = [...report.sessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .map((s) => {
      const sessionDate = new Date(s.startedAt);
      return {
        id: s.sessionId,
        type: "session",
        title: s.completed ? "Completed session" : "Session in progress",
        date: formatDatePreferred(sessionDate),
        time: formatTimePreferred(sessionDate),
        description: `${s.pagesCompleted} page(s), ${s.recallCount} recall(s)`,
        status: s.completed ? "completed" : "pending",
      };
    });

  const sessionDateById = new Map(report.sessions.map((s) => [s.sessionId, new Date(s.startedAt)]));

  if (filters?.activityType && filters.activityType !== "all") {
    entries = entries.filter((e) => e.type === filters.activityType);
  }

  if (filters?.status && filters.status !== "all") {
    entries = entries.filter((e) => e.status === filters.status);
  }

  if (filters?.dateFrom) {
    const from = new Date(filters.dateFrom);
    entries = entries.filter((e) => {
      const d = sessionDateById.get(e.id);
      return d ? d.getTime() >= from.getTime() : true;
    });
  }

  if (filters?.dateTo) {
    const to = new Date(filters.dateTo);
    entries = entries.filter((e) => {
      const d = sessionDateById.get(e.id);
      return d ? d.getTime() <= to.getTime() : true;
    });
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)),
    );
  }

  return { entries, totalCount: entries.length };
}
