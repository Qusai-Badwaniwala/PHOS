import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SETTINGS } from "../support/pageFixtures";
import type { GoalCardDTO, WeeklyReviewDTO } from "@/types/dto";

/**
 * The goal is the one place PHOS makes a forward-looking claim about a
 * person. These tests hold it to the tone the feature was agreed on:
 * information, never pressure.
 */
const reload = jest.fn();
const useSettings = jest.fn();
jest.mock("@/providers/settings-provider", () => ({ useSettings: () => useSettings() }));

const saveGoal = jest.fn();
const getGoalPosition = jest.fn();
jest.mock("@/lib/api/settings", () => ({
  saveGoal: (...args: unknown[]) => saveGoal(...args),
  getGoalPosition: () => getGoalPosition(),
}));

/**
 * A Juz-30-first order, which is the case the page-count picker got
 * wrong: "through Juz 5" is 124 pages here and 101 for somebody going
 * straight through the Mushaf.
 */
const JUZ_30_FIRST: readonly { juz: number; pages: number }[] = [
  { juz: 30, pages: 23 },
  { juz: 1, pages: 21 },
  { juz: 2, pages: 20 },
  { juz: 3, pages: 20 },
  { juz: 4, pages: 20 },
  { juz: 5, pages: 20 },
];

function goalPosition(pagesMemorized = 38, currentJuz: number | null = 1) {
  let cumulative = 0;
  return {
    pagesMemorized,
    currentJuz,
    milestones: JUZ_30_FIRST.map((entry, index) => {
      cumulative += entry.pages;
      return {
        juzNumber: entry.juz,
        position: index + 1,
        cumulativePages: cumulative,
        reached: pagesMemorized >= cumulative,
      };
    }),
  };
}

