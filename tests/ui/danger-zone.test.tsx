import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The Danger Zone is the only screen in PHOS that can destroy a user's
 * Hifz record, and the two actions on it differ in kind rather than in
 * degree — "Reset preferences" touches no memorization data at all, while
 * "Delete Local Data" erases every session and recall.
 *
 * These tests exist to hold that difference in place: the settings
 * reset must stay one click away, and the deletion must stay behind a
 * typed phrase and never be reachable without it.
 */
const reload = jest.fn();
jest.mock("@/providers/settings-provider", () => ({
  useSettings: () => ({ reload }),
}));

const resetAllData = jest.fn();
const resetSettings = jest.fn();
const resetApplication = jest.fn();
const returnToOnboarding = jest.fn();
jest.mock("@/lib/record-change", () => ({ returnToOnboarding: () => returnToOnboarding() }));
jest.mock("@/lib/api/settings", () => ({
  DATA_RESET_CONFIRMATION: "DELETE",
  APPLICATION_RESET_CONFIRMATION: "RESET PHOS",
  resetApplication: (...args: unknown[]) => resetApplication(...args),
  resetAllData: (...args: unknown[]) => resetAllData(...args),
  resetSettings: (...args: unknown[]) => resetSettings(...args),
}));

const clearAllAssignments = jest.fn();
jest.mock("@/lib/api/activeSession", () => ({
  clearAllAssignments: () => clearAllAssignments(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DangerZone } = require("@/components/settings/danger-zone") as {
  DangerZone: React.ComponentType;
};

const RESET_SUMMARY = {
  safetyBackupId: "backup-1",
  deletedRecallEvents: 12,
  deletedSessions: 3,
  resetPages: 604,
  completedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  resetAllData.mockResolvedValue(RESET_SUMMARY);
  resetSettings.mockResolvedValue({});
});

describe("resetting settings", () => {
  it("needs a confirmation but no typed phrase, and leaves memorization data alone", async () => {
    const user = userEvent.setup();
    render(<DangerZone />);

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Reset preferences");
    // Non-destructive, so no phrase to type: the two actions are meant
    // to feel different, not merely to differ in wording.
    expect(screen.queryByLabelText(/to confirm$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset preferences" }));

    await waitFor(() => expect(resetSettings).toHaveBeenCalledTimes(1));
    expect(resetAllData).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Appearance, format and study preferences have been restored to their defaults.",
    );
  });
});

describe("deleting all data", () => {
  it("cannot be confirmed until the phrase is typed in full", async () => {
    const user = userEvent.setup();
    render(<DangerZone />);

    await user.click(screen.getByRole("button", { name: "Reset progress" }));

    const confirm = screen.getByRole("button", { name: "Clear progress" });
    expect(confirm).toBeDisabled();

    // Typing the whole phrase is the case that was broken until the
    // dialog's focus effect was fixed: focus left the field after the
    // first character, so the button could never enable.
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");

    expect(confirm).toBeEnabled();
    expect(resetAllData).not.toHaveBeenCalled();
  });

  it("reports exactly what was removed and that a backup exists", async () => {
    const user = userEvent.setup();
    render(<DangerZone />);

    await user.click(screen.getByRole("button", { name: "Reset progress" }));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Clear progress" }));

    await waitFor(() => expect(resetAllData).toHaveBeenCalledTimes(1));

    // A vague "done" would leave the user unable to tell whether the
    // right thing happened.
    const outcome = await screen.findByRole("status");
    expect(outcome).toHaveTextContent("12 recall record(s)");
    expect(outcome).toHaveTextContent("3 session(s)");
    expect(outcome).toHaveTextContent("reset 604 pages");
    expect(outcome).toHaveTextContent(/backup was taken first/i);
  });

  it("forgets the cached session assignments, so nothing offers to resume deleted work", async () => {
    const user = userEvent.setup();
    render(<DangerZone />);

    await user.click(screen.getByRole("button", { name: "Reset progress" }));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Clear progress" }));

    await waitFor(() => expect(clearAllAssignments).toHaveBeenCalledTimes(1));
  });

  it("keeps the dialog open and explains itself when the delete fails", async () => {
    const user = userEvent.setup();
    resetAllData.mockRejectedValue(new Error("Refusing to delete: backup could not be verified."));
    render(<DangerZone />);

    await user.click(screen.getByRole("button", { name: "Reset progress" }));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Clear progress" }));

    // Closing on failure would leave the user believing their data was
    // deleted when it was not.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Refusing to delete: backup could not be verified.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(clearAllAssignments).not.toHaveBeenCalled();
  });

  it("does nothing at all if the dialog is cancelled", async () => {
    const user = userEvent.setup();
    render(<DangerZone />);

    await user.click(screen.getByRole("button", { name: "Reset progress" }));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(resetAllData).not.toHaveBeenCalled();
  });
});

describe("starting PHOS fresh", () => {
  it("requires its own exact phrase before erasing local restore points", async () => {
    const user = userEvent.setup();
    render(<DangerZone />);
    await user.click(screen.getByRole("button", { name: "Reset PHOS" }));
    const confirm = screen.getByRole("button", { name: "Erase PHOS and start fresh" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Type RESET PHOS to confirm"), "DELETE");
    expect(confirm).toBeDisabled();
    await user.clear(screen.getByLabelText("Type RESET PHOS to confirm"));
    await user.type(screen.getByLabelText("Type RESET PHOS to confirm"), "RESET PHOS");
    await user.click(confirm);
    await waitFor(() => expect(resetApplication).toHaveBeenCalledWith("RESET PHOS"));
    expect(resetAllData).not.toHaveBeenCalled();
    expect(returnToOnboarding).toHaveBeenCalledTimes(1);
  });
  it("keeps the record and dialog visible on a failed reset", async () => {
    resetApplication.mockRejectedValueOnce(new Error("Storage unavailable. Your record was kept."));
    const user = userEvent.setup();
    render(<DangerZone />);
    await user.click(screen.getByRole("button", { name: "Reset PHOS" }));
    await user.type(screen.getByLabelText("Type RESET PHOS to confirm"), "RESET PHOS");
    await user.click(screen.getByRole("button", { name: "Erase PHOS and start fresh" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your record was kept");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(returnToOnboarding).not.toHaveBeenCalled();
  });
});
