import type { Session, SessionItem, SessionType } from "@/shared/types";
import type {
  CreateSessionInput,
  CreateSessionItemInput,
  ISessionRepository,
} from "../interfaces/ISessionRepository";
import { generateId, getDatabase, type StoredSession, type StoredSessionItem } from "./database";

/** IndexedDB implementation of `ISessionRepository`. Owns Session and SessionItem, as in SQL. */
export class BrowserSessionRepository implements ISessionRepository {
  async create(session: CreateSessionInput): Promise<Session> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const record: StoredSession = {
      id: generateId(),
      sessionType: session.sessionType,
      startedAt: now,
      completedAt: null,
      durationSeconds: null,
      createdAt: now,
    };
    await db.add("sessions", record);
    return toDomainSession(record);
  }

  async complete(sessionId: string): Promise<Session> {
    const db = await getDatabase();
    const tx = db.transaction("sessions", "readwrite");
    const record = await tx.store.get(sessionId);

    if (!record) {
      await tx.done;
      throw new Error(`No session found with id "${sessionId}".`);
    }

    const completedAt = new Date();
    // Matches the SQL repository: duration is derived from the elapsed
    // wall time, floored at zero so a clock adjustment cannot produce a
    // negative session length.
    const durationSeconds = Math.max(
      0,
      Math.round((completedAt.getTime() - new Date(record.startedAt).getTime()) / 1000),
    );

    const updated: StoredSession = {
      ...record,
      completedAt: completedAt.toISOString(),
      durationSeconds,
    };
    await tx.store.put(updated);
    await tx.done;

    return toDomainSession(updated);
  }

  async findById(id: string): Promise<Session | null> {
    const db = await getDatabase();
    const record = await db.get("sessions", id);
    return record ? toDomainSession(record) : null;
  }

  async findLatest(): Promise<Session | null> {
    const sessions = await this.allSorted();
    return sessions[0] ?? null;
  }

  async findActive(): Promise<Session | null> {
    const sessions = await this.allSorted();
    return sessions.find((session) => session.completedAt === null) ?? null;
  }

  async findLastCompleted(): Promise<Session | null> {
    const db = await getDatabase();
    const records = await db.getAll("sessions");
    const completed = records
      .filter((record) => record.completedAt !== null)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    const latest = completed[0];
    return latest ? toDomainSession(latest) : null;
  }

  async findBetweenDates(startDate: Date, endDate: Date): Promise<readonly Session[]> {
    const db = await getDatabase();
    const records = await db.getAll("sessions");
    const from = startDate.getTime();
    const to = endDate.getTime();

    return records
      .filter((record) => {
        const startedAt = new Date(record.startedAt).getTime();
        return startedAt >= from && startedAt <= to;
      })
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map(toDomainSession);
  }

  async addSessionItem(item: CreateSessionItemInput): Promise<SessionItem> {
    const db = await getDatabase();

    // The SQL schema declares `@@unique([sessionId, pageId])`.
    // IndexedDB cannot express a composite unique constraint, so the
    // invariant is upheld here instead: adding a page already in the
    // session returns the existing row rather than duplicating it.
    const existing = (await db.getAllFromIndex("sessionItems", "sessionId", item.sessionId)).find(
      (candidate) => candidate.pageId === item.pageId,
    );
    if (existing) return toDomainSessionItem(existing);

    const record: StoredSessionItem = {
      id: generateId(),
      sessionId: item.sessionId,
      pageId: item.pageId,
      order: item.order,
    };
    await db.add("sessionItems", record);
    return toDomainSessionItem(record);
  }

  async findSessionItems(sessionId: string): Promise<readonly SessionItem[]> {
    const db = await getDatabase();
    const records = await db.getAllFromIndex("sessionItems", "sessionId", sessionId);
    return records.sort((a, b) => a.order - b.order).map(toDomainSessionItem);
  }

  async deleteAllSessions(): Promise<number> {
    const db = await getDatabase();
    const tx = db.transaction(["sessions", "sessionItems"], "readwrite");

    // Items before sessions, mirroring the deletion order the SQL
    // schema enforced with `onDelete: Restrict`. IndexedDB has no
    // foreign keys, so the ordering is kept in code rather than by the
    // store — see the note in `database.ts`.
    const sessionCount = await tx.objectStore("sessions").count();
    await tx.objectStore("sessionItems").clear();
    await tx.objectStore("sessions").clear();
    await tx.done;

    return sessionCount;
  }

  /** Every session, newest first. */
  private async allSorted(): Promise<Session[]> {
    const db = await getDatabase();
    const records = await db.getAll("sessions");
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map(toDomainSession);
  }
}

function toDomainSession(record: StoredSession): Session {
  return {
    id: record.id,
    sessionType: record.sessionType as SessionType,
    startedAt: new Date(record.startedAt),
    completedAt: record.completedAt ? new Date(record.completedAt) : null,
    durationSeconds: record.durationSeconds,
    createdAt: new Date(record.createdAt),
  };
}

function toDomainSessionItem(record: StoredSessionItem): SessionItem {
  return {
    id: record.id,
    sessionId: record.sessionId,
    pageId: record.pageId,
    order: record.order,
  };
}
