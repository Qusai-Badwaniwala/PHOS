"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logMemorizedOutside } from "@/lib/api/pages";
import { NotebookPen } from "lucide-react";

interface LogOutsideWorkProps {
  onLogged: () => void;
  className?: string;
}

/**
 * Records memorization done away from PHOS
 * (PRODUCT_REQUIREMENTS Requirement 9, "Logging memorization completed
 * outside PHOS").
 *
 * The framing matters as much as the feature. Requirement 9 states
 * "The user always has final authority. PHOS recommends. The user
 * decides." — so this is presented as PHOS catching up with the user,
 * never as the user justifying a deviation. There is no warning, no
 * confirmation, and nothing that treats working ahead as a problem.
 */
export function LogOutsideWork({ onLogged, className }: LogOutsideWorkProps) {
  const [open, setOpen] = React.useState(false);
  const [count, setCount] = React.useState(1);
  const [pending, setPending] = React.useState(false);
  const [outcome, setOutcome] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    setOutcome(null);
    try {
      const result = await logMemorizedOutside({ count });
      setOutcome(
        result.loggedPages === 0
          ? "Those pages were already being tracked, so nothing changed."
          : `Recorded ${result.loggedPages} page${result.loggedPages === 1 ? "" : "s"}. They will appear in your revision schedule.`,
      );
      setOpen(false);
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record those pages.");
    } finally {
      setPending(false);
    }
  };

  return (
    <ContentCard className={cn(className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <NotebookPen
            className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">Memorized something away from PHOS?</p>
            <p className="text-xs text-muted-foreground">
              Record it here and PHOS will fold it into your revision schedule.
            </p>
          </div>
        </div>

        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Log pages
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="outside-page-count" className="text-xs text-muted-foreground">
              Pages memorized
            </label>
            <Input
              id="outside-page-count"
              type="number"
              min={1}
              max={604}
              className="w-28"
              value={count}
              onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))}
            />
          </div>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Recording…" : "Record"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            These are taken as the next {count} page{count === 1 ? "" : "s"} in your memorization
            order. Pages PHOS already tracks are left exactly as they are.
          </p>
        </div>
      )}

      {outcome && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {outcome}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </ContentCard>
  );
}
