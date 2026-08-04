"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const DialogContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

/** Ids linking a dialog to its title and description for assistive technology. */
const DIALOG_TITLE_ID = "dialog-title";
const DIALOG_DESCRIPTION_ID = "dialog-description";

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within Dialog");
  return context;
}

const Dialog = ({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = (value: boolean) => {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>{children}</DialogContext.Provider>
  );
};

const DialogTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
  const { setOpen } = useDialog();
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, { onClick: () => setOpen(true) });
  }
  return <button onClick={() => setOpen(true)}>{children}</button>;
};

/**
 * The dialog panel.
 *
 * Hardened in Phase 7 for accessibility, since every destructive
 * confirmation in PHOS goes through it:
 *
 * - Announced as a modal (`role="dialog"`, `aria-modal`), labelled by
 *   its own title and description via `DialogTitle`/`DialogDescription`.
 * - Focus moves into the panel on open and returns to whatever was
 *   focused before on close, so keyboard users are not dropped back at
 *   the top of the document.
 * - Tab is trapped inside the panel while it is open. Without that, a
 *   keyboard user can tab into the page behind a modal that is visually
 *   blocking it.
 * - `onPointerDownOutside` is now honoured. It was previously accepted
 *   and ignored, which mattered: a click on the backdrop dismissed the
 *   dialog even mid-operation.
 */
const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Called when the backdrop is clicked. Call `preventDefault()` to keep the dialog open. */
    onPointerDownOutside?: (event: React.PointerEvent) => void;
  }
>(({ className, children, onPointerDownOutside, ...props }, ref) => {
  const { open, setOpen } = useDialog();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  React.useImperativeHandle(ref, () => contentRef.current!);

  /**
   * The latest `setOpen`, read through a ref so the effect below can
   * depend on `open` alone.
   *
   * `setOpen` is rebuilt on every render of `Dialog`, and most callers
   * pass an inline arrow as `onOpenChange`, so its identity changes
   * constantly. With `setOpen` in the dependency array the effect
   * re-ran on *every* render — including the one caused by typing a
   * single character into a dialog's own input. Its cleanup restored
   * focus to whatever opened the dialog and its body then focused the
   * panel, so focus was yanked out of the field after the first
   * keystroke.
   *
   * That made the typed "DELETE" confirmation impossible to satisfy:
   * the field could never hold more than one character, so the confirm
   * button could never enable. Found by `tests/ui/confirmation-dialog.
   * test.tsx`, which types the whole phrase the way a user does.
   *
   * Depending on `open` alone is also what the behaviour was always
   * meant to be — focus moves in once when the dialog opens and returns
   * once when it closes, not on every keystroke.
   */
  const setOpenRef = React.useRef(setOpen);
  React.useEffect(() => {
    setOpenRef.current = setOpen;
  });

  React.useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Focus the panel itself rather than its first control: reading the
    // title before acting matters more here than saving one Tab press,
    // especially on a destructive confirmation.
    contentRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenRef.current(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = contentRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
    // `setOpen` is deliberately absent — see `setOpenRef` above.
  }, [open]);

  if (!open) return null;

  const handleBackdropPointerDown = (event: React.PointerEvent) => {
    onPointerDownOutside?.(event);
    if (event.defaultPrevented) return;
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/80"
        aria-hidden="true"
        onPointerDown={handleBackdropPointerDown}
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={DIALOG_TITLE_ID}
        aria-describedby={DIALOG_DESCRIPTION_ID}
        tabIndex={-1}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border bg-background p-6 shadow-lg focus:outline-none sm:rounded-lg",
          className,
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/**
 * The dialog's accessible name. The fixed id is what
 * `DialogContent`'s `aria-labelledby` points at, so every dialog is
 * announced with its own title rather than as an unlabelled region.
 * PHOS shows one dialog at a time, so a constant id is unambiguous.
 */
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      id={DIALOG_TITLE_ID}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    id={DIALOG_DESCRIPTION_ID}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
