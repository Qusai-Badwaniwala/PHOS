import { analyticsOps } from "@/client/operations";
import {
  describeSessionType,
  formatDatePreferred,
  formatPageList,
  formatTimePreferred,
} from "@/lib/format";
import { ReportingPeriod, SessionType } from "@/shared/types";
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
      const kind = describeSessionType(s.sessionType);
      const pages = formatPageList(s.pageNumbers);
      return {
        id: s.sessionId,
        type: s.sessionType === SessionType.Sabaq ? "session" : "revision",
        durationSeconds: s.durationSeconds,
        weakPages: s.recallCount - Math.round(s.recallCount * s.successRatio),
        title: s.completed ? `Completed ${kind.toLowerCase()}` : `${kind} in progress`,
        date: formatDatePreferred(sessionDate),
        time: formatTimePreferred(sessionDate),
        // Pages lead, because that is what the entry is a record of.
        // The recall count follows as supporting detail.
        description: pages
          ? `${pages} · ${s.recallCount} recall${s.recallCount === 1 ? "" : "s"}`
          : `${s.pagesCompleted} page${s.pagesCompleted === 1 ? "" : "s"}, ${s.recallCount} recall${s.recallCount === 1 ? "" : "s"}`,
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
    const from = new Date(
      filters.dateFrom.includes("T") ? filters.dateFrom : `${filters.dateFrom}T00:00:00`,
    );
    entries = entries.filter((e) => {
      const d = sessionDateById.get(e.id);
      return d ? d.getTime() >= from.getTime() : true;
    });
  }

  if (filters?.dateTo) {
    const to = new Date(
      filters.dateTo.includes("T") ? filters.dateTo : `${filters.dateTo}T23:59:59.999`,
    );
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
