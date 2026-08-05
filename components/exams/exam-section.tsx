"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/shared/content-card";
import { ExamLadder } from "./exam-ladder";
import { ExamRunUpCard } from "./exam-run-up";
import { ScheduleExamDialog, type ScheduleExamRequest } from "./schedule-exam-dialog";
import { RecordPastExamDialog, type PastExamRequest } from "./record-past-exam-dialog";
import {
  cancelExam,
  getExamOverview,
  markExamPassed,
  recordPastExam,
  scheduleExam,
} from "@/lib/api/exams";
import { GraduationCap } from "lucide-react";
import type { ExamOverviewDTO, ExamStageCardDTO } from "@/types/dto";

interface ExamSectionProps {
  className?: string;
  /** Called after any change, so the Dashboard can refresh the day's plan. */
  onChanged?: () => void;
}

/**
 * The exam section of the Dashboard.
 *
 * Loads its own data rather than taking it from the Dashboard's
 * payload. Exams change the *whole* plan, so every action here has to
 * refresh the Dashboard too — passing that through props would have the
 * Dashboard re-fetching everything on each toggle of a schedule view.
 */
export function ExamSection({ className, onChanged }: ExamSectionProps) {
  const [overview, setOverview] = React.useState<ExamOverviewDTO | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [dialogStage, setDialogStage] = React.useState<ExamStageCardDTO | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [recordError, setRecordError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setOverview(await getExamOverview());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load your exams.");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<ExamOverviewDTO>) => {
    setPending(true);
    try {
      setOverview(await action());
      onChanged?.();
      return true;
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Something went wrong.");
      return false;
    } finally {
      setPending(false);
    }
  };

  const openDialog = (stage: ExamStageCardDTO | null) => {
    setDialogStage(stage);
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleRecordPast = async (request: PastExamRequest) => {
    setRecordError(null);
    try {
      setOverview(await recordPastExam(request));
      setRecordOpen(false);
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : "Could not record that exam.");
    }
  };

  const handleSchedule = async (request: ScheduleExamRequest) => {
    const ok = await run(() =>
      scheduleExam({
        stage: request.stage,
        juzNumbers: request.juzNumbers,
        examDate: request.examDate,
        includeNewMemorization: request.includeNewMemorization,
      }),
    );
    if (ok) setDialogOpen(false);
  };

  if (loadError) {
    return (
      <ContentCard className={cn(className)}>
        <p role="alert" className="text-sm text-muted-foreground">
          {loadError}
        </p>
      </ContentCard>
    );
  }

  if (!overview) return null;

  const hasActiveExam = overview.runUp !== null;

  return (
    <div className={cn("space-y-4", className)}>
      {overview.runUp && (
        <ExamRunUpCard
          runUp={overview.runUp}
          pending={pending}
          onMarkPassed={() => void run(() => markExamPassed(overview.runUp!.exam.id))}
          onCancel={() => void run(() => cancelExam(overview.runUp!.exam.id))}
        />
      )}

      {/*
        Reported once the exam is over, never during it. A student a week
        from an exam cannot act on "eleven pages are slipping", and
        telling them would divide their attention at the worst moment.
      */}
      {overview.aftermath && (
        <ContentCard>
          <p className="text-sm">{overview.aftermath.summary}</p>
          {overview.aftermath.weakestPageNumbers.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Starting with {overview.aftermath.weakestPageNumbers.join(", ")}.
            </p>
          )}
        </ContentCard>
      )}

      <ContentCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h3 className="font-semibold">Exam roadmap</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={hasActiveExam || pending}
              onClick={() => openDialog(null)}
            >
              Self exam
            </Button>
            {/*
              Always available, including while an exam is scheduled: a
              completed exam competes for no days, so the one-at-a-time
              rule has nothing to protect here.
            */}
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                setRecordError(null);
                setRecordOpen(true);
              }}
            >
              Add a past exam
            </Button>
          </div>
        </div>

        <ExamLadder
          stages={overview.stages}
          // One exam at a time: two coverage schedules would compete for
          // the same days and neither would be honoured.
          onSchedule={hasActiveExam ? null : openDialog}
        />

        {hasActiveExam && (
          <p className="mt-4 text-xs text-muted-foreground">
            Mark your current exam passed or cancel it before scheduling another.
          </p>
        )}
      </ContentCard>

      {/*
        Every exam the user has passed.

        The ladder can only show the eight fixed stages, so a Self Exam
        had nowhere at all to appear — pass one and the record of it
        vanished from the application entirely. Anything a user marks as
        an achievement has to leave a trace, and a Self Exam is the only
        kind that has no other home.
      */}
      {overview.past.length > 0 && (
        <ContentCard>
          <h3 className="mb-3 font-semibold">Exams you have passed</h3>
          <ul className="space-y-2">
            {overview.past.map((exam) => (
              <li
                key={exam.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border/50 pb-2 text-sm last:border-0 last:pb-0"
              >
                <span className="font-medium">
                  {exam.stage === null
                    ? exam.scopeLabel
                    : `Stage ${exam.stage} · ${exam.scopeLabel}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {exam.stage === null && "Your own exam · "}
                  {/*
                    A recorded exam with no date says so rather than
                    showing a guess. "Before you started PHOS" is the
                    honest limit of what the user told it.
                  */}
                  {exam.examDate ?? "Before you started PHOS"}
                </span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      <RecordPastExamDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onRecord={handleRecordPast}
        error={recordError}
      />

      <ScheduleExamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stage={dialogStage}
        onSchedule={handleSchedule}
        error={dialogError}
      />
    </div>
  );
}
