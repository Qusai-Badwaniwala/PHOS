import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * PHOS's dialog is hand-written rather than taken from a library, so
 * the accessibility behaviour a library would have supplied is this
 * component's own responsibility — and none of it is visible on screen.
 *
 * `onPointerDownOutside` in particular was accepted and silently
 * ignored before Phase 7, which meant a stray backdrop click dismissed
 * a confirmation mid-operation.
 */
function Fixture({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = React.useState(true);
  return (
    <>
      <button>outside the dialog</button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this backup?</DialogTitle>
            <DialogDescription>Your current data will be replaced.</DialogDescription>
          </DialogHeader>
          <button>first</button>
          <button>second</button>
        </DialogContent>
      </Dialog>
    </>
  );
}

describe("how the dialog is announced", () => {
  it("is a modal labelled by its own title and description", () => {
    render(<Fixture />);

    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveAttribute("aria-modal", "true");
    // Announced with its own title rather than as an unlabelled region.
    expect(dialog).toHaveAccessibleName("Restore this backup?");
    expect(dialog).toHaveAccessibleDescription("Your current data will be replaced.");
  });

  it("moves focus into the panel on open", () => {
    render(<Fixture />);

    // The panel itself, not its first control: on a destructive
    // confirmation, reading the title matters more than saving a Tab.
    expect(screen.getByRole("dialog")).toHaveFocus();
  });
});

describe("keyboard handling", () => {
  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    render(<Fixture onOpenChange={onOpenChange} />);

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("traps Tab inside the panel", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    const first = screen.getByRole("button", { name: "first" });
    const close = screen.getByRole("button", { name: "Close" });

    // Close is last in the DOM, so tabbing on from it must wrap to the
    // first control rather than escaping to the page behind the modal.
    close.focus();
    await user.tab();
    expect(first).toHaveFocus();

    // And back again in reverse.
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
  });

  it("returns focus to whatever was focused before it opened", async () => {
    const user = userEvent.setup();
    const outside = document.createElement("button");
    outside.textContent = "opener";
    document.body.appendChild(outside);
    outside.focus();

    render(<Fixture />);
    await user.keyboard("{Escape}");

    // A keyboard user closing a dialog must not be dropped back at the
    // top of the document.
    expect(outside).toHaveFocus();
    outside.remove();
  });
});

describe("dismissal", () => {
  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(document.querySelector(".bg-black\\/80")!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open when the handler calls preventDefault", async () => {
    const user = userEvent.setup();

    function Guarded() {
      const [open, setOpen] = React.useState(true);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent onPointerDownOutside={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Busy</DialogTitle>
              <DialogDescription>Working…</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    }

    render(<Guarded />);
    await user.click(document.querySelector(".bg-black\\/80")!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes from the X button", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
