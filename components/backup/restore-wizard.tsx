"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { restoreBackup } from "@/lib/api/backup";
import { clearAllAssignments } from "@/lib/api/activeSession";
import { useSettings } from "@/providers/settings-provider";
import { Upload, FileCheck, AlertTriangle } from "lucide-react";
import type { BackupEntryDTO } from "@/types/dto";

interface RestoreWizardProps {
  entries?: BackupEntryDTO[];
  onRestored: () => void;
  className?: string;
}

/**
 * Restores the database from one of the backups PHOS has already
 * created.
 *
 * It deliberately does *not* offer a file picker. `PersistenceEngine`
 * restores by backup id from its own verified, manifest-checked backup
 * directory — it has no way to accept an arbitrary database file, and
 * pretending otherwise is what the previous version of this screen did.
 * Bringing data in from a file is a different operation with different
 * guarantees, and it lives in Import.
 */
export function RestoreWizard({ entries, onRestored, className }: RestoreWizardProps) {
  const { reload } = useSettings();
  const [selectedId, setSelectedId] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<string | null>(null);

  const available = entries ?? [];
  const selected = available.find((entry) => entry.id === selectedId);

  const handleRestore = async () => {
    if (!selectedId) return;
    setPending(true);
    setError(null);
    try {
      await restoreBackup(selectedId);

      // The restored database describes different sessions than the
      // ones this browser has cached, and may carry a different theme.
      clearAllAssignments();
      await reload();

      setOutcome(
        `Restored from the backup taken ${selected?.date ?? "earlier"}. A safety copy of the previous database was saved first and is listed below.`,
      );
      setConfirmOpen(false);
      setSelectedId("");
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore backup.");
    } finally {
      setPending(false);
    }
  };

  return (
    <ContentCard className={cn(className)}>
      <div className="mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Restore</h3>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Return PHOS to the state it was in when one of your backups was taken.
        </p>

        {available.length === 0 ? (
          <EmptyState
            title="No backups to restore from"
            description="Create a backup first — it will appear here."
          />
        ) : (
          <>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a backup" />
              </SelectTrigger>
              <SelectContent>
                {available.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {`${entry.date} · ${entry.size}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedId && (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Restoring replaces all current data with the backup contents. A safety copy of the
                  current database is taken first.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              disabled={!selectedId || pending}
              onClick={() => setConfirmOpen(true)}
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Restore Backup
            </Button>
          </>
        )}

        {outcome && (
          <p role="status" className="text-sm text-muted-foreground">
            {outcome}
          </p>
        )}
        {error && !confirmOpen && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) setError(null);
        }}
        title="Restore Backup"
        description={`This replaces all current PHOS data with the backup taken ${selected?.date ?? ""}. A safety copy of the current database is created first, so this can be undone.`}
        confirmLabel="Restore"
        destructive
        onConfirm={handleRestore}
        pending={pending}
        pendingLabel="Backing up, then restoring…"
        errorMessage={error}
      />
    </ContentCard>
  );
}
