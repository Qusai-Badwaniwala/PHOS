import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SETTINGS } from "../support/pageFixtures";

/**
 * The revision-mode setting.
 *
 * The thing worth protecting here is tone. PHOS's own scheduling really
 * is better at what it optimises and the copy says so — but a student
 * whose teacher sets a Manzil cycle must be able to choose the cycle
 * without being warned at, nagged, or made to confirm they meant it.
 */
const reload = jest.fn();
const useSettings = jest.fn();
jest.mock("@/providers/settings-provider", () => ({ useSettings: () => useSettings() }));

const saveRevisionMode = jest.fn();
const restartRevisionCycle = jest.fn();
const getRevisionCycle = jest.fn();
jest.mock("@/lib/api/settings", () => ({
  saveRevisionMode: (...args: unknown[]) => saveRevisionMode(...args),
  restartRevisionCycle: () => restartRevisionCycle(),
  getRevisionCycle: () => getRevisionCycle(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { RevisionModeSettings } = require("@/components/settings/revision-mode-settings") as {
  RevisionModeSettings: React.ComponentType;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function traditional(cycleLengthDays = 7) {
  return {
    settings: {
      ...SETTINGS,
      revisionSchedule: {
        mode: "Traditional",
        cycleLengthDays,
        cycleStartedAt: "2026-08-01T00:00:00.000Z",
      },
    },
    ready: true,
    reload,
  };
}

function cyclePlan(overrides: Record<string, unknown> = {}) {
  return {
    cycleLengthDays: 7,
    dayOfCycle: 3,
    passesCompleted: 1,
    pagesInCycle: 41,
    todaysPageNumbers: [13, 14, 15, 16, 17, 18],
    pagesPerDay: 6,
    exceedsDailyBudget: false,
    estimatedMinutesPerDay: 5,
    suggestedCycleLengthDays: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.mockReturnValue({ settings: SETTINGS, ready: true, reload });
  saveRevisionMode.mockResolvedValue(SETTINGS);
  restartRevisionCycle.mockResolvedValue(SETTINGS);
  getRevisionCycle.mockResolvedValue(null);
});

describe("choosing a mode", () => {
  it("defaults to PHOS's own scheduling", () => {
    render(<RevisionModeSettings />);

    expect(screen.getByRole("radio", { name: /PHOS decides/ })).toBeChecked();
  });

  it("says which one PHOS recommends, and why", () => {
    // Hiding that would be false modesty about the whole application.
    render(<RevisionModeSettings />);

    expect(screen.getByText(/PHOS decides \(recommended\)/)).toBeInTheDocument();
    expect(screen.getByText(/Fewer pages a day for the same retention/)).toBeInTheDocument();
  });

  it("presents the fixed cycle as a legitimate choice, not a fallback", () => {
    // Requirement 9: PHOS recommends, the user decides.
    render(<RevisionModeSettings />);

    expect(screen.getByText(/the way most Hifz institutions teach/)).toBeInTheDocument();
  });

  it("switches without a confirmation or a warning", async () => {
    const user = userEvent.setup();
    render(<RevisionModeSettings />);

    await user.click(screen.getByRole("radio", { name: /A fixed cycle/ }));

    await waitFor(() => expect(saveRevisionMode).toHaveBeenCalledTimes(1));
    expect(saveRevisionMode.mock.calls[0]![0]).toMatchObject({ mode: "Traditional" });
    // No "are you sure" between the click and the change.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says plainly that new memorization is unaffected", async () => {
    // The thing users most fear a "revision cycle" will silently switch
    // off.
    render(<RevisionModeSettings />);

    expect(screen.getByText(/new memorization is unaffected/)).toBeInTheDocument();
  });

  it("says an exam takes precedence over both", () => {
    render(<RevisionModeSettings />);

    expect(
      screen.getByText(/An exam, while one is scheduled, takes precedence/),
    ).toBeInTheDocument();
  });
});

describe("a running cycle", () => {
  it("hides the cycle controls entirely on PHOS's own scheduling", () => {
    render(<RevisionModeSettings />);

    expect(screen.queryByLabelText("Days for a full pass")).not.toBeInTheDocument();
  });

  it("shows where the rotation has reached", async () => {
    useSettings.mockReturnValue(traditional());
    getRevisionCycle.mockResolvedValue(cyclePlan());

    render(<RevisionModeSettings />);

    expect(await screen.findByText("Day 3 of 7")).toBeInTheDocument();
    expect(screen.getByText(/41 pages memorized, about 6 a day/)).toBeInTheDocument();
    expect(screen.getByText(/1 scheduled cycle elapsed/)).toBeInTheDocument();
  });

  it("names a cycle length that would fit when the current one does not", async () => {
    /*
     * Unlike an exam's warning, this one is actionable: the length is
     * the user's own choice, so PHOS offers a number rather than only
     * reporting the problem.
     */
    useSettings.mockReturnValue(traditional(3));
    getRevisionCycle.mockResolvedValue(
      cyclePlan({
        cycleLengthDays: 3,
        exceedsDailyBudget: true,
        estimatedMinutesPerDay: 120,
        suggestedCycleLengthDays: 12,
      }),
    );

    render(<RevisionModeSettings />);

    expect(await screen.findByText(/A 12-day cycle would fit/)).toBeInTheDocument();
    // And says it will honour the user's choice regardless.
    expect(screen.getByText(/it is your cycle/)).toBeInTheDocument();
  });

  it("offers a restart, separately from changing the length", async () => {
    // Changing "7 days" to "10" is not "start again from Juz 1".
    const user = userEvent.setup();
    useSettings.mockReturnValue(traditional());
    getRevisionCycle.mockResolvedValue(cyclePlan());

    render(<RevisionModeSettings />);
    await user.click(await screen.findByRole("button", { name: /Start the cycle again/ }));

    await waitFor(() => expect(restartRevisionCycle).toHaveBeenCalledTimes(1));
    expect(saveRevisionMode).not.toHaveBeenCalled();
  });

  it("only offers to save a length the user actually changed", async () => {
    const user = userEvent.setup();
    useSettings.mockReturnValue(traditional());
    getRevisionCycle.mockResolvedValue(cyclePlan());

    render(<RevisionModeSettings />);
    await screen.findByText("Day 3 of 7");

    expect(screen.queryByRole("button", { name: /Save cycle length/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Increase/i }));

    expect(await screen.findByRole("button", { name: /Save cycle length/ })).toBeInTheDocument();
  });

  it("stays usable when the cycle position cannot be read", async () => {
    useSettings.mockReturnValue(traditional());
    getRevisionCycle.mockRejectedValue(new Error("boom"));

    render(<RevisionModeSettings />);

    // The controls remain; only the position line is missing.
    expect(await screen.findByLabelText("Days for a full pass")).toBeInTheDocument();
  });
});
