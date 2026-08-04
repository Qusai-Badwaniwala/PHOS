import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";

/**
 * Every destructive action in PHOS goes through this dialog, so it is
 * the single component where a defect costs a user their Hifz record
 * rather than a bad layout.
 *
 * Two things are load-bearing and neither is visible in a screenshot:
 * the typed phrase must actually gate the confirm button, and the
 * dialog must not be dismissable while the action it started is still
 * running.
 */
function ControlledDialog(props: Partial<React.ComponentProps<typeof ConfirmationDialog>> = {}) {
  const [open, setOpen] = React.useState(true);
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete All Data"
      description="This erases every session and recall record."
      confirmLabel="Delete"
      onConfirm={() => undefined}
      {...props}
    />
  );
}

describe("the typed confirmation", () => {
  it("keeps the confirm button disabled until the phrase matches exactly", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<ControlledDialog requireTypedConfirmation="DELETE" onConfirm={onConfirm} />);

    const confirm = screen.getByRole("button", { name: "Delete" });
    const field = screen.getByLabelText("Type DELETE to confirm");

    expect(confirm).toBeDisabled();

    await user.type(field, "DELET");
    expect(confirm).toBeDisabled();

    await user.type(field, "E");
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("is case-sensitive, so 'delete' is not enough", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog requireTypedConfirmation="DELETE" />);

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "delete");

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("forgets the typed phrase when the dialog closes, so reopening starts unconfirmed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ConfirmationDialog
        open
        onOpenChange={() => undefined}
        title="Delete All Data"
        description="…"
        confirmLabel="Delete"
        requireTypedConfirmation="DELETE"
        onConfirm={() => undefined}
      />,
    );

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();

    const props = {
      title: "Delete All Data",
      description: "…",
      confirmLabel: "Delete",
      requireTypedConfirmation: "DELETE",
      onConfirm: () => undefined,
      onOpenChange: () => undefined,
    };
    rerender(<ConfirmationDialog {...props} open={false} />);
    rerender(<ConfirmationDialog {...props} open />);

    // A dialog that reopened already armed would turn a stray double
    // click into a deletion.
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("needs no typing when no phrase is required", () => {
    render(<ControlledDialog confirmLabel="Reset" />);

    expect(screen.queryByLabelText(/to confirm$/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
  });
});

describe("while the action is running", () => {
  it("disables both buttons and the field", () => {
    render(
      <ControlledDialog
        requireTypedConfirmation="DELETE"
        pending
        pendingLabel="Deleting your data…"
      />,
    );

    expect(screen.getByRole("button", { name: "Deleting your data…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByLabelText("Type DELETE to confirm")).toBeDisabled();
  });

  it("survives a click on the backdrop", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog pending pendingLabel="Deleting your data…" />);

    // The work continues whether or not the dialog is visible, so
    // hiding it mid-delete would leave the user with no idea whether
    // their data still exists.
    await user.click(document.querySelector(".bg-black\\/80")!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on a backdrop click when idle", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);

    await user.click(document.querySelector(".bg-black\\/80")!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("failure", () => {
  it("stays open and announces the reason", () => {
    render(<ControlledDialog errorMessage="Backup failed; nothing was deleted." />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Backup failed; nothing was deleted.");
  });
});
