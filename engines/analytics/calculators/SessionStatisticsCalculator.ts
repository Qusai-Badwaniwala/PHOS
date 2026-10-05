import type { RecallEvent, Session, SessionItem, SessionStatistics } from "@/shared/types";

/**
 * @param pageNumberById Resolves a session item's `pageId` to the page
 *   number a human reads. Passed in rather than looked up here so the
 *   caller can build it once for a whole report instead of once per
 *   session — a historical report covers many sessions, and a lookup
 *   per item is the N+1 this layer exists to avoid.
 */
export function buildSessionStatistics(
  session: Session,
  sessionItems: readonly SessionItem[],
  recallEvents: readonly RecallEvent[],
  pageNumberById: ReadonlyMap<string, number>,
  activityEvents: readonly RecallEvent[] = recallEvents,
): SessionStatistics {
  const successfulCount = recallEvents.filter((event) => event.successfulRecall).length;
  const successRatio = recallEvents.length > 0 ? successfulCount / recallEvents.length : 0;

  const pageNumbers = [...sessionItems]
    .sort((a, b) => a.order - b.order)
    .map((item) => pageNumberById.get(item.pageId))
    .filter((pageNumber): pageNumber is number => pageNumber !== undefined)
    .sort((a, b) => a - b);

  const days = new Map<string, { pages: Set<string>; recalls: number; successes: number }>();
  for (const event of activityEvents) {
    const at = event.timestamp;
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
    const day = days.get(key) ?? { pages: new Set<string>(), recalls: 0, successes: 0 };
    day.pages.add(event.pageId);
    day.recalls += 1;
    if (event.successfulRecall) day.successes += 1;
    days.set(key, day);
  }
  return {
    sessionId: session.id,
    sessionType: session.sessionType,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    dailyActivity: [...days].map(([date, day]) => ({
      date,
      pagesCompleted: day.pages.size,
      recallCount: day.recalls,
      successfulRecallCount: day.successes,
    })),
    durationSeconds:
      session.durationSeconds ??
      Math.max(0, Math.round((Date.now() - session.startedAt.getTime()) / 1000)),
    pagesCompleted: sessionItems.length,
    pageNumbers,
    recallCount: recallEvents.length,
    successRatio,
    completed: session.completedAt !== null,
  };
}
