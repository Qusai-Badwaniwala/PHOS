import type { RecallEvent, Session, SessionItem, SessionStatistics } from "@/shared/types";

export function buildSessionStatistics(
  session: Session,
  sessionItems: readonly SessionItem[],
  recallEvents: readonly RecallEvent[],
): SessionStatistics {
  const successfulCount = recallEvents.filter((event) => event.successfulRecall).length;
  const successRatio = recallEvents.length > 0 ? successfulCount / recallEvents.length : 0;

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    durationSeconds:
      session.durationSeconds ??
      Math.max(0, Math.round((Date.now() - session.startedAt.getTime()) / 1000)),
    pagesCompleted: sessionItems.length,
    recallCount: recallEvents.length,
    successRatio,
    completed: session.completedAt !== null,
  };
}
