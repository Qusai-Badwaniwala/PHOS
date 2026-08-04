import { TOTAL_JUZ, type RoadmapEntry } from "@/shared/types";
import type { IRoadmapRepository, RoadmapEntryUpdate } from "../interfaces/IRoadmapRepository";
import { generateId, getDatabase, type StoredRoadmapEntry } from "./database";

/**
 * IndexedDB implementation of `IRoadmapRepository`.
 *
 * Enforces "exactly 30 entries exist" lazily on read, exactly as the
 * SQL version does — which matters just as much here, since a browser
 * database created before the roadmap existed would otherwise have no
 * entries and no migration to add them.
 */
export class BrowserRoadmapRepository implements IRoadmapRepository {
  async findAll(): Promise<readonly RoadmapEntry[]> {
    const db = await getDatabase();
    const existing = await db.getAll("roadmapEntries");

    if (existing.length < TOTAL_JUZ) {
      const present = new Set(existing.map((entry) => entry.juzNumber));
      const tx = db.transaction("roadmapEntries", "readwrite");
      for (let juzNumber = 1; juzNumber <= TOTAL_JUZ; juzNumber += 1) {
        if (present.has(juzNumber)) continue;
        await tx.store.add({
          id: generateId(),
          juzNumber,
          position: juzNumber - 1,
          paused: false,
        });
      }
      await tx.done;
      return sorted(await db.getAll("roadmapEntries"));
    }

    return sorted(existing);
  }

  async updateEntry(juzNumber: number, update: RoadmapEntryUpdate): Promise<RoadmapEntry> {
    await this.findAll();

    const db = await getDatabase();
    const tx = db.transaction("roadmapEntries", "readwrite");
    const record = await tx.store.index("juzNumber").get(juzNumber);

    if (!record) {
      await tx.done;
      throw new Error(`No roadmap entry found for Juz ${juzNumber}.`);
    }

    const updated: StoredRoadmapEntry = {
      ...record,
      ...(update.position !== undefined ? { position: update.position } : {}),
      ...(update.paused !== undefined ? { paused: update.paused } : {}),
    };
    await tx.store.put(updated);
    await tx.done;

    return toDomainRoadmapEntry(updated);
  }

  async replaceCustomOrder(juzNumbersInOrder: readonly number[]): Promise<readonly RoadmapEntry[]> {
    await this.findAll();

    const db = await getDatabase();
    const tx = db.transaction("roadmapEntries", "readwrite");
    const index = tx.store.index("juzNumber");

    for (const [position, juzNumber] of juzNumbersInOrder.entries()) {
      const record = await index.get(juzNumber);
      if (record) await tx.store.put({ ...record, position });
    }
    await tx.done;

    return this.findAll();
  }

  async resetToDefaults(): Promise<readonly RoadmapEntry[]> {
    await this.findAll();

    const db = await getDatabase();
    const tx = db.transaction("roadmapEntries", "readwrite");
    const records = await tx.store.getAll();

    for (const record of records) {
      await tx.store.put({ ...record, position: record.juzNumber - 1, paused: false });
    }
    await tx.done;

    return this.findAll();
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
