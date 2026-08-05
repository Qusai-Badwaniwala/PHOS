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
import { TOTAL_JUZ } from "@/shared/types";
import type { ExamStageCardDTO } from "@/types/dto";

export interface ScheduleExamRequest {
  stage: number | null;
  juzNumbers: readonly number[];
  examDate: string;
  includeNewMemorization: boolean;
}

interface ScheduleExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ladder stage being booked, or `null` for a Self Exam. */
  stage: ExamStageCardDTO | null;
  onSchedule: (request: ScheduleExamRequest) => Promise<void>;
  error?: string | null;
}

/** Tomorrow, as `yyyy-mm-dd` — the earliest date an exam can be booked for. */
function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Books an exam.
 *
 * Two questions, and both are genuinely open.
 *
 * **When.** Fixed by an institution, not by PHOS, which is why it is
 * asked rather than suggested.
 *
 * **Whether to keep memorizing.** A student sitting a stage they
 * finished months ago usually keeps going; one sitting the Juz they
 * have just completed usually stops. Guessing would be wrong about half
 * the time, and wrong in a way that quietly changes weeks of work.
 *
 * A Self Exam adds a third: which Juz. The ladder is fixed because it
 * is a shared reference, and this is the escape hatch for anyone whose
 * madrasa uses a different one.
 */
export function ScheduleExamDialog({
  open,
  onOpenChange,
  stage,
  onSchedule,
  error,
}: ScheduleExamDialogProps) {
  const [examDate, setExamDate] = React.useState("");
  const [includeNew, setIncludeNew] = React.useState(true);
  const [selectedJuz, setSelectedJuz] = React.useState<readonly number[]>([]);
  const [pending, setPending] = React.useState(false);

  const isSelfExam = stage === null;

  // Reset whenever the dialog opens for a different target, so a
  // half-filled Self Exam never carries into a ladder booking.
  React.useEffect(() => {
    if (open) {
      setExamDate("");
      setIncludeNew(true);
      setSelectedJuz([]);
    }
  }, [open, stage?.stage]);

  const toggleJuz = (juz: number) => {
    setSelectedJuz((current) =>
      current.includes(juz)
        ? current.filter((n) => n !== juz)
        : [...current, juz].sort((a, b) => a - b),
    );
  };

  const canSubmit = examDate !== "" && (!isSelfExam || selectedJuz.length > 0) && !pending;

  const submit = async () => {
    setPending(true);
    try {
      await onSchedule({
        stage: stage?.stage ?? null,
        juzNumbers: isSelfExam ? selectedJuz : [],
        examDate: new Date(examDate).toISOString(),
        includeNewMemorization: includeNew,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSelfExam ? "Set your own exam" : `Schedule ${stage.label}`}</DialogTitle>
          <DialogDescription>
            PHOS will divide the whole scope evenly across the days until then, so every page is
            revised before the exam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isSelfExam && (
            <div className="space-y-2">
              <p className="text-sm font-medium" id="self-exam-juz-label">
                Which Juz
              </p>
              <div
                role="group"
                aria-labelledby="self-exam-juz-label"
                className="grid grid-cols-6 gap-1.5 sm:grid-cols-10"
              >
                {Array.from({ length: TOTAL_JUZ }, (_, index) => index + 1).map((juz) => {
                  const selected = selectedJuz.includes(juz);
                  return (
                    <button
                      key={juz}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Juz ${juz}`}
                      onClick={() => toggleJuz(juz)}
                      className={
                        selected
                          ? "rounded-md border border-primary bg-primary py-1.5 text-xs font-medium text-primary-foreground"
                          : "rounded-md border border-input bg-background py-1.5 text-xs hover:bg-accent"
                      }
                    >
                      {juz}
                    </button>
                  );
                })}
              </div>
              {selectedJuz.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedJuz.length} {selectedJuz.length === 1 ? "Juz" : "Juz"} selected
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="exam-date" className="text-sm font-medium">
              Exam date
            </label>
            <Input
              id="exam-date"
              type="date"
              value={examDate}
              min={tomorrowIso()}
              disabled={pending}
              onChange={(event) => setExamDate(event.target.value)}
              aria-label="Exam date"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">During the run-up</legend>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                name="include-new"
                className="mt-1"
                checked={includeNew}
                disabled={pending}
                onChange={() => setIncludeNew(true)}
              />
              <span>
                Keep memorizing new pages
                <span className="block text-xs text-muted-foreground">
                  Usual choice when the exam covers material you finished a while ago.
                </span>
              </span>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                name="include-new"
                className="mt-1"
                checked={!includeNew}
                disabled={pending}
                onChange={() => setIncludeNew(false)}
              />
              <span>
                Revision only
                <span className="block text-xs text-muted-foreground">
                  Usual choice when the exam covers what you have just finished.
                </span>
              </span>
            </label>
          </fieldset>

          {/*
            Said before booking, not after. Somebody who would rather
            keep their normal revision needs to know that now.
          */}
          <p className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
            While this exam is scheduled, PHOS pauses revision outside its scope — including pages
            it would normally flag as weak — so nothing competes for your attention. It will tell
            you what fell behind once you mark the exam passed.
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
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
            Schedule exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
