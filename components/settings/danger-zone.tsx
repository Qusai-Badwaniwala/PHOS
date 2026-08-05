"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { useSettings } from "@/providers/settings-provider";
import { clearAllAssignments } from "@/lib/api/activeSession";
import { DATA_RESET_CONFIRMATION, resetAllData, resetSettings } from "@/lib/api/settings";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface DangerZoneProps {
  className?: string;
}

type DialogKind = "reset" | "delete" | null;

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
      setOutcome("All settings have been restored to their defaults.");
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

  return (
    <div className={cn(className)}>
      <ContentCard className="border-destructive/50">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          A backup is taken automatically before anything is deleted, so nothing here is truly
          unrecoverable — but treat it as if it were.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Reset All Settings</p>
              <p className="text-xs text-muted-foreground">
                Restore default configuration. Your memorization data is not affected.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpenDialog("reset")}>
              Reset
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Delete Local Data</p>
              <p className="text-xs text-muted-foreground">
                Erase every session, recall record and page of progress from this device.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setOpenDialog("delete")}>
              Delete
            </Button>
          </div>
        </div>

        {outcome && (
          <div
            role="status"
            className="mt-6 flex gap-2 rounded-md border border-border bg-muted p-3 text-sm"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">{outcome}</p>
          </div>
        )}
      </ContentCard>

      <ConfirmationDialog
        open={openDialog === "reset"}
        onOpenChange={(next) => (next ? setOpenDialog("reset") : closeDialog())}
        title="Reset Settings"
        description="This restores every setting to its default value. Your memorization data, sessions and progress are not affected."
        confirmLabel="Reset Settings"
        onConfirm={handleResetSettings}
        pending={pending}
        pendingLabel="Resetting…"
        errorMessage={error}
      />

      <ConfirmationDialog
        open={openDialog === "delete"}
        onOpenChange={(next) => (next ? setOpenDialog("delete") : closeDialog())}
        title="Delete Local Data"
        description="This permanently deletes every session, recall record and page of progress. A verified backup is created first and will appear on the Backup page, so this can be undone from there — but nothing else will bring it back."
        confirmLabel="Delete Everything"
        destructive
        requireTypedConfirmation={DATA_RESET_CONFIRMATION}
        onConfirm={handleDeleteData}
        pending={pending}
        pendingLabel="Backing up, then deleting…"
        errorMessage={error}
      />
    </div>
  );
}
