import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Import is the path a user takes when moving PHOS to a new device, and
 * the one place a file they did not create reaches their data.
 *
 * The promise the screen makes is specific: a rejected file changes
 * nothing. These tests hold that promise to the letter — a failed
 * import must leave the caches alone and must name every problem rather
 * than only the first.
 */
const reload = jest.fn();
jest.mock("@/providers/settings-provider", () => ({
  useSettings: () => ({ reload }),
}));

const importData = jest.fn();
jest.mock("@/lib/api/backup", () => ({
  importData: (...args: unknown[]) => importData(...args),
}));

const clearAllAssignments = jest.fn();
jest.mock("@/lib/api/activeSession", () => ({
  clearAllAssignments: () => clearAllAssignments(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ImportWizard } = require("@/components/backup/import-wizard") as {
  ImportWizard: React.ComponentType<{ onImported: () => void }>;
};

const onImported = jest.fn();

function exportFile(name = "phos-export.json") {
  return new File(['{"applicationVersion":"0.1.0"}'], name, { type: "application/json" });
}

beforeEach(() => {
  jest.clearAllMocks();
  importData.mockResolvedValue({ success: true, validationErrors: [], importedAt: "now" });
});

describe("choosing a file", () => {
  it("keeps the import button disabled until one is chosen", async () => {
    const user = userEvent.setup();
    render(<ImportWizard onImported={onImported} />);

    expect(screen.getByRole("button", { name: /Import Data/ })).toBeDisabled();

    await user.upload(screen.getByLabelText("Choose a PHOS export file"), exportFile());

    expect(screen.getByRole("button", { name: /Import Data/ })).toBeEnabled();
  });
});

describe("a successful import", () => {
  it("hands the engine the file, then clears caches and reloads", async () => {
    const user = userEvent.setup();
    render(<ImportWizard onImported={onImported} />);

    await user.upload(screen.getByLabelText("Choose a PHOS export file"), exportFile());
    await user.click(screen.getByRole("button", { name: /Import Data/ }));

    await waitFor(() => expect(importData).toHaveBeenCalledTimes(1));
    expect((importData.mock.calls[0]![0] as File).name).toBe("phos-export.json");

    // The imported rows describe different sessions than this browser
    // has cached, so offering to resume one would strand the user.
    await waitFor(() => expect(clearAllAssignments).toHaveBeenCalledTimes(1));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Import complete.");
  });
});

describe("a rejected import", () => {
  it("lists every problem, not just the first", async () => {
    const user = userEvent.setup();
    importData.mockResolvedValue({
      success: false,
      validationErrors: ['Missing or invalid "pages".', 'Missing or invalid "sessions".'],
      importedAt: null,
    });
    render(<ImportWizard onImported={onImported} />);

    await user.upload(screen.getByLabelText("Choose a PHOS export file"), exportFile());
    await user.click(screen.getByRole("button", { name: /Import Data/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This file was not imported. Nothing was changed.");
    expect(alert).toHaveTextContent('Missing or invalid "pages".');
    expect(alert).toHaveTextContent('Missing or invalid "sessions".');
  });

  it("changes nothing — no cache cleared, no reload, no callback", async () => {
    const user = userEvent.setup();
    importData.mockResolvedValue({
      success: false,
      validationErrors: ["File is not valid JSON."],
      importedAt: null,
    });
    render(<ImportWizard onImported={onImported} />);

    await user.upload(screen.getByLabelText("Choose a PHOS export file"), exportFile("junk.json"));
    await user.click(screen.getByRole("button", { name: /Import Data/ }));

    await screen.findByRole("alert");
    expect(clearAllAssignments).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(onImported).not.toHaveBeenCalled();
  });

  it("surfaces a thrown error rather than failing silently", async () => {
    const user = userEvent.setup();
    importData.mockRejectedValue(new Error("Applying the data failed."));
    render(<ImportWizard onImported={onImported} />);

    await user.upload(screen.getByLabelText("Choose a PHOS export file"), exportFile());
    await user.click(screen.getByRole("button", { name: /Import Data/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Applying the data failed.");
  });

  it("clears stale errors when a different file is chosen", async () => {
    const user = userEvent.setup();
    importData.mockResolvedValue({
      success: false,
      validationErrors: ["File is not valid JSON."],
      importedAt: null,
    });
    render(<ImportWizard onImported={onImported} />);

    const input = screen.getByLabelText("Choose a PHOS export file");
    await user.upload(input, exportFile("junk.json"));
    await user.click(screen.getByRole("button", { name: /Import Data/ }));
    await screen.findByRole("alert");

    await user.upload(input, exportFile("good.json"));

    // Leaving the old complaint on screen beside a newly chosen file
    // reads as though the new file were the broken one.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
