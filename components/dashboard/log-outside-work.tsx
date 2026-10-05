"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { logMemorizedOutside } from "@/lib/api/pages";
import { NotebookPen } from "lucide-react";
export function LogOutsideWork({
  onLogged,
  className,
}: {
  onLogged: () => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [count, setCount] = React.useState("1");
  const [pending, setPending] = React.useState(false);
  const [outcome, setOutcome] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const valid = Number.isInteger(Number(count)) && Number(count) >= 1 && Number(count) <= 604;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await logMemorizedOutside({ count: Number(count) });
      setOutcome(
        result.loggedPages === 0
          ? "Those pages were already being tracked, so nothing changed."
          : `Recorded ${result.loggedPages} page${result.loggedPages === 1 ? "" : "s"}. They will appear in your revision schedule.`,
      );
      setOpen(false);
      onLogged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not record those pages.");
    } finally {
      setPending(false);
    }
  };
  return (
    <section className={cn("folio-section", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <NotebookPen size={18} className="text-muted-foreground mb-3" aria-hidden="true" />
          <h2 className="text-base font-semibold">Study away from PHOS</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Bring your record up to date with what you have learned.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          Log pages
        </Button>
      </div>
      {outcome && (
        <p role="status" className="text-muted-foreground mt-3 text-sm">
          {outcome}
        </p>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Memorized away from PHOS</DialogTitle>
            <DialogDescription>
              PHOS recommends. You decide. Record your next pages so they can join your revision
              schedule.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <label className="block space-y-2 text-sm">
              <span>Pages memorized</span>
              <Input
                type="number"
                min={1}
                max={604}
                step={1}
                className="h-12"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
                disabled={pending}
              />
            </label>
            <p className="text-muted-foreground text-sm">
              These are the next {valid ? count : "selected"} pages in your memorization order.
              Pages already tracked keep their memory record.
            </p>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !valid}>
                {pending ? "Recording…" : "Record pages"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
