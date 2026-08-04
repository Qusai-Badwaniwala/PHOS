import type { RecallEvent } from "@/shared/types";

/** Input for `create()`. RecallEvents are immutable once created, so there is no update method. */
export type CreateRecallEventInput = Omit<RecallEvent, "id">;

/**
 * Persistence contract for the RecallEvent aggregate (SDS Part 9
 * "RECALLEVENTREPOSITORY"). Recall events are immutable, append-only
 * historical facts — this interface intentionally exposes no method
 * that updates or selectively deletes an individual event.
 */
export interface IRecallEventRepository {
  create(event: CreateRecallEventInput): Promise<RecallEvent>;
  findById(id: string): Promise<RecallEvent | null>;
  findByPage(pageId: string): Promise<readonly RecallEvent[]>;
  findBySession(sessionId: string): Promise<readonly RecallEvent[]>;
  findLatestForPage(pageId: string): Promise<RecallEvent | null>;
  findBetweenDates(startDate: Date, endDate: Date): Promise<readonly RecallEvent[]>;
  /**
   * Deletes every recall event and returns how many were removed.
   *
   * This is the single, deliberate exception to the append-only rule
   * above, and it is not a weakening of it. Append-only exists so that
   * PHOS can never quietly rewrite a user's history to make its own
   * numbers look better; it was never meant to stop the user from
   * erasing their own data on request. The distinction that matters is
   * *who* is acting: no engine, calculator or scheduling path may call
   * this. Its only caller is
   * `PersistenceEngine.resetAllData()`, which serves an explicit,
   * typed-confirmation "delete everything" request and takes a backup
   * first. All-or-nothing by design — there is no partial variant,
   * because selective history deletion is exactly what the append-only
   * rule forbids.
   */
  deleteAll(): Promise<number>;
}
