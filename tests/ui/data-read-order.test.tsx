import { act, renderHook, waitFor } from "@testing-library/react";
import { useHistory } from "@/lib/hooks/use-history";
import { useAnalytics } from "@/lib/hooks/use-analytics";
import { getHistory } from "@/lib/api/history";
import { getAnalytics } from "@/lib/api/analytics";
import { HISTORY, ANALYTICS } from "../support/pageFixtures";
import type { DateRange, HistoryDTO, AnalyticsDTO } from "@/types/dto";
jest.mock("@/lib/api/history", () => ({ getHistory: jest.fn() }));
jest.mock("@/lib/api/analytics", () => ({ getAnalytics: jest.fn() }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => jest.resetAllMocks());
it("keeps the newest history filter result when an older read finishes last", async () => {
  const old = deferred<HistoryDTO>();
  const latest = deferred<HistoryDTO>();
  jest.mocked(getHistory).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  const { result, rerender } = renderHook(({ search }) => useHistory({ search }), {
    initialProps: { search: "old" },
  });
  rerender({ search: "latest" });
  const expected = { ...HISTORY, totalCount: 7 };
  await act(async () => latest.resolve(expected));
  await waitFor(() => expect(result.current.data).toEqual(expected));
  await act(async () => old.resolve(HISTORY));
  expect(result.current.data).toEqual(expected);
  expect(result.current.loading).toBe(false);
});
it("does not surface an obsolete analytics error after a successful range change", async () => {
  const old = deferred<AnalyticsDTO>();
  jest.mocked(getAnalytics).mockReturnValueOnce(old.promise).mockResolvedValueOnce(ANALYTICS);
  const { result, rerender } = renderHook(({ range }) => useAnalytics(range), {
    initialProps: { range: "week" as DateRange },
  });
  rerender({ range: "all" });
  await waitFor(() => expect(result.current.data).toEqual(ANALYTICS));
  await act(async () => old.reject(new Error("Obsolete read failed")));
  expect(result.current.error).toBeNull();
  expect(result.current.loading).toBe(false);
});
