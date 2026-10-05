"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { useSettings } from "@/providers/settings-provider";
import { clearAllAssignments } from "@/lib/api/activeSession";
import {
  DATA_RESET_CONFIRMATION,
  APPLICATION_RESET_CONFIRMATION,
  resetAllData,
  resetApplication,
  resetSettings,
} from "@/lib/api/settings";
import Link from "next/link";
import { returnToOnboarding } from "@/lib/record-change";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface DangerZoneProps {
  className?: string;
}

type DialogKind = "reset" | "delete" | "fresh" | null;

export function DangerZone({ className }: DangerZoneProps) {
  const { reload } = useSettings();
  const [openDialog, setOpenDialog] = React.useState<DialogKind>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<string | null>(null);

  const closeDialog = () => {
    setOpenDialog(null);
    setError(null);
  };

  const handleResetSettings = async () => {
    setPending(true);
    setError(null);
    try {
      await resetSettings();
      await reload();
      setOutcome("Appearance, format and study preferences have been restored to their defaults.");
      setOpenDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset settings.");
    } finally {
      setPending(false);
    }
  };

  const handleDeleteData = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await resetAllData();

      // The cached page lists describe sessions that have just been
      // deleted. Left in place, the UI would offer to resume one.
      clearAllAssignments();

      setOutcome(
        `Deleted ${result.deletedRecallEvents} recall record(s), ${result.deletedSessions} session(s) and ${result.deletedExams} exam(s), and reset ${result.resetPages} pages. ` +
          `A verified backup was taken first and is listed on the Backup page, so this can still be undone.`,
      );
      setOpenDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete data.");
    } finally {
      setPending(false);
    }
  };
  const handleFreshStart = async () => {
    setPending(true);
    setError(null);
    try {
      await resetApplication(APPLICATION_RESET_CONFIRMATION);
      returnToOnboarding();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PHOS could not reset. Your record was kept.");
      setPending(false);
    }
  };

  return (
    <div className={cn(className)}>
      <ContentCard className="border-destructive/50">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="text-destructive h-5 w-5" aria-hidden="true" />
          <h3 className="text-destructive text-lg font-semibold">Danger Zone</h3>
        </div>
        <p className="text-muted-foreground mb-6 text-sm">
          Deleting progress first creates a verified restore point in this browser. Export a file
          too if you need a copy that survives clearing browser data.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Reset preferences</p>
              <p className="text-muted-foreground text-xs">
                Restore appearance, formats and study controls. Your Hifz, roadmap and goals stay.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpenDialog("reset")}>
              Reset
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Reset progress</p>
              <p className="text-muted-foreground text-xs">
                Clear progress, study history and exams. Keep setup, roadmap, settings and restore
                points.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setOpenDialog("delete")}>
              Reset progress
            </Button>
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Start PHOS fresh</p>
              <p className="text-muted-foreground text-xs">
                Remove all PHOS data, including settings and local restore points, and return to
                onboarding. Other apps on this site are left alone.
              </p>
              <Link
                href="/backup"
                className="text-primary inline-flex min-h-11 items-center text-sm underline underline-offset-4"
              >
                Export your record first
              </Link>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setOpenDialog("fresh")}>
              Reset PHOS
            </Button>
          </div>
        </div>

        {outcome && (
          <div
            role="status"
            className="border-border bg-muted mt-6 flex gap-2 rounded-md border p-3 text-sm"
          >
            <CheckCircle2 className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-muted-foreground">{outcome}</p>
          </div>
        )}
      </ContentCard>

      <ConfirmationDialog
        open={openDialog === "reset"}
        onOpenChange={(next) => (next ? setOpenDialog("reset") : closeDialog())}
        title="Reset preferences"
        description="Restore appearance, date and time formats, and study controls. Your Hifz, setup, roadmap, goal and revision schedule stay."
        confirmLabel="Reset preferences"
        onConfirm={handleResetSettings}
        pending={pending}
        pendingLabel="Resetting…"
        errorMessage={error}
      />

      <ConfirmationDialog
        open={openDialog === "delete"}
        onOpenChange={(next) => (next ? setOpenDialog("delete") : closeDialog())}
        title="Reset progress"
        description="Clear every session, recall, exam and page of progress. Setup, roadmap and settings stay. PHOS first creates a verified local restore point on Protect your record, so you can undo this reset there."
        confirmLabel="Clear progress"
        destructive
        requireTypedConfirmation={DATA_RESET_CONFIRMATION}
        onConfirm={handleDeleteData}
        pending={pending}
        pendingLabel="Backing up, then deleting…"
        errorMessage={error}
      />
      <ConfirmationDialog
        open={openDialog === "fresh"}
        onOpenChange={(next) => (next ? setOpenDialog("fresh") : closeDialog())}
        title="Start PHOS fresh"
        description="This erases all PHOS progress, sessions, exams, roadmap, settings and local restore points on this device. PHOS will reopen at onboarding. Other apps are untouched. Export a file first if you may want this record back; no local safety copy is kept."
        confirmLabel="Erase PHOS and start fresh"
        destructive
        requireTypedConfirmation={APPLICATION_RESET_CONFIRMATION}
        onConfirm={handleFreshStart}
        pending={pending}
        pendingLabel="Resetting PHOS…"
        errorMessage={error}
      />
    </div>
  );
}
