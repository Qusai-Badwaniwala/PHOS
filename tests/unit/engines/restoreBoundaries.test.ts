import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, expect, it } from "vitest";
import { container } from "@/client/container";
import {
  computeChecksum,
  serializeSnapshot,
  getDatabase,
  readSnapshot,
  resetDatabaseConnection,
} from "@/repositories/browser";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
});

it("rejects impossible memory percentages before creating a restore point or replacing data", async () => {
  const before = await readSnapshot();
  const file = (await container.persistenceEngine.exportData()).content;
  file.snapshot!.pages[0]!.memoryStrength = 4;
  const checksum = await computeChecksum(serializeSnapshot(file.snapshot!));
  const result = await container.persistenceEngine.importData(
    JSON.stringify({ ...file, checksum }),
  );
  expect(result.success).toBe(false);
  expect(await readSnapshot()).toEqual(before);
  expect(await (await getDatabase()).count("backups")).toBe(0);
});

it("checks the original canonical checksum before adding absent optional stores", async () => {
  const file = (await container.persistenceEngine.exportData()).content;
  const snapshot = file.snapshot! as Partial<NonNullable<typeof file.snapshot>>;
  delete snapshot.roadmapEntries;
  delete snapshot.exams;
  const checksum = await computeChecksum(serializeSnapshot(file.snapshot!));
  const result = await container.persistenceEngine.importData(
    JSON.stringify({ ...file, checksum }),
  );
  expect(result.success).toBe(true);
  expect(await (await getDatabase()).count("pages")).toBe(604);
});

it("refuses a fixed exam stage with a different Juz scope", async () => {
  await container.examRepository.recordPast({ stage: 1, juzNumbers: [30], examDate: null });
  const file = (await container.persistenceEngine.exportData()).content;
  file.snapshot!.exams![0]!.juzNumbers = [1];
  const checksum = await computeChecksum(serializeSnapshot(file.snapshot!));
  const before = await readSnapshot();
  const result = await container.persistenceEngine.importData(
    JSON.stringify({ ...file, checksum }),
  );
  expect(result.success).toBe(false);
  expect(await readSnapshot()).toEqual(before);
  expect(await (await getDatabase()).count("backups")).toBe(0);
});

it("refuses a checksummed local backup with broken references while keeping the current record", async () => {
  const backup = await container.persistenceEngine.createBackup();
  const db = await getDatabase();
  const stored = (await db.get("backups", backup.metadata.id))!;
  stored.snapshot.sessionItems.push({
    id: "orphan",
    pageId: stored.snapshot.pages[0]!.id,
    sessionId: "missing",
    order: 0,
  });
  stored.manifest.checksumSha256 = await computeChecksum(serializeSnapshot(stored.snapshot));
  await db.put("backups", stored);
  const before = await readSnapshot();
  await expect(container.persistenceEngine.restoreBackup(backup.metadata.id)).rejects.toThrow();
  expect(await readSnapshot()).toEqual(before);
});
