import type { IDBPObjectStore, StoreNames } from "idb";
import { TOTAL_JUZ, type RoadmapEntry } from "@/shared/types";
import type { IRoadmapRepository, RoadmapEntryUpdate } from "../interfaces/IRoadmapRepository";
import {
  generateId,
  getDatabase,
  type StoredRoadmapEntry,
  type BrowserWriteTransaction,
  type PhosDB,
} from "./database";

type RoadmapStore = IDBPObjectStore<PhosDB, StoreNames<PhosDB>[], "roadmapEntries", "readwrite">;

/** Lazily seeds the complete roadmap inside the transaction that uses it. */
export class BrowserRoadmapRepository implements IRoadmapRepository {
  constructor(private readonly transaction?: BrowserWriteTransaction) {}

  async findAll(): Promise<readonly RoadmapEntry[]> {
    return this.withStore(async (store) => sorted(await store.getAll()));
  }

  async updateEntry(juzNumber: number, update: RoadmapEntryUpdate): Promise<RoadmapEntry> {
    return this.withStore(async (store) => {
      const record = await store.index("juzNumber").get(juzNumber);
      if (!record) throw new Error(`No roadmap entry found for Juz ${juzNumber}.`);
      const updated: StoredRoadmapEntry = {
        ...record,
        ...(update.position !== undefined ? { position: update.position } : {}),
        ...(update.paused !== undefined ? { paused: update.paused } : {}),
      };
      await store.put(updated);
      return toDomainRoadmapEntry(updated);
    });
  }

  async replaceCustomOrder(juzNumbersInOrder: readonly number[]): Promise<readonly RoadmapEntry[]> {
    return this.withStore(async (store) => {
      const index = store.index("juzNumber");
      for (const [position, juzNumber] of juzNumbersInOrder.entries()) {
        const record = await index.get(juzNumber);
        if (record) await store.put({ ...record, position });
      }
      return sorted(await store.getAll());
    });
  }

  async resetToDefaults(): Promise<readonly RoadmapEntry[]> {
    return this.withStore(async (store) => {
      for (const record of await store.getAll()) {
        await store.put({ ...record, position: record.juzNumber - 1, paused: false });
      }
      return sorted(await store.getAll());
    });
  }

  private async withStore<T>(work: (store: RoadmapStore) => Promise<T>): Promise<T> {
    const owned = this.transaction
      ? null
      : (await getDatabase()).transaction(["roadmapEntries"], "readwrite");
    const transaction = this.transaction ?? owned!;
    void transaction.done.catch(() => undefined);
    try {
      const store = transaction.objectStore("roadmapEntries");
      const present = new Set((await store.getAll()).map((entry) => entry.juzNumber));
      for (let juzNumber = 1; juzNumber <= TOTAL_JUZ; juzNumber += 1) {
        if (!present.has(juzNumber))
          await store.add({ id: generateId(), juzNumber, position: juzNumber - 1, paused: false });
      }
      const result = await work(store);
      if (owned) await owned.done;
      return result;
    } catch (error) {
      if (owned) {
        try {
          owned.abort();
        } catch {
          /* Already aborted. */
        }
        await owned.done.catch(() => undefined);
      }
      throw error;
    }
  }
}

function sorted(records: StoredRoadmapEntry[]): RoadmapEntry[] {
  return [...records].sort((a, b) => a.juzNumber - b.juzNumber).map(toDomainRoadmapEntry);
}

function toDomainRoadmapEntry(record: StoredRoadmapEntry): RoadmapEntry {
  return {
    id: record.id,
    juzNumber: record.juzNumber,
    position: record.position,
    paused: record.paused,
  };
}
