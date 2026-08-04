import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ANALYTICS,
  DASHBOARD,
  HISTORY,
  REVISION,
  SESSION,
  SETTINGS,
  hookResult,
} from "../support/pageFixtures";

/**
 * Every PHOS screen answers the same four questions before it renders
 * anything: is it still loading, did it fail, is there nothing to show,
 * or is there work to do. Those four branches are where a page crashes
 * on undefined data, or — worse — shows an empty state to a user who
 * has plenty of history because a fetch quietly failed.
 *
 * These are smoke tests by design. They assert that each branch renders
 * and that the retry path is wired, not how any card looks.
 */
const useDashboard = jest.fn();
const useSession = jest.fn();
const useRevision = jest.fn();
const useAnalytics = jest.fn();
const useHistory = jest.fn();
const useSettings = jest.fn();

jest.mock("@/lib/hooks/use-dashboard", () => ({ useDashboard: () => useDashboard() }));
jest.mock("@/lib/hooks/use-session", () => ({ useSession: () => useSession() }));
jest.mock("@/lib/hooks/use-revision", () => ({ useRevision: () => useRevision() }));
jest.mock("@/lib/hooks/use-analytics", () => ({
  useAnalytics: (...args: unknown[]) => useAnalytics(...args),
}));
jest.mock("@/lib/hooks/use-history", () => ({
  useHistory: (...args: unknown[]) => useHistory(...args),
}));
jest.mock("@/providers/settings-provider", () => ({ useSettings: () => useSettings() }));

// Reach the engines through IndexedDB, which jsdom does not provide.
// The pages under test only need them to exist.
jest.mock("@/lib/api/session", () => ({
  startSession: jest.fn(),
  completeSession: jest.fn(),
  finishSessionLater: jest.fn(),
}));
jest.mock("@/lib/api/revision", () => ({
  startRevision: jest.fn(),
  completeRevision: jest.fn(),
  finishRevisionLater: jest.fn(),
}));
jest.mock("@/lib/api/pages", () => ({ logMemorizedOutside: jest.fn() }));

/* eslint-disable @typescript-eslint/no-require-imports */
const DashboardPage = require("@/app/dashboard/page").default as React.ComponentType;
const SessionPage = require("@/app/session/page").default as React.ComponentType;
const RevisionPage = require("@/app/revision/page").default as React.ComponentType;
const AnalyticsPage = require("@/app/analytics/page").default as React.ComponentType;
const HistoryPage = require("@/app/history/page").default as React.ComponentType;
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.mockReturnValue({
    settings: SETTINGS,
    ready: true,
    updatePreferences: jest.fn(),
    setTheme: jest.fn(),
    reload: jest.fn(),
  });
});

/**
 * The five data-driven screens, each with the hook that feeds it and
 * the data that counts as "something to show".
 */
const PAGES = [
  { name: "Dashboard", Page: () => <DashboardPage />, hook: useDashboard, data: DASHBOARD },
  { name: "Session", Page: () => <SessionPage />, hook: useSession, data: SESSION },
  { name: "Revision", Page: () => <RevisionPage />, hook: useRevision, data: REVISION },
  { name: "Analytics", Page: () => <AnalyticsPage />, hook: useAnalytics, data: ANALYTICS },
  { name: "History", Page: () => <HistoryPage />, hook: useHistory, data: HISTORY },
] as const;

describe.each(PAGES)("$name", ({ Page, hook, data }) => {
  it("renders while still loading, without touching the data", () => {
    hook.mockReturnValue(hookResult({ loading: true }));

    const { container } = render(<Page />);

    // The point is that a loading page renders *something* rather than
    // reading fields off data that has not arrived.
    expect(container).not.toBeEmptyDOMElement();
  });

  it("offers a way out when the read fails", async () => {
    const user = userEvent.setup();
    const refetch = jest.fn();
    hook.mockReturnValue({ ...hookResult({ error: new Error("boom") }), refetch });

    render(<Page />);

    // An error state with no retry strands the user on a dead screen.
    const retry = screen.getByRole("button", { name: /try again|retry/i });
    await user.click(retry);

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state rather than crashing on no data", () => {
    hook.mockReturnValue(hookResult({ data: null }));

    const { container } = render(<Page />);

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders its content when there is something to show", () => {
    hook.mockReturnValue(hookResult({ data }));

    const { container } = render(<Page />);

    expect(container).not.toBeEmptyDOMElement();
  });
});

