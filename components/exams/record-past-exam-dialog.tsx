"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EXAM_LADDER } from "@/shared/constants";
import { TOTAL_JUZ } from "@/shared/types";

export interface PastExamRequest {
  stage: number | null;
  juzNumbers: readonly number[];
  examDate: string | null;
}

interface RecordPastExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecord: (request: PastExamRequest) => Promise<void>;
  error?: string | null;
}

/** Today, as `yyyy-mm-dd` — a past exam cannot be later than this. */
function todayIso(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Records an exam the user passed before PHOS was involved.
 *
 * WHY THIS IS SEPARATE FROM SCHEDULING
 * ------------------------------------
 * Booking asks two questions this cannot: when in the future, and
 * whether to keep memorizing during the run-up. Neither has an answer
 * for something already sat. And the checks differ — scheduling refuses
 * a stage whose pages are not all memorized, because it could not build
 * a run-up; this accepts anything, because someone who passed Juz 26–30
 * two years ago and has since forgotten half of it still passed it.
 *
 * The date is optional on purpose. Nobody remembers the day they sat
 * Juz 30, and a required field would either be guessed at or would stop
 * the record being made at all.
 */
export function RecordPastExamDialog({
  open,
  onOpenChange,
  onRecord,
  error,
}: RecordPastExamDialogProps) {
  const [mode, setMode] = React.useState<"stage" | "custom">("stage");
  const [stage, setStage] = React.useState("");
  const [selectedJuz, setSelectedJuz] = React.useState<readonly number[]>([]);
  const [examDate, setExamDate] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMode("stage");
      setStage("");
      setSelectedJuz([]);
      setExamDate("");
    }
  }, [open]);

  const toggleJuz = (juz: number) => {
    setSelectedJuz((current) =>
      current.includes(juz)
        ? current.filter((n) => n !== juz)
        : [...current, juz].sort((a, b) => a - b),
    );
  };

  const canSubmit = !pending && (mode === "stage" ? stage !== "" : selectedJuz.length > 0);

  const submit = async () => {
    setPending(true);
    try {
      await onRecord({
        stage: mode === "stage" ? Number(stage) : null,
        juzNumbers: mode === "custom" ? selectedJuz : [],
        // Empty means "before PHOS, date unknown", which is stored as
        // `null` rather than as today.
        examDate: examDate === "" ? null : new Date(examDate).toISOString(),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
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
          <DialogTitle>Record an exam you already passed</DialogTitle>
          <DialogDescription>
            For exams you sat before using PHOS, or outside it. This only adds to your record — it
            does not change your scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">What did you pass?</legend>
            <label className="flex min-h-12 items-start gap-3 py-2 text-sm">
              <input
                type="radio"
                name="past-exam-mode"
                className="mt-1"
                checked={mode === "stage"}
                disabled={pending}
                onChange={() => setMode("stage")}
              />
              <span>A stage from the roadmap</span>
            </label>
            <label className="flex min-h-12 items-start gap-3 py-2 text-sm">
              <input
                type="radio"
                name="past-exam-mode"
                className="mt-1"
                checked={mode === "custom"}
                disabled={pending}
                onChange={() => setMode("custom")}
              />
              <span>Something else — I&apos;ll choose the Juz</span>
            </label>
          </fieldset>

          {mode === "stage" ? (
            <div className="space-y-2">
              <label htmlFor="past-exam-stage" className="text-sm font-medium">
                Which stage
              </label>
              <select
                id="past-exam-stage"
                value={stage}
                disabled={pending}
                onChange={(event) => setStage(event.target.value)}
                aria-label="Which stage"
                className="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Choose a stage</option>
                {EXAM_LADDER.map((definition) => (
                  <option key={definition.stage} value={String(definition.stage)}>
                    Stage {definition.stage} — {definition.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium" id="past-exam-juz-label">
                Which Juz
              </p>
              <div
                role="group"
                aria-labelledby="past-exam-juz-label"
                className="grid grid-cols-5 gap-2 sm:grid-cols-6"
              >
                {Array.from({ length: TOTAL_JUZ }, (_, index) => index + 1).map((juz) => {
                  const selected = selectedJuz.includes(juz);
                  return (
                    <button
                      key={juz}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Juz ${juz}`}
                      disabled={pending}
                      onClick={() => toggleJuz(juz)}
                      className={
                        selected
                          ? "border-primary bg-primary text-primary-foreground min-h-11 rounded-md border py-2 text-sm font-medium"
                          : "border-input bg-background hover:bg-accent min-h-11 rounded-md border py-2 text-sm"
                      }
                    >
                      {juz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="past-exam-date" className="text-sm font-medium">
              When, roughly <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="past-exam-date"
              type="date"
              value={examDate}
              max={todayIso()}
              disabled={pending}
              onChange={(event) => setExamDate(event.target.value)}
              aria-label="When, roughly"
            />
            <p className="text-muted-foreground text-xs">
              Leave this empty if you do not remember. PHOS will simply record it as passed before
              you started.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={() => void submit()}>
            Record it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
