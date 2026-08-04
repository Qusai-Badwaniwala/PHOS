"use client";

import React from "react";
import { SessionHeader } from "@/components/session/session-header";
import { AssignmentCard } from "@/components/session/assignment-card";
import { SessionControls } from "@/components/session/session-controls";
import { SessionSummary } from "@/components/session/session-summary";
import { SessionEmpty } from "@/components/session/session-empty";
import { ContentCard } from "@/components/shared/content-card";
import { StudyLayout } from "@/components/shared/study-layout";
import { SessionSkeleton } from "@/components/session/session-skeleton";
import { SessionError } from "@/components/session/session-error";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { WeakPageSelector } from "@/components/shared/weak-page-selector";
import { useSession } from "@/lib/hooks/use-session";
import { useSettings } from "@/providers/settings-provider";
import { startSession, completeSession, finishSessionLater } from "@/lib/api/session";
import type { CompletionProgress } from "@/lib/api/activeSession";
import type { SessionStatus } from "@/types/dto";

export default function SessionPage() {
  const { data, loading, error, refetch } = useSession();
  const { settings } = useSettings();
  const [status, setStatus] = React.useState<SessionStatus>("not_started");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [progress, setProgress] = React.useState<CompletionProgress | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  // Pages the user flagged as shaky. Empty is the normal, expected case.
  const [weakPageIds, setWeakPageIds] = React.useState<Set<string>>(new Set());

  const toggleWeakPage = (pageId: string) =>
    setWeakPageIds((current) => {
      const next = new Set(current);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });

  React.useEffect(() => {
    if (data) {
      setStatus(data.status);
    }
  }, [data]);

  const handleStart = async () => {
    setActionError(null);
    setPending(true);
    try {
      await startSession();
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start session.");
    } finally {
      setPending(false);
    }
  };

  const handleComplete = async () => {
    setActionError(null);
    setPending(true);
    setProgress(null);
    setConfirmOpen(false);
    try {
      // Completion records one page at a time, so it can take a few
      // seconds on a full assignment. Progress is surfaced rather than
      // leaving the user looking at an unresponsive button.
      await completeSession(setProgress, weakPageIds);
      await refetch();
      setStatus("completed");
    } catch (err) {
      // Whatever was recorded before the failure stays recorded, and
      // retrying resumes from that point rather than replaying.
      setActionError(
        err instanceof Error
          ? `${err.message} Your progress so far has been saved — you can try again.`
          : "Failed to complete session.",
      );
      await refetch();
    } finally {
      setPending(false);
      setProgress(null);
    }
  };

  // "Confirm Completion" in Settings puts a dialog in front of the
  // irreversible step; with it off, the button acts immediately.
  const requestComplete = () => {
    if (settings.session.confirmCompletion) {
      setConfirmOpen(true);
      return;
    }
    void handleComplete();
  };

  const handleFinishLater = async () => {
    setActionError(null);
    setPending(true);
    try {
      // Closes the session with whatever was recorded. Pages never
      // studied stay unstudied and are rescheduled normally — "completed
      // work remains persisted; incomplete work remains incomplete."
      await finishSessionLater();
      await refetch();
      setStatus("interrupted");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to end session.");
    } finally {
      setPending(false);
    }
  };

  const pendingLabel = progress
    ? `Saving page ${progress.completed} of ${progress.total}…`
    : undefined;

  if (loading) return <SessionSkeleton />;
  if (error) return <SessionError onRetry={refetch} />;
  if (!data)
    return (
      <div className="pb-20 lg:pb-0">
        <SessionEmpty />
      </div>
    );

  return (
    <div className="pb-20 lg:pb-0">
      <StudyLayout
        header={
          <SessionHeader title={data.title} status={status} estimatedTime={data.estimatedTime} />
        }
        controls={
          <SessionControls
            status={status}
            onStart={handleStart}
            onPause={() => setStatus("paused")}
            onResume={() => setStatus("in_progress")}
            onComplete={requestComplete}
            onFinishLater={handleFinishLater}
            pending={pending}
            pendingLabel={pendingLabel}
          />
        }
        mainContent={
          <>
            <AssignmentCard assignment={data.assignment} studyPages={data.studyPages} />

            {/* Shown once the session is under way — there is nothing
                to report on before it has started. */}
            {(status === "in_progress" || status === "paused") && (
              <WeakPageSelector
                pages={data.studyPages}
                selected={weakPageIds}
                onToggle={toggleWeakPage}
                disabled={pending}
              />
            )}

            <ContentCard>
              <h3 className="mb-3 font-semibold">Session Notes</h3>
              <p className="text-sm text-muted-foreground">
                Use your physical Mushaf for memorization. PHOS tracks your progress while you focus
                on the Quran.
              </p>
              {actionError && <p className="mt-2 text-sm text-destructive">{actionError}</p>}
            </ContentCard>
          </>
        }
        progressCurrent={data.progress.current}
        progressTotal={data.progress.total}
        progressLabel="Pages Completed"
        timerValue={data.timer}
        statusValue={status}
        showTimer={settings.session.showTimer}
        showProgress={settings.session.showProgress}
        goalContent={
          <p>
            Memorize assigned pages with proper Tajweed. Review previous Sabaq before proceeding.
          </p>
        }
        summaryContent={
          status === "completed" ? (
            <SessionSummary
              duration={data.duration ? `${data.duration} min` : undefined}
              pagesCompleted={data.progress.total}
            />
          ) : undefined
        }
      />

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Complete Session"
        description="This records every page in today's assignment and closes the session. You can turn this confirmation off in Settings."
        confirmLabel="Complete Session"
        onConfirm={handleComplete}
        pending={pending}
        pendingLabel={pendingLabel}
      />
    </div>
  );
}
