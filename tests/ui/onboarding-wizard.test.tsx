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
  pagesAlreadyMemorized: 75,
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

/** Steps are named because their order is load-bearing — see below. */
const ORDER_STEP = 1;
const AMOUNT_STEP = 2;
const PACE_STEP = 3;
const READY_STEP = 4;

describe("moving through the steps", () => {
  it("opens on the expectations screen with nowhere to go back to", () => {
    render(<OnboardingWizard onComplete={onComplete} />);

    expect(screen.getByText("1 / 5 · Welcome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back/ })).toBeDisabled();
  });

  /*
   * Order before amount, and this is the one ordering the wizard cannot
   * get wrong.
   *
   * "Three Juz" has no page count until PHOS knows *which* three, and
   * those differ by order — Juz 30, 29, 28 for someone working back from
   * the end of the Mushaf. Asked the other way round, the amount screen
   * had to refer to "your chosen order" two steps before that choice
   * existed, and the user had to convert Juz into pages unaided.
   */
  it("asks for the memorization order before asking how much is done", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, ORDER_STEP);
    expect(screen.getByText("2 / 5 · Your order")).toBeInTheDocument();
    expect(screen.getByText("Where will you begin?")).toBeInTheDocument();

    await next(user);
    expect(screen.getByText("3 / 5 · Your Hifz")).toBeInTheDocument();
    expect(screen.getByText("What do you already hold?")).toBeInTheDocument();
  });

  it("goes forward and back without losing an answer", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, AMOUNT_STEP);
    await user.click(screen.getByRole("button", { name: "Increase Complete Juz memorized" }));
    await next(user);

    expect(screen.getByText("4 / 5 · Your pace")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Back/ }));

    expect(screen.getByLabelText("Complete Juz memorized")).toHaveValue(1);
  });
});

describe("how much is already memorized", () => {
  /*
   * The reported defect: the wizard offered four choices phrased in Juz
   * ("I have memorized a few Juz"), then demanded a page count. People
   * hold their Hifz in Juz, Juz are not a uniform length, and so the
   * question could not be answered without doing arithmetic first —
   * worse still for anyone whose memorization is not one contiguous run.
   */
  it("asks in Juz, which is the unit people actually know", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, AMOUNT_STEP);

    expect(screen.getByLabelText("Complete Juz memorized")).toHaveValue(0);
    expect(screen.getByLabelText("Extra pages into the next Juz")).toHaveValue(0);
    expect(screen.queryByLabelText("Pages already memorized")).not.toBeInTheDocument();
  });

  it("converts the Juz answer to pages and shows its working", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, AMOUNT_STEP);
    await user.click(screen.getByRole("button", { name: "Increase Complete Juz memorized" }));

    // The user never has to work out that three Juz is 75 pages.
    expect(await screen.findByText(/75 pages/)).toBeInTheDocument();
    expect(screen.getByText(/Pages 1–52/)).toBeInTheDocument();
    expect(screen.getByText(/Next new page: 53/)).toBeInTheDocument();
  });

  it("asks for the preview using the order and the Juz the user actually chose", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, AMOUNT_STEP);
    await user.click(screen.getByRole("button", { name: "Increase Complete Juz memorized" }));
    await user.click(
      screen.getByRole("button", { name: "Increase Extra pages into the next Juz" }),
    );

    // A preview built from different answers than the ones being saved
    // would be worse than no preview at all.
    await waitFor(() => expect(previewOnboarding).toHaveBeenCalledWith("Standard", 1, 1));
  });

  it("shows nothing when the user has memorized nothing yet", async () => {
    const user = userEvent.setup();
    previewOnboarding.mockResolvedValue({ ...PREVIEW, pagesAlreadyMemorized: 0 });
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, AMOUNT_STEP);

    expect(screen.queryByText(/That comes to/)).not.toBeInTheDocument();
  });
});

describe("the pace question", () => {
  it("records a fraction of a page a day without ever showing one", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, PACE_STEP);

    // Asking for "0.5 pages per day" is not how anyone describes their
    // own memorization.
    await user.click(screen.getByRole("button", { name: "A page every 2 days" }));
    expect(screen.getByRole("button", { name: "A page every 2 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await next(user);
    await user.click(screen.getByRole("button", { name: "Start using PHOS" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    expect(completeOnboarding.mock.calls[0]![0]).toMatchObject({ comfortableDailyPages: 0.5 });
  });
});

describe("finishing", () => {
  it("saves every answer the user gave", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, AMOUNT_STEP);
    await user.click(screen.getByRole("button", { name: "Increase Complete Juz memorized" }));
    await goToStep(user, READY_STEP - AMOUNT_STEP);
    await user.click(screen.getByRole("button", { name: "Start using PHOS" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));

    /*
     * The Juz answer is sent as a Juz answer. The page count is derived
     * by the operation from the same sequence that seeds the pages, so
     * the screen's promise and the write cannot disagree — a conversion
     * done here would be a second implementation of that rule.
     */
    expect(completeOnboarding.mock.calls[0]![0]).toMatchObject({
      memorizationOrder: "Standard",
      juzAlreadyMemorized: 1,
      extraPagesMemorized: 0,
      dailyAvailableMinutes: 30,
      revisionStartsImmediately: true,
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("never blocks finishing when the preview cannot be built", async () => {
    const user = userEvent.setup();
    previewOnboarding.mockRejectedValue(new Error("engine unavailable"));
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, READY_STEP);
    await user.click(screen.getByRole("button", { name: "Start using PHOS" }));

    // The preview explains the answer rather than producing it. Losing
    // it must never cost the user their setup.
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("tells the user what went wrong and lets them try again", async () => {
    const user = userEvent.setup();
    completeOnboarding.mockRejectedValue(new Error("Storage is full."));
    render(<OnboardingWizard onComplete={onComplete} />);

    await goToStep(user, READY_STEP);
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

    await goToStep(user, READY_STEP);

    // Someone who never opens About should still learn that their
    // record is device-local and what would erase it.
    expect(screen.getByText("Your progress stays on this device")).toBeInTheDocument();
    expect(screen.getByText(/Clearing this browser's data would erase it/)).toBeInTheDocument();
  });
});
