import type { ConfidenceLevel, RecallEvent } from "@/shared/types";
import type {
  CreateRecallEventInput,
  IRecallEventRepository,
} from "../interfaces/IRecallEventRepository";
import { generateId, getDatabase, type StoredRecallEvent } from "./database";

/**
 * IndexedDB implementation of `IRecallEventRepository`.
 *
 * Recall events remain immutable and append-only: this class exposes no
 * update, and no way to delete an individual event. `deleteAll()` is
 * the same single, deliberate exception it is in the SQL
 * implementation — used only by `PersistenceEngine.resetAllData()` to
 * serve an explicit "delete everything" request, after a backup.
 */
export class BrowserRecallEventRepository implements IRecallEventRepository {
  async create(event: CreateRecallEventInput): Promise<RecallEvent> {
    const db = await getDatabase();
    const record: StoredRecallEvent = {
      id: generateId(),
      pageId: event.pageId,
      sessionId: event.sessionId,
      timestamp: event.timestamp.toISOString(),
      successfulRecall: event.successfulRecall,
      confidence: event.confidence,
      durationSeconds: event.durationSeconds,
    };
    await db.add("recallEvents", record);
    return toDomainRecallEvent(record);
  }

  async findById(id: string): Promise<RecallEvent | null> {
    const db = await getDatabase();
    const record = await db.get("recallEvents", id);
    return record ? toDomainRecallEvent(record) : null;
  }

  async findByPage(pageId: string): Promise<readonly RecallEvent[]> {
    const db = await getDatabase();
    const records = await db.getAllFromIndex("recallEvents", "pageId", pageId);
    return sortByTimestamp(records).map(toDomainRecallEvent);
  }

  async findBySession(sessionId: string): Promise<readonly RecallEvent[]> {
    const db = await getDatabase();
    const records = await db.getAllFromIndex("recallEvents", "sessionId", sessionId);
    return sortByTimestamp(records).map(toDomainRecallEvent);
  }

  async findLatestForPage(pageId: string): Promise<RecallEvent | null> {
    const db = await getDatabase();
    const records = await db.getAllFromIndex("recallEvents", "pageId", pageId);
    const sorted = sortByTimestamp(records);
    const latest = sorted[sorted.length - 1];
    return latest ? toDomainRecallEvent(latest) : null;
  }

  async findBetweenDates(startDate: Date, endDate: Date): Promise<readonly RecallEvent[]> {
    const db = await getDatabase();
    const records = await db.getAll("recallEvents");
    const from = startDate.getTime();
    const to = endDate.getTime();

    return sortByTimestamp(
      records.filter((record) => {
        const at = new Date(record.timestamp).getTime();
        return at >= from && at <= to;
      }),
    ).map(toDomainRecallEvent);
  }

  async deleteAll(): Promise<number> {
    const db = await getDatabase();
    const tx = db.transaction("recallEvents", "readwrite");
    const count = await tx.store.count();
    await tx.store.clear();
    await tx.done;
    return count;
  }
}

function sortByTimestamp(records: StoredRecallEvent[]): StoredRecallEvent[] {
  return [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function toDomainRecallEvent(record: StoredRecallEvent): RecallEvent {
  return {
    id: record.id,
    pageId: record.pageId,
    sessionId: record.sessionId,
    timestamp: new Date(record.timestamp),
    successfulRecall: record.successfulRecall,
    confidence: record.confidence as ConfidenceLevel,
    durationSeconds: record.durationSeconds,
  };
}
