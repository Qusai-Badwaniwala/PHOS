import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const reload = jest.fn();
const previewImport = jest.fn();
const importData = jest.fn();
const clearAllAssignments = jest.fn();
const onImported = jest.fn();
jest.mock("@/providers/settings-provider", () => ({ useSettings: () => ({ reload }) }));
jest.mock("@/lib/api/backup", () => ({
  previewImport: (...args: unknown[]) => previewImport(...args),
  importData: (...args: unknown[]) => importData(...args),
}));
jest.mock("@/lib/api/activeSession", () => ({ clearAllAssignments: () => clearAllAssignments() }));
import { ImportWizard } from "@/components/backup/import-wizard";
const valid = {
  valid: true,
  errors: [],
  warnings: [],
  exportedAt: null,
  learnedPages: 23,
  sessions: 2,
  recalls: 16,
  exams: 1,
  openSessions: 0,
};
const file = () => new File(["{}"], "phos-export.json", { type: "application/json" });
beforeEach(() => {
  jest.clearAllMocks();
  previewImport.mockResolvedValue(valid);
  importData.mockResolvedValue({ success: true, validationErrors: [], safetyBackupId: "safety-1" });
});
async function choose(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText("Choose a PHOS export file"), file());
  await screen.findByRole("button", { name: "Review full restore" });
}
async function confirm(user: ReturnType<typeof userEvent.setup>) {
  await choose(user);
  await user.click(screen.getByRole("button", { name: "Review full restore" }));
  await user.click(screen.getByRole("button", { name: "Restore this record" }));
}
it("offers no restore before the complete file has been checked", () => {
  render(<ImportWizard onImported={onImported} />);
  expect(screen.queryByRole("button", { name: "Review full restore" })).not.toBeInTheDocument();
});
it("previews the record and does not mutate it before explicit confirmation", async () => {
  const user = userEvent.setup();
  render(<ImportWizard onImported={onImported} />);
  await choose(user);
  expect(screen.getByText("23")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Review full restore" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("histories are not merged");
  await user.click(screen.getByRole("button", { name: "Keep current record" }));
  expect(importData).not.toHaveBeenCalled();
});
it("restores the chosen file, clears stale assignments and publishes the safety copy", async () => {
  const user = userEvent.setup();
  render(<ImportWizard onImported={onImported} />);
  await confirm(user);
  await waitFor(() =>
    expect(importData).toHaveBeenCalledWith(expect.objectContaining({ name: "phos-export.json" })),
  );
  expect(clearAllAssignments).toHaveBeenCalledTimes(1);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(onImported).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole("status")).toHaveTextContent("verified safety copy");
});
it("lists every preview problem without changing the record", async () => {
  previewImport.mockResolvedValue({
    ...valid,
    valid: false,
    errors: ["Missing pages", "Broken references"],
  });
  const user = userEvent.setup();
  render(<ImportWizard onImported={onImported} />);
  await user.upload(screen.getByLabelText("Choose a PHOS export file"), file());
  expect(await screen.findByRole("alert")).toHaveTextContent("Missing pages");
  expect(screen.getByRole("alert")).toHaveTextContent("Broken references");
  expect(importData).not.toHaveBeenCalled();
  expect(clearAllAssignments).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});
it("reports a refused apply without clearing assignments or reloading", async () => {
  importData.mockResolvedValue({ success: false, validationErrors: ["Checksum changed"] });
  const user = userEvent.setup();
  render(<ImportWizard onImported={onImported} />);
  await confirm(user);
  expect(await screen.findByRole("alert")).toHaveTextContent("Checksum changed");
  expect(clearAllAssignments).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});
it("surfaces a storage failure without a success message", async () => {
  importData.mockRejectedValue(new Error("Storage full; replacement rolled back"));
  const user = userEvent.setup();
  render(<ImportWizard onImported={onImported} />);
  await confirm(user);
  expect(await screen.findByRole("alert")).toHaveTextContent("Storage full");
  expect(onImported).not.toHaveBeenCalled();
});
it("clears a rejected preview when a different file is checked", async () => {
  previewImport.mockResolvedValueOnce({ ...valid, valid: false, errors: ["Broken file"] });
  const user = userEvent.setup();
  render(<ImportWizard onImported={onImported} />);
  await user.upload(screen.getByLabelText("Choose a PHOS export file"), file());
  await screen.findByRole("alert");
  await choose(user);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
