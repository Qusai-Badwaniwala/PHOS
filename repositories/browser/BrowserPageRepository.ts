import { MemoryState, type Page } from "@/shared/types";
import type {
  IPageRepository,
  MemoryVariableUpdate,
  ReviewTimestampUpdate,
} from "../interfaces/IPageRepository";
import { getDatabase, type StoredPage } from "./database";

/**
 * IndexedDB implementation of `IPageRepository`.
 *
 * Behaviourally identical to `PageRepository` (the Prisma one) — same
 * interface, same guarantees — so every engine and every engine test is
 * unaffected by which of the two is wired in.
 *
 * Dates cross the boundary as ISO strings, because IndexedDB's
 * structured clone preserves `Date` objects but JSON export does not,
 * and a single representation avoids one path quietly producing strings
 * where the other produces Dates.
 */
export class BrowserPageRepository implements IPageRepository {
  async findById(id: string): Promise<Page | null> {
    const db = await getDatabase();
    const record = await db.get("pages", id);
    return record ? toDomainPage(record) : null;
  }

  async findByPageNumber(pageNumber: number): Promise<Page | null> {
    const db = await getDatabase();
    const record = await db.getFromIndex("pages", "pageNumber", pageNumber);
    return record ? toDomainPage(record) : null;
  }

  async findAll(): Promise<readonly Page[]> {
    const db = await getDatabase();
    const records = await db.getAll("pages");
    return records.map(toDomainPage).sort((a, b) => a.pageNumber - b.pageNumber);
  }

  async findByJuz(juzNumber: number): Promise<readonly Page[]> {
    const db = await getDatabase();
    const records = await db.getAllFromIndex("pages", "juzNumber", juzNumber);
    return records.map(toDomainPage).sort((a, b) => a.pageNumber - b.pageNumber);
  }

  async findByMemoryState(memoryState: MemoryState): Promise<readonly Page[]> {
    const db = await getDatabase();
    const records = await db.getAllFromIndex("pages", "memoryState", memoryState);
    return records.map(toDomainPage).sort((a, b) => a.pageNumber - b.pageNumber);
  }

  async updateMemoryVariables(pageId: string, values: MemoryVariableUpdate): Promise<Page> {
    return this.patch(pageId, (record) => ({
      ...record,
      ...(values.memoryStrength !== undefined ? { memoryStrength: values.memoryStrength } : {}),
      ...(values.memoryStability !== undefined ? { memoryStability: values.memoryStability } : {}),
      ...(values.difficulty !== undefined ? { difficulty: values.difficulty } : {}),
    }));
  }

  async updateMemoryState(pageId: string, state: MemoryState): Promise<Page> {
    return this.patch(pageId, (record) => ({ ...record, memoryState: state }));
  }

  async updateReviewTimestamps(pageId: string, timestamps: ReviewTimestampUpdate): Promise<Page> {
    return this.patch(pageId, (record) => ({
      ...record,
      lastReviewedAt: timestamps.lastReviewedAt.toISOString(),
      ...(timestamps.lastSuccessfulRecallAt !== undefined
        ? { lastSuccessfulRecallAt: timestamps.lastSuccessfulRecallAt.toISOString() }
        : {}),
      ...(timestamps.firstStudiedAt !== undefined
        ? { firstStudiedAt: timestamps.firstStudiedAt.toISOString() }
        : {}),
    }));
  }

  async save(page: Page): Promise<Page> {
    return this.patch(page.id, (record) => ({
      ...record,
      pageNumber: page.pageNumber,
      juzNumber: page.juzNumber,
      memoryState: page.memoryState,
      memoryStrength: page.memoryStrength,
      memoryStability: page.memoryStability,
      difficulty: page.difficulty,
      firstStudiedAt: page.firstStudiedAt?.toISOString() ?? null,
      lastReviewedAt: page.lastReviewedAt?.toISOString() ?? null,
      lastSuccessfulRecallAt: page.lastSuccessfulRecallAt?.toISOString() ?? null,
    }));
  }

  async exists(pageNumber: number): Promise<boolean> {
    const db = await getDatabase();
    const record = await db.getFromIndex("pages", "pageNumber", pageNumber);
    return record !== undefined;
  }

  async resetAllProgress(): Promise<number> {
    const db = await getDatabase();
    const tx = db.transaction("pages", "readwrite");
    const records = await tx.store.getAll();

    for (const record of records) {
      // Mirrors the column defaults in `schema.prisma`, so a reset page
      // is indistinguishable from a freshly seeded one.
      await tx.store.put({
        ...record,
        memoryState: MemoryState.Unseen,
        memoryStrength: 0,
        memoryStability: 0,
        difficulty: 0,
        firstStudiedAt: null,
        lastReviewedAt: null,
        lastSuccessfulRecallAt: null,
        updatedAt: new Date().toISOString(),
      });
    }

    await tx.done;
    return records.length;
  }

  /** Reads, applies a change, stamps `updatedAt`, and writes back in one transaction. */
  private async patch(pageId: string, change: (record: StoredPage) => StoredPage): Promise<Page> {
    const db = await getDatabase();
    const tx = db.transaction("pages", "readwrite");
    const record = await tx.store.get(pageId);

    if (!record) {
      await tx.done;
      throw new Error(`No page found with id "${pageId}".`);
    }

    const updated = { ...change(record), updatedAt: new Date().toISOString() };
    await tx.store.put(updated);
    await tx.done;

    return toDomainPage(updated);
  }
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function toDomainPage(record: StoredPage): Page {
  return {
    id: record.id,
    pageNumber: record.pageNumber,
    juzNumber: record.juzNumber,
    memoryState: record.memoryState as MemoryState,
    memoryStrength: record.memoryStrength,
    memoryStability: record.memoryStability,
    difficulty: record.difficulty,
    firstStudiedAt: toDate(record.firstStudiedAt),
    lastReviewedAt: toDate(record.lastReviewedAt),
    lastSuccessfulRecallAt: toDate(record.lastSuccessfulRecallAt),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