/* eslint-disable @typescript-eslint/no-require-imports */
const { GoalCard } = require("@/components/dashboard/goal-card") as {
  GoalCard: React.ComponentType<{ goal?: GoalCardDTO | null }>;
};
const { WeeklyReviewCard } = require("@/components/dashboard/weekly-review") as {
  WeeklyReviewCard: React.ComponentType<{ review?: WeeklyReviewDTO }>;
};
const { GoalSettings } = require("@/components/settings/goal-settings") as {
  GoalSettings: React.ComponentType;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function goalCard(overrides: Partial<GoalCardDTO> = {}): GoalCardDTO {
  return {
    targetPages: 604,
    targetDate: "03/01/2029",
    pagesMemorized: 120,
    pagesRemaining: 484,
    pacePerDay: 1,
    projectedDate: "01/15/2028",
    daysFromGoal: -410,
    targetReached: false,
    summary:
      "At about 1 page a day, you'd reach 604 pages around 01/15/2028 — about 1.1 years before your goal.",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.mockReturnValue({ settings: SETTINGS, ready: true, reload });
  saveGoal.mockResolvedValue(SETTINGS);
  getGoalPosition.mockResolvedValue(goalPosition());
});

describe("GoalCard", () => {
  it("invites a goal once when none is set, without implying one is missing", () => {
    render(<GoalCard goal={null} />);

    expect(screen.getByText(/Set a goal, if you want one/)).toBeInTheDocument();
    // No progress bar, no zeros, nothing that reads as an unfinished task.
    expect(screen.queryByText(/0 of/)).not.toBeInTheDocument();
  });

  it("shows the summary and the progress toward the target", () => {
    render(<GoalCard goal={goalCard()} />);

    expect(screen.getByText(/you'd reach 604 pages/)).toBeInTheDocument();
    expect(screen.getByText(/120 of 604 pages/)).toBeInTheDocument();
    expect(screen.getByText(/Goal: 604 pages by 03\/01\/2029/)).toBeInTheDocument();
  });

  it("renders the retention note when the pace lands late", () => {
    // The note is what stops this card quietly reversing PHOS's
    // retention-over-speed rule.
    render(
      <GoalCard
        goal={goalCard({
          daysFromGoal: 184,
          summary: "…about 6 months after your goal.",
          note: "That is a fact about pace, not a verdict.",
        })}
      />,
    );

    expect(screen.getByText(/not a verdict/)).toBeInTheDocument();
  });

  it("never renders an unmeasured pace as a number", () => {
    render(
      <GoalCard
        goal={goalCard({
          pacePerDay: null,
          projectedDate: null,
          daysFromGoal: null,
          summary: "6 of 604 pages memorized.",
          note: "PHOS will estimate a finish date once it has watched you memorize for about a week.",
        })}
      />,
    );

    expect(screen.getByText(/about a week/)).toBeInTheDocument();
    expect(screen.queryByText(/0 pages a day/)).not.toBeInTheDocument();
  });
});

describe("WeeklyReviewCard", () => {
  const review: WeeklyReviewDTO = {
    pagesCompleted: 12,
    sessionsCompleted: 5,
    recallsRecorded: 63,
    recallTrend: "Improving",
    trendSummary: "Your recall improved noticeably this week.",
  };

  it("shows the week's figures and the engine's own sentence", () => {
    render(<WeeklyReviewCard review={review} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("63")).toBeInTheDocument();
    expect(screen.getByText("Your recall improved noticeably this week.")).toBeInTheDocument();
  });

  it("says a quiet week plainly rather than showing a row of zeros", () => {
    // Three noughts read as a scoreboard. A week away is a normal part
    // of a years-long journey.
    render(
      <WeeklyReviewCard
        review={{ ...review, pagesCompleted: 0, sessionsCompleted: 0, recallsRecorded: 0 }}
      />,
    );

    expect(screen.getByText(/Nothing recorded in the last seven days/)).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

describe("GoalSettings", () => {
  const picker = () => screen.getByLabelText("I want to have memorized through");

  it("tells the user where they currently are", async () => {
    render(<GoalSettings />);

    expect(
      await screen.findByText(/You're on Juz 1 · 38 of 604 pages memorized/),
    ).toBeInTheDocument();
  });

  it("offers Juz in the user's own order, not the Mushaf's", async () => {
    // The whole point of the picker: somebody memorizing Juz 30 first
    // must be offered Juz 30 first.
    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());

    const options = screen.getAllByRole("option").map((option) => option.textContent);

    expect(options[1]).toMatch(/^Juz 30 — 23 pages/);
    expect(options[2]).toMatch(/^Juz 1 — 44 pages/);
  });

  it("spells out which Juz the choice covers and what it comes to in pages", async () => {
    // The page count is what actually gets stored, so the conversion is
    // shown rather than done behind the user's back.
    const user = userEvent.setup();
    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());

    await user.selectOptions(picker(), "6");

    expect(screen.getByText("Juz 30, 1, 2, 3, 4, 5 — 124 pages")).toBeInTheDocument();
  });

  it("saves the page count the chosen Juz resolves to", async () => {
    const user = userEvent.setup();
    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());

    await user.selectOptions(picker(), "6");
    await user.type(screen.getByLabelText("Goal date"), "2029-03-01");
    await user.click(screen.getByRole("button", { name: /Set goal/ }));

    await waitFor(() => expect(saveGoal).toHaveBeenCalledTimes(1));
    // 124, not 5 — a Juz number would be meaningless to the projection.
    expect(saveGoal.mock.calls[0]![0]).toMatchObject({ targetPages: 124 });
    expect(reload).toHaveBeenCalled();
  });

  it("marks the Juz the user has already memorized", async () => {
    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());

    // 38 pages memorized covers Juz 30 (23) but not Juz 1 (44).
    expect(screen.getAllByRole("option")[1]!.textContent).toMatch(/already memorized/);
    expect(screen.getAllByRole("option")[2]!.textContent).not.toMatch(/already memorized/);
  });

  it("cannot be saved without a date", async () => {
    const user = userEvent.setup();
    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());

    await user.selectOptions(picker(), "6");

    // A target with no date is not a goal PHOS could measure anything
    // against.
    expect(screen.getByRole("button", { name: /Set goal/ })).toBeDisabled();
  });

  it("cannot be saved without a Juz", async () => {
    const user = userEvent.setup();
    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());

    await user.type(screen.getByLabelText("Goal date"), "2029-03-01");

    expect(screen.getByRole("button", { name: /Set goal/ })).toBeDisabled();
  });

  it("preselects the Juz matching a goal that was already set", async () => {
    useSettings.mockReturnValue({
      settings: { ...SETTINGS, goal: { targetPages: 124, targetDate: "2029-03-01T00:00:00.000Z" } },
      ready: true,
      reload,
    });

    render(<GoalSettings />);

    expect(await screen.findByText("Juz 30, 1, 2, 3, 4, 5 — 124 pages")).toBeInTheDocument();
  });

  it("says so rather than snapping a stored goal that is not a whole Juz", async () => {
    // Goals set before this picker existed can hold any page count.
    // Quietly rounding one to the nearest Juz would change the user's
    // goal without being asked.
    useSettings.mockReturnValue({
      settings: { ...SETTINGS, goal: { targetPages: 300, targetDate: "2029-03-01T00:00:00.000Z" } },
      ready: true,
      reload,
    });

    render(<GoalSettings />);

    expect(await screen.findByText(/300 pages, which is not a whole Juz/)).toBeInTheDocument();
  });

  it("offers removal only when a goal exists, and clears it", async () => {
    const user = userEvent.setup();
    useSettings.mockReturnValue({
      settings: { ...SETTINGS, goal: { targetPages: 604, targetDate: "2029-03-01T00:00:00.000Z" } },
      ready: true,
      reload,
    });

    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Remove goal" }));

    await waitFor(() => expect(saveGoal).toHaveBeenCalledWith(null));
  });

  it("stays usable when the memorization order cannot be read", async () => {
    // A failed load must not leave a dead form with no explanation.
    getGoalPosition.mockRejectedValue(new Error("boom"));

    render(<GoalSettings />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not load your memorization/);
  });

  it("says plainly that a goal changes nothing about scheduling", async () => {
    render(<GoalSettings />);
    await waitFor(() => expect(picker()).toBeEnabled());

    // Guards against the feature drifting into something that feels
    // required.
    expect(screen.getByText(/schedules the same way with or without a goal/)).toBeInTheDocument();
  });
});