describe("Dashboard content", () => {
  beforeEach(() => useDashboard.mockReturnValue(hookResult({ data: DASHBOARD })));

  it("shows today's plan, the numbers behind it, and why it looks that way", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    // Requirement 4: the engine's own explanation, verbatim.
    expect(screen.getByText("A steady day.")).toBeInTheDocument();
  });

  it("withholds the health scores rather than inventing them", () => {
    useDashboard.mockReturnValue(
      hookResult({
        data: { ...DASHBOARD, memoryHealth: undefined, retentionQuality: undefined },
      }),
    );

    render(<DashboardPage />);

    // `undefined` is what selects the honest "not enough data yet"
    // state on both cards.
    expect(screen.getAllByText(/not enough data/i).length).toBeGreaterThan(0);
  });

  it("stays silent about a return and a heavy day when neither applies", () => {
    render(<DashboardPage />);

    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
  });

  it("surfaces the welcome-back message and the workload notice when they exist", () => {
    useDashboard.mockReturnValue(
      hookResult({
        data: {
          ...DASHBOARD,
          welcomeBackMessage: "Welcome back — it has been 9 days.",
          workloadWarning: "Today is heavier than usual.",
        },
      }),
    );

    render(<DashboardPage />);

    expect(screen.getByText("Welcome back — it has been 9 days.")).toBeInTheDocument();
    expect(screen.getByText("Today is heavier than usual.")).toBeInTheDocument();
  });

  it("renders with nothing scheduled at all", () => {
    // A user who has finished everything, or has not started, still
    // gets a page rather than a blank screen.
    useDashboard.mockReturnValue(
      hookResult({ data: { ...DASHBOARD, session: null, revision: null } }),
    );

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});

describe("Analytics", () => {
  it("treats a report with no recorded work as empty, not as zeros", () => {
    // Rendering a wall of charts reading zero would suggest PHOS had
    // measured something and found nothing, rather than that there is
    // nothing yet to measure.
    useAnalytics.mockReturnValue(
      hookResult({
        data: {
          ...ANALYTICS,
          summary: { ...ANALYTICS.summary, totalMemorized: 0 },
          progressOverTime: [],
        },
      }),
    );

    render(<AnalyticsPage />);

    expect(screen.queryByRole("tab", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Analytics" })).not.toBeInTheDocument();
  });

  it("shows the tabs and their content once there is data", () => {
    useAnalytics.mockReturnValue(hookResult({ data: ANALYTICS }));

    render(<AnalyticsPage />);

    // Also pins the tab roles themselves: without them a screen reader
    // hears a row of anonymous buttons, and the assertion above would
    // pass whatever the page rendered.
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Trends" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("asks the engine for the range the user selected", async () => {
    const user = userEvent.setup();
    useAnalytics.mockReturnValue(hookResult({ data: ANALYTICS }));

    render(<AnalyticsPage />);
    expect(useAnalytics).toHaveBeenCalledWith("week");

    await user.click(screen.getByRole("button", { name: /month/i }));

    expect(useAnalytics).toHaveBeenLastCalledWith("month");
  });
});

describe("History", () => {
  it("shows the empty state when every entry is filtered away", () => {
    useHistory.mockReturnValue(hookResult({ data: { entries: [], totalCount: 0 } }));

    render(<HistoryPage />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("passes the search text down as a filter instead of filtering in the page", async () => {
    const user = userEvent.setup();
    useHistory.mockReturnValue(hookResult({ data: HISTORY }));

    render(<HistoryPage />);
    await user.type(screen.getByRole("searchbox"), "session");

    expect(useHistory).toHaveBeenLastCalledWith(expect.objectContaining({ search: "session" }));
  });
});
