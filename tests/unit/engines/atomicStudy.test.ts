import "fake-indexeddb/auto";
import { beforeEach, it, expect, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  resetDatabaseConnection,
  readSnapshot,
  BrowserRecallEventRepository,
  BrowserSessionRepository,
} from "@/repositories/browser";
import { container } from "@/client/container";
import { SessionType, ConfidenceLevel } from "@/shared/types";
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
  container.learningEngine.discardInMemoryState();
  vi.restoreAllMocks();
});
it("rolls back page memory when recall persistence fails during completion", async () => {
  const session = await container.learningEngine.startSession(SessionType.Sabaq);
  const plan = await container.learningEngine.loadDailyPlan(30);
  const pageId = plan.studyItems[0]!.pageId;
  const before = (await readSnapshot()).pages;
  vi.spyOn(BrowserRecallEventRepository.prototype, "create").mockRejectedValueOnce(
    new Error("Injected storage failure"),
  );
  container.learningEngine.submitRecall(pageId, true, 60);
  await expect(container.learningEngine.submitConfidence(ConfidenceLevel.High)).rejects.toThrow();
  const after = await readSnapshot();
  expect(after.pages).toEqual(before);
  expect(after.recallEvents).toHaveLength(0);
  expect(after.sessionItems).toHaveLength(0);
  expect(after.sessions[0]?.id).toBe(session.id);
});

it("can retry a failed page without creating a second recall", async () => {
  await container.learningEngine.startSession(SessionType.Sabaq);
  const plan = await container.learningEngine.loadDailyPlan(30);
  const pageId = plan.studyItems[0]!.pageId;
  vi.spyOn(BrowserRecallEventRepository.prototype, "create").mockRejectedValueOnce(
    new Error("Injected failure"),
  );
  container.learningEngine.submitRecall(pageId, true, 60);
  await expect(container.learningEngine.submitConfidence(ConfidenceLevel.High)).rejects.toThrow();
  await container.learningEngine.submitConfidence(ConfidenceLevel.High);
  const after = await readSnapshot();
  expect(after.recallEvents).toHaveLength(1);
  expect(after.sessionItems).toHaveLength(1);
  expect(after.pages.find((page) => page.id === pageId)?.firstStudiedAt).not.toBeNull();
});
it("rolls back the recall and memory when recording the study item fails", async () => {
  await container.learningEngine.startSession(SessionType.Sabaq);
  const plan = await container.learningEngine.loadDailyPlan(30);
  const pageId = plan.studyItems[0]!.pageId;
  const before = (await readSnapshot()).pages;
  vi.spyOn(BrowserSessionRepository.prototype, "addSessionItem").mockRejectedValueOnce(
    new Error("Injected item write failure"),
  );
  container.learningEngine.submitRecall(pageId, true, 60);
  await expect(container.learningEngine.submitConfidence(ConfidenceLevel.High)).rejects.toThrow(
    "Failed to process the pending recall.",
  );
  const after = await readSnapshot();
  expect(after.pages).toEqual(before);
  expect(after.recallEvents).toHaveLength(0);
  expect(after.sessionItems).toHaveLength(0);
  await container.learningEngine.submitConfidence(ConfidenceLevel.High);
  const retried = await readSnapshot();
  expect(retried.recallEvents).toHaveLength(1);
  expect(retried.sessionItems).toHaveLength(1);
});
it("serializes concurrent session starts and keeps the first completion receipt", async () => {
  const repo = container.sessionRepository;
  const starts = await Promise.allSettled([
    repo.createActive({ sessionType: SessionType.Sabaq }),
    repo.createActive({ sessionType: SessionType.Sabqi }),
  ]);
  expect(starts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const active = await repo.findActive();
  expect(active).not.toBeNull();
  const first = await repo.complete(active!.id);
  expect(await repo.complete(active!.id)).toEqual(first);
});
