import type { Session, SessionItem, SessionType } from "@/shared/types";

/** Input for `create()`. A session starts immediately; `startedAt`/`createdAt` are set by the repository. */
export interface CreateSessionInput {
  readonly sessionType: SessionType;
}

/** Input for `addSessionItem()`. */
export type CreateSessionItemInput = Omit<SessionItem, "id">;

/**
 * Persistence contract for the Session aggregate, which also owns
 * SessionItem (SDS Part 9 "SESSIONREPOSITORY": "Owns Session,
 * SessionItem").
 */
export interface ISessionRepository {
  create(session: CreateSessionInput): Promise<Session>;
  /** Marks a session complete: sets `completedAt` to now and computes `durationSeconds` from `startedAt`. */
  complete(sessionId: string): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findLatest(): Promise<Session | null>;
  /**
   * The most recently *completed* session, or `null` if none has ever
   * been finished.
   *
   * Distinct from `findLatest()`, which returns the newest session
   * whether or not it was finished. "When did the user last actually
   * study?" (PRODUCT_REQUIREMENTS Requirement 5) must not be answered
   * by a session that was started and abandoned, or a long absence
   * would go undetected.
   *
   * A dedicated query rather than a scan: the Adaptive Engine asks this
   * on every plan generation, and a user with years of history should
   * not have their whole session table loaded to answer it.
   */
  findLastCompleted(): Promise<Session | null>;
  /**
   * The most recently started session that has not been completed, or
   * `null` if none is open. This persisted row — not any in-memory or
   * client-side state — is the source of truth for "a session is in
   * progress", so an interrupted session survives a process restart.
   */
  findActive(): Promise<Session | null>;
  findBetweenDates(startDate: Date, endDate: Date): Promise<readonly Session[]>;
  addSessionItem(item: CreateSessionItemInput): Promise<SessionItem>;
  findSessionItems(sessionId: string): Promise<readonly SessionItem[]>;
  /**
   * Deletes every Session and its SessionItems, returning how many
   * sessions were removed. SessionItems are removed first because
   * `schema.prisma` deliberately uses `onDelete: Restrict` rather than
   * cascade, so a Session with items cannot be deleted directly.
   *
   * Callers must delete RecallEvents before calling this, for the same
   * reason. `PersistenceEngine.resetAllData()` — the only caller —
   * owns that ordering.
   */
  deleteAllSessions(): Promise<number>;
}
