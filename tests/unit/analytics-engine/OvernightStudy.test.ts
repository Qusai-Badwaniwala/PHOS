import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { container } from "@/client/container";
import { getDatabase, resetDatabaseConnection } from "@/repositories/browser";
import { ReportingPeriod } from "@/shared/types";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnection();
});
afterEach(() => vi.useRealTimers());

it("counts study and completion inside the period even when the session began earlier", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 5, 12));
  const db = await getDatabase();
  const page = (await db.getAll("pages"))[0]!;
  const startedAt = new Date(2026, 9, 3, 23, 55).toISOString();
  const recordedAt = new Date(2026, 9, 5, 0, 5).toISOString();
  await db.put("sessions", {
    id: "overnight",
    sessionType: "Sabaq",
    startedAt,
    completedAt: recordedAt,
    durationSeconds: 600,
    createdAt: startedAt,
  });
  await db.put("sessionItems", { id: "item", sessionId: "overnight", pageId: page.id, order: 0 });
  await db.put("recallEvents", {
    id: "recall",
    sessionId: "overnight",
    pageId: page.id,
    timestamp: recordedAt,
    successfulRecall: true,
    confidence: "High",
    durationSeconds: 60,
  });
  const progress = await container.analyticsEngine.generateProgressReport(ReportingPeriod.Daily);
  expect(progress.completedPages).toBe(1);
  expect(progress.completedSessions).toBe(1);
  const history = await container.analyticsEngine.generateHistoricalReport(ReportingPeriod.Daily);
  expect(history.sessions).toHaveLength(1);
  expect(history.sessions[0]?.dailyActivity).toEqual([
    { date: "2026-10-05", pagesCompleted: 1, recallCount: 1, successfulRecallCount: 1 },
  ]);
});
