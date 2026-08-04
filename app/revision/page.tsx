"use client";

import React from "react";
import { RevisionHeader } from "@/components/revision/revision-header";
import { RevisionAssignment } from "@/components/revision/revision-assignment";
import { RevisionControls } from "@/components/revision/revision-controls";
import { RevisionSummary } from "@/components/revision/revision-summary";
import { RevisionEmpty } from "@/components/revision/revision-empty";
import { ContentCard } from "@/components/shared/content-card";
import { StudyLayout } from "@/components/shared/study-layout";
import { RevisionSkeleton } from "@/components/revision/revision-skeleton";
import { RevisionError } from "@/components/revision/revision-error";
import { WeakPageSelector } from "@/components/shared/weak-page-selector";
import { useRevision } from "@/lib/hooks/use-revision";
import { useSettings } from "@/providers/settings-provider";
import { startRevision, completeRevision, finishRevisionLater } from "@/lib/api/revision";
import type { CompletionProgress } from "@/lib/api/activeSession";
import type { RevisionStatus } from "@/types/dto";

export default function RevisionPage() {
  const { data, loading, error, refetch } = useRevision();
  const { settings } = useSettings();
  const [status, setStatus] = React.useState<RevisionStatus>("not_started");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [progress, setProgress] = React.useState<CompletionProgress | null>(null);
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
      await startRevision();
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start revision.");
    } finally {
      setPending(false);
    }
  };

  const handleComplete = async () => {
    setActionError(null);
    setPending(true);
    setProgress(null);
    try {
      // Records one page at a time, so progress is surfaced rather than
      // leaving the user looking at an unresponsive button.
      await completeRevision(setProgress, weakPageIds);
      await refetch();
      setStatus("completed");
    } catch (err) {
      // Whatever was recorded before the failure stays recorded, and
      // retrying resumes from that point rather than replaying.
      setActionError(
        err instanceof Error
          ? `${err.message} Your progress so far has been saved — you can try again.`
          : "Failed to complete revision.",
      );
      await refetch();
    } finally {
      setPending(false);
      setProgress(null);
    }
  };

  const handleFinishLater = async () => {
    setActionError(null);
    setPending(true);
    try {
      await finishRevisionLater();
      await refetch();
      setStatus("interrupted");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to end revision.");
    } finally {
      setPending(false);
    }
  };

  const pendingLabel = progress
    ? `Saving page ${progress.completed} of ${progress.total}…`
    : undefined;

  if (loading) return <RevisionSkeleton />;
  if (error) return <RevisionError onRetry={refetch} />;
  if (!data)
    return (
      <div className="pb-20 lg:pb-0">
        <RevisionEmpty />
      </div>
    );

  return (
    <div className="pb-20 lg:pb-0">
      <StudyLayout
        header={
          <RevisionHeader title={data.title} status={status} estimatedTime={data.estimatedTime} />
        }
        controls={
          <RevisionControls
            status={status}
            onStart={handleStart}
            onPause={() => setStatus("paused")}
            onResume={() => setStatus("in_progress")}
            onComplete={handleComplete}
            onFinishLater={handleFinishLater}
            pending={pending}
            pendingLabel={pendingLabel}
          />
        }
        mainContent={
          <>
            <RevisionAssignment assignment={data.assignment} studyPages={data.studyPages} />

            {/* Shown once revision is under way — there is nothing to
                report on before it has started. */}
            {(status === "in_progress" || status === "paused") && (
              <WeakPageSelector
                pages={data.studyPages}
                selected={weakPageIds}
                onToggle={toggleWeakPage}
                disabled={pending}
              />
            )}

            <ContentCard>
              <h3 className="mb-3 font-semibold">Revision Guidance</h3>
              <p className="text-sm text-muted-foreground">
                Recite from memory using your physical Mushaf for verification. Mark each page as
                you complete it. Take your time — accuracy matters more than speed.
              </p>
              {actionError && <p className="mt-2 text-sm text-destructive">{actionError}</p>}
            </ContentCard>
          </>
        }
        progressCurrent={data.progress.current}
        progressTotal={data.progress.total}
        progressLabel="Pages Revised"
        timerValue={status === "not_started" ? "00:00" : undefined}
        statusValue={status}
        showProgress={settings.revision.showProgress}
        goalContent={
          <p>
            Review all assigned pages with full recall. If a page feels weak, spend extra time on it
            before marking complete.
          </p>
        }
        summaryContent={
          status === "completed" ? (
            <RevisionSummary
              duration={data.duration ? `${data.duration} min` : undefined}
              pagesRevised={data.progress.total}
            />
          ) : undefined
        }
      />
    </div>
  );
}
