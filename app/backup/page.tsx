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

      <div className="grid gap-6 lg:grid-cols-2">
        <BackupStatusCard
          status={data?.status}
          lastBackup={data?.lastBackup}
          onCreate={handleCreate}
          creating={creating}
          error={createError}
        />
        <RestoreWizard entries={data?.history} onRestored={refetch} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImportWizard onImported={refetch} />
        <ExportWizard />
      </div>

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
