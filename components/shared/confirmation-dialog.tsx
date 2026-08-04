"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  /**
   * When set, the user must type this exact phrase before the confirm
   * button becomes usable. Reserved for irreversible actions, where a
   * single misplaced click should not be enough.
   */
  requireTypedConfirmation?: string;
  /** Disables the controls and shows `pendingLabel` while the action runs. */
  pending?: boolean;
  pendingLabel?: string;
  /** Message shown inside the dialog when the action fails, so the dialog can stay open. */
  errorMessage?: string | null;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive = false,
  requireTypedConfirmation,
  pending = false,
  pendingLabel,
  errorMessage,
}: ConfirmationDialogProps) {
  const [typed, setTyped] = React.useState("");

  // Clear the typed phrase whenever the dialog closes, so reopening it
  // never starts out already confirmed.
  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const confirmationSatisfied =
    requireTypedConfirmation === undefined || typed === requireTypedConfirmation;

  return (
    <Dialog open={open} onOpenChange={pending ? () => undefined : onOpenChange}>
      <DialogContent
        // A backdrop click must not dismiss a confirmation whose action
        // is already running — the work continues either way, and
        // hiding it would leave the user with no idea whether their
        // data was deleted.
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireTypedConfirmation !== undefined && (
          <div className="space-y-2">
            <label htmlFor="confirmation-phrase" className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">{requireTypedConfirmation}</span>{" "}
              to confirm.
            </label>
            <Input
              id="confirmation-phrase"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={pending}
              autoComplete="off"
              aria-label={`Type ${requireTypedConfirmation} to confirm`}
            />
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        {pending && pendingLabel && (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {pendingLabel}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending || !confirmationSatisfied}
          >
            {pending ? (pendingLabel ?? "Working…") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
