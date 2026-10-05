import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BackupEntryDTO } from "@/types/dto";

/**
 * Restoring replaces everything the user has. The guarantees that make
 * that acceptable — a safety copy taken first, and nothing happening
 * until a backup is actually chosen and confirmed — live in this
 * component, not in the engine.
 */
const reload = jest.fn();
jest.mock("@/providers/settings-provider", () => ({
  useSettings: () => ({ reload }),
}));

const restoreBackup = jest.fn();
jest.mock("@/lib/api/backup", () => ({
  restoreBackup: (...args: unknown[]) => restoreBackup(...args),
}));

const clearAllAssignments = jest.fn();
jest.mock("@/lib/api/activeSession", () => ({
  clearAllAssignments: () => clearAllAssignments(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RestoreWizard } = require("@/components/backup/restore-wizard") as {
  RestoreWizard: React.ComponentType<{ entries?: BackupEntryDTO[]; onRestored: () => void }>;
};

const ENTRIES: BackupEntryDTO[] = [
  { id: "newest", date: "08/04/2026 9:00 AM", type: "manual", size: "239 KB", status: "success" },
  { id: "older", date: "08/01/2026 9:00 AM", type: "manual", size: "230 KB", status: "success" },
];

const onRestored = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  restoreBackup.mockResolvedValue({
    restoredFromBackupId: "newest",
    safetyBackupId: "safety-1",
    verified: true,
    completedAt: new Date().toISOString(),
  });
});

async function chooseBackup(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByRole("option", { name: label }));
}

describe("with no backups yet", () => {
  it("says so instead of offering an empty picker", () => {
    render(<RestoreWizard entries={[]} onRestored={onRestored} />);

    expect(screen.getByText("No backups to restore from")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restore Backup/ })).not.toBeInTheDocument();
  });
});

describe("choosing a backup", () => {
  it("keeps the restore button disabled until one is chosen", async () => {
    const user = userEvent.setup();
    render(<RestoreWizard entries={ENTRIES} onRestored={onRestored} />);

    expect(screen.getByRole("button", { name: /Restore Backup/ })).toBeDisabled();

    await chooseBackup(user, "08/04/2026 9:00 AM · 239 KB");

    expect(screen.getByRole("button", { name: /Restore Backup/ })).toBeEnabled();
  });

  it("warns that current data will be replaced, before anything is clicked", async () => {
    const user = userEvent.setup();
    render(<RestoreWizard entries={ENTRIES} onRestored={onRestored} />);

    await chooseBackup(user, "08/04/2026 9:00 AM · 239 KB");

    expect(
      screen.getByText(/Restoring replaces all current data with the backup contents/),
    ).toBeInTheDocument();
  });
});

describe("confirming the restore", () => {
  it("restores the chosen backup and reports the safety copy", async () => {
    const user = userEvent.setup();
    render(<RestoreWizard entries={ENTRIES} onRestored={onRestored} />);

    await chooseBackup(user, "08/01/2026 9:00 AM · 230 KB");
    await user.click(screen.getByRole("button", { name: /Restore Backup/ }));
    await user.click(screen.getByRole("button", { name: "Restore" }));

    // The id matters: restoring the wrong backup is silent data loss.
    await waitFor(() => expect(restoreBackup).toHaveBeenCalledWith("older"));

    const outcome = await screen.findByRole("status");
    expect(outcome).toHaveTextContent("08/01/2026 9:00 AM");
    expect(outcome).toHaveTextContent(/safety copy of the previous database was saved first/i);
    expect(onRestored).toHaveBeenCalledTimes(1);
  });

  it("drops cached assignments and reloads settings, because both now describe the old data", async () => {
    const user = userEvent.setup();
    render(<RestoreWizard entries={ENTRIES} onRestored={onRestored} />);

    await chooseBackup(user, "08/04/2026 9:00 AM · 239 KB");
    await user.click(screen.getByRole("button", { name: /Restore Backup/ }));
    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(clearAllAssignments).toHaveBeenCalledTimes(1));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does nothing if the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<RestoreWizard entries={ENTRIES} onRestored={onRestored} />);

    await chooseBackup(user, "08/04/2026 9:00 AM · 239 KB");
    await user.click(screen.getByRole("button", { name: /Restore Backup/ }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and explains a failed restore", async () => {
    const user = userEvent.setup();
    restoreBackup.mockRejectedValue(new Error("Backup failed integrity verification."));
    render(<RestoreWizard entries={ENTRIES} onRestored={onRestored} />);

    await chooseBackup(user, "08/04/2026 9:00 AM · 239 KB");
    await user.click(screen.getByRole("button", { name: /Restore Backup/ }));
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Backup failed integrity verification.",
    );
    // Nothing was replaced, so the caches must not be cleared either.
    expect(clearAllAssignments).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
  });
});
