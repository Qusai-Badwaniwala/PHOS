import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The first-run wizard is the only screen every PHOS user is guaranteed
 * to see, and the only place their answers are turned into seeded
 * memorization. An answer mis-collected here is not a cosmetic problem:
 * it decides which pages PHOS believes the user already knows.
 */
const completeOnboarding = jest.fn();
const previewOnboarding = jest.fn();
jest.mock("@/lib/api/settings", () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
  previewOnboarding: (...args: unknown[]) => previewOnboarding(...args),
}));

// The install guide reads browser capabilities that jsdom does not
// model; it has nothing to do with collecting answers.
jest.mock("@/components/shared/install-guide", () => ({
  InstallGuide: () => null,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OnboardingWizard } = require("@/components/onboarding/onboarding-wizard") as {
  OnboardingWizard: React.ComponentType<{ onComplete: () => void }>;
};

const PREVIEW = {
  ranges: [
    { start: 1, end: 52 },
    { start: 582, end: 604 },
  ],
  juzCovered: [1, 2, 3, 30],
  nextPage: { pageNumber: 53, juzNumber: 3, surah: "Aal-Imran", surahArabic: "آل عمران" },
};

const onComplete = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  previewOnboarding.mockResolvedValue(PREVIEW);
  completeOnboarding.mockResolvedValue({ seededPages: 75 });
});

type User = ReturnType<typeof userEvent.setup>;

async function next(user: User) {
  await user.click(screen.getByRole("button", { name: /Get started|Continue/ }));
}

/** Walks to the given step index, accepting whatever defaults are set. */
async function goToStep(user: User, target: number) {
  for (let step = 0; step < target; step += 1) await next(user);
}

describe("moving through the steps", () => {
  it("opens on the expectations screen with nowhere to go back to", () => {
    render(<OnboardingWizard onComplete={onComplete} />);

    expect(screen.getByText("Step 1 of 5 · Welcome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back/ })).toBeDisabled();
  });

  it("goes forward and back without losing an answer", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 1);
    await user.click(screen.getByRole("button", { name: "I have memorized a few Juz" }));
    await next(user);

    expect(screen.getByText("Step 3 of 5 · Your pace")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Back/ }));

    expect(screen.getByRole("button", { name: "I have memorized a few Juz" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("choosing a level", () => {
  it("moves the numeric estimates with it, so most users can accept the defaults", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 1);

    expect(screen.getByLabelText("Pages already memorized")).toHaveValue(0);

    await user.click(screen.getByRole("button", { name: "I am a Hafiz, maintaining my Hifz" }));

    // Requirement 1 asks for setup in "only a few minutes"; a Hafiz
    // should not have to press + 604 times.
    expect(screen.getByLabelText("Pages already memorized")).toHaveValue(604);
  });
});

describe("the pace question", () => {
  it("records a fraction of a page a day without ever showing one", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 2);

    // Asking for "0.5 pages per day" is not how anyone describes their
    // own memorization.
    await user.click(screen.getByRole("button", { name: "A page every 2 days" }));
    expect(screen.getByRole("button", { name: "A page every 2 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await goToStep(user, 2);
    await user.click(screen.getByRole("button", { name: "Start using PHOS" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    expect(completeOnboarding.mock.calls[0]![0]).toMatchObject({ comfortableDailyPages: 0.5 });
  });
});

describe("the preview of what will be recorded", () => {
  /*
   * This panel exists because the outcome genuinely surprises people: a
   * user who picks "Juz 30 first" and reports 75 memorized pages is
   * told their next new page is 53, which is correct but looks like a
   * bug if nothing explains it.
   *
   * It is therefore only useful if it appears while the user is still
   * on the screen where they choose the order.
   */
  it("appears on the order step, without having to leave and come back", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 1);
    await user.click(screen.getByRole("button", { name: "I have memorized a few Juz" }));
    await goToStep(user, 2);

    expect(screen.getByText("Step 4 of 5 · Your order")).toBeInTheDocument();
    expect(await screen.findByText("What PHOS will record from your answers")).toBeInTheDocument();
    expect(screen.getByText(/pages 1–52/)).toBeInTheDocument();
    expect(screen.getByText(/page 53/)).toBeInTheDocument();
  });

  it("asks for the preview using the order and page count the user actually chose", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 1);
    await user.click(screen.getByRole("button", { name: "I have memorized a few Juz" }));
    await goToStep(user, 2);

    // A preview built from different answers than the ones being saved
    // would be worse than no preview at all.
    await waitFor(() => expect(previewOnboarding).toHaveBeenCalledWith("Standard", 100));
  });

  it("shows nothing when the user has memorized nothing yet", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 3);

    expect(screen.queryByText("What PHOS will record from your answers")).not.toBeInTheDocument();
  });

  it("never blocks finishing when it cannot be built", async () => {
    const user = userEvent.setup();
    previewOnboarding.mockRejectedValue(new Error("engine unavailable"));
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 4);
    await user.click(screen.getByRole("button", { name: "Start using PHOS" }));

    // The preview is an explanation. Losing it must never cost the user
    // their setup.
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });
});

describe("finishing", () => {
  it("saves every answer the user gave", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 1);
    await user.click(screen.getByRole("button", { name: "I have memorized several Juz" }));
    await goToStep(user, 3);
    await user.click(screen.getByRole("button", { name: "Start using PHOS" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    expect(completeOnboarding.mock.calls[0]![0]).toMatchObject({
      memorizationLevel: "Advanced",
      memorizationOrder: "Standard",
      pagesAlreadyMemorized: 300,
      dailyAvailableMinutes: 60,
      revisionStartsImmediately: true,
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("tells the user what went wrong and lets them try again", async () => {
    const user = userEvent.setup();
    completeOnboarding.mockRejectedValue(new Error("Storage is full."));
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 4);
    await user.click(screen.getByRole("button", { name: "Start using PHOS" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Storage is full.");
    // Left stuck on a disabled button, the user would have no way out
    // of setup at all.
    expect(screen.getByRole("button", { name: "Start using PHOS" })).toBeEnabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("says where the data will live before the user commits to it", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, 4);

    // Someone who never opens About should still learn that their
    // record is device-local and what would erase it.
    expect(screen.getByText("Your progress stays on this device")).toBeInTheDocument();
    expect(screen.getByText(/Clearing this browser's data would erase it/)).toBeInTheDocument();
  });
});
