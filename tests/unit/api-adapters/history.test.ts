import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportingPeriod } from "@/shared/types";
import { historicalReport, sessionStatistics } from "../../support/adapterFixtures";

/**
 * The History screen filters entirely in the adapter — the engine
 * produces the whole "Overall" history and knows nothing about search
 * boxes or date pickers. Every filter is therefore only as correct as
 * this file, and a filter that quietly drops the wrong rows looks
 * identical to having no history.
 */
const getHistoricalReport = vi.hoisted(() => vi.fn());

vi.mock("@/client/operations", () => ({
  analyticsOps: { getHistoricalReport },
}));

const { getHistory } = await import("@/lib/api/history");

const SESSIONS = [
  sessionStatistics({
    sessionId: "aug-01",
    startedAt: new Date(2026, 7, 1, 9, 0).toISOString(),
    completed: true,
    pagesCompleted: 3,
    pageNumbers: [12, 13, 14],
    recallCount: 3,
  }),
  sessionStatistics({
    sessionId: "aug-03",
    startedAt: new Date(2026, 7, 3, 9, 0).toISOString(),
    completed: false,
    pagesCompleted: 1,
    pageNumbers: [40],
    recallCount: 1,
  }),
  sessionStatistics({
    sessionId: "aug-02",
    startedAt: new Date(2026, 7, 2, 9, 0).toISOString(),
    completed: true,
    sessionType: "Manzil",
    pagesCompleted: 2,
    pageNumbers: [582, 583],
    recallCount: 2,
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  getHistoricalReport.mockResolvedValue(historicalReport(SESSIONS));
});

describe("without filters", () => {
  it("asks for the whole history and lists it newest first", async () => {
    const data = await getHistory();

    expect(getHistoricalReport).toHaveBeenCalledWith(ReportingPeriod.Overall);
    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-03", "aug-02", "aug-01"]);
    expect(data.totalCount).toBe(3);
  });

  it("treats the 'all' sentinel as no filter at all", async () => {
    const data = await getHistory({ activityType: "all", status: "all" });

    expect(data.entries).toHaveLength(3);
  });
});

describe("filtering", () => {
  it("narrows by status", async () => {
    const data = await getHistory({ status: "completed" });

    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-02", "aug-01"]);
  });

  it("reports the filtered count, not the count before filtering", async () => {
    // An easy and invisible mistake: `totalCount` is what the screen
    // shows as "N results", so taking it from the unfiltered list would
    // claim results the user cannot see.
    const data = await getHistory({ status: "pending" });

    expect(data.entries).toHaveLength(1);
    expect(data.totalCount).toBe(1);
  });

  it("keeps only entries on or after dateFrom", async () => {
    const data = await getHistory({ dateFrom: new Date(2026, 7, 2, 0, 0).toISOString() });

    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-03", "aug-02"]);
  });

  it("keeps only entries on or before dateTo", async () => {
    const data = await getHistory({ dateTo: new Date(2026, 7, 2, 23, 59).toISOString() });

    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-02", "aug-01"]);
  });

  it("searches the description as well as the title", async () => {
    // A page number only ever appears in the description, so a search
    // that matched titles alone would silently return nothing.
    const data = await getHistory({ search: "12–14" });

    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-01"]);
  });

  it("lets a user find a session by a page they studied", async () => {
    // The reason pages are in the record at all: "when did I last do
    // 582?" is a question a Hafiz actually asks.
    const data = await getHistory({ search: "582" });

    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-02"]);
  });

  it("searches case-insensitively", async () => {
    const data = await getHistory({ search: "COMPLETED MEMORIZATION" });

    expect(data.entries).toHaveLength(1);
  });

  it("distinguishes revision from new memorization", async () => {
    /*
     * Both read "Completed session" before, so a record of the day's
     * work could not say what kind of work it was.
     */
    const data = await getHistory({ search: "revision" });

    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-02"]);
  });

  it("applies several filters together rather than the last one only", async () => {
    const data = await getHistory({
      status: "completed",
      dateFrom: new Date(2026, 7, 2, 0, 0).toISOString(),
    });

    expect(data.entries.map((entry) => entry.id)).toEqual(["aug-02"]);
  });

  it("returns an empty list, not an error, when nothing matches", async () => {
    const data = await getHistory({ search: "nothing matches this" });

    expect(data.entries).toEqual([]);
    expect(data.totalCount).toBe(0);
  });
});
