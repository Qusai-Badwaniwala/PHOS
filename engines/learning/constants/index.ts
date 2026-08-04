import { SessionType, WorkloadCategory } from "@/shared/types";

/**
 * Which workload categories each session type is responsible for.
 *
 * The Adaptive Engine produces one combined, priority-ordered Daily
 * Study Plan for the whole day (SDS Part 11). A `Session`, however, is
 * always started with a specific `SessionType` (SDS Part 12) — the user
 * sits down to do Sabaq, or Sabqi, or Manzil, or Recovery, not "all of
 * today's work at once". This table is the bridge between the two: it
 * says which slice of the day's plan a given session is actually about.
 *
 * The groupings follow the meanings already documented on `SessionType`
 * itself:
 * - `Sabaq` is new memorization.
 * - `Sabqi` is recent/near revision, which covers both pages that are
 *   merely due (`RecentRevision`) and pages that have slipped past due
 *   (`OverdueRevision`) — both are near-term review of recent material.
 * - `Manzil` is long-term/cumulative revision.
 * - `Recovery` is rebuilding a page that has become weak.
 *
 * Every `WorkloadCategory` belongs to exactly one session type, so no
 * scheduled page can ever be unreachable, and no page can be claimed by
 * two session types.
 */
export const SESSION_TYPE_WORKLOAD_CATEGORIES: Readonly<
  Record<SessionType, readonly WorkloadCategory[]>
> = {
  [SessionType.Sabaq]: [WorkloadCategory.NewMemorization],
  [SessionType.Sabqi]: [WorkloadCategory.RecentRevision, WorkloadCategory.OverdueRevision],
  [SessionType.Manzil]: [WorkloadCategory.LongTermRevision],
  [SessionType.Recovery]: [WorkloadCategory.Recovery],
};

/**
 * Study-time budget used when rebuilding a plan for a session that this
 * process has lost from memory (see `ensureActiveSession`).
 *
 * The budget a session was originally started with is not persisted —
 * the SDS schema stores facts, not scheduling — so it cannot be
 * recovered exactly. A full day is used deliberately: page ranking is
 * priority-based and independent of the budget, and allocation is
 * greedy in that order, so a larger budget can only *append* lower
 * priority items. The rebuilt plan is therefore guaranteed to be a
 * superset of the original with an identical prefix, which is what
 * makes resuming safe. A smaller budget could omit pages the client is
 * partway through and strand the session.
 *
 * Revisit once the schema is open (Phase 4): persisting the session's
 * own budget would let this be exact rather than merely safe.
 */
export const SESSION_REHYDRATION_STUDY_MINUTES = 24 * 60;

/** True if `category` is work that a session of `sessionType` is responsible for. */
export function isCategoryInSessionScope(
  sessionType: SessionType,
  category: WorkloadCategory,
): boolean {
  return SESSION_TYPE_WORKLOAD_CATEGORIES[sessionType].includes(category);
}
