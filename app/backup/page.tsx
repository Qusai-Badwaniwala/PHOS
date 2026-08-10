"use client";

import React from "react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { BackupStatusCard } from "@/components/backup/backup-status-card";
import { RestoreWizard } from "@/components/backup/restore-wizard";
import { ImportWizard } from "@/components/backup/import-wizard";
import { ExportWizard } from "@/components/backup/export-wizard";
import { BackupHistoryTable } from "@/components/backup/backup-history-table";
import { StorageNotice } from "@/components/backup/storage-notice";
import { BackupSkeleton } from "@/components/backup/backup-skeleton";
import { BackupError } from "@/components/backup/backup-error";
import { Separator } from "@/components/ui/separator";
import { ShieldAlert } from "lucide-react";
import { useBackup } from "@/lib/hooks/use-backup";
import { createBackup, deleteBackup } from "@/lib/api/backup";

export default function BackupPage() {
  const { data, loading, error, refetch } = useBackup();
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      await createBackup();
      await refetch();
    } catch (err) {
      // `createBackup()` verifies what it wrote and discards anything
      // that fails, so a failure here means no backup was recorded —
      // never a silently corrupt one.
      setCreateError(err instanceof Error ? err.message : "Failed to create backup.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (backupId: string) => {
    setDeletingId(backupId);
    setDeleteError(null);
    try {
      await deleteBackup(backupId);
      await refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete backup.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <BackupSkeleton />;
  if (error) return <BackupError onRetry={refetch} />;

  return (
    <PageContent>
      <PageHeader
        title="Backup & Restore"
        description="Protect your progress. Your data belongs entirely to you."
      />

      <StorageNotice />

      {/*
        Export leads this page, and everything else follows it.

        The order used to be Status → Create Backup → Restore → Import →
        Export, which put the only copy that survives a cleared browser
        fourth, below the fold on a phone, styled as an outline button —
        while "Create Backup", which writes into the very IndexedDB this
        page warns may be cleared, was the first thing offered and the
        emphatic one. A user doing the obvious thing here came away with
        a false sense of safety, on a product with no server and no way
        to recover anything for them.

        This is the one screen in PHOS where the wrong default is
        unrecoverable, so the ordering is the design.
      */}
      {data?.neverExported && (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-warning/40 bg-warning-muted p-4"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">
              You have never exported your Hifz record
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything PHOS knows about your memorization lives in this browser, on this device.
              Clearing its data would erase it, and there is no server and no account that could
              bring it back. Export a file and keep it somewhere you would keep anything else you
              could not replace.
            </p>
          </div>
        </div>
      )}

      <ExportWizard onExported={refetch} />

      <Separator />

      {/*
        Restore points, framed as what they are. They are genuinely
        useful — an accidental reset is undoable from here — but they
        live in the same storage as everything else, so they are grouped
        below the export rather than beside it.
      */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BackupStatusCard
          status={data?.status}
          lastBackup={data?.lastBackup}
          lastExport={data?.lastExport}
          onCreate={handleCreate}
          creating={creating}
          error={createError}
        />
        <RestoreWizard entries={data?.history} onRestored={refetch} />
      </div>

      <ImportWizard onImported={refetch} />

      <Separator />

      <BackupHistoryTable entries={data?.history} onDelete={handleDelete} deletingId={deletingId} />
      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}
    </PageContent>
  );
}
