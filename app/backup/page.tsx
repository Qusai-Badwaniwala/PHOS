"use client";
import React from "react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { BackupStatusCard } from "@/components/backup/backup-status-card";
import { RestoreWizard } from "@/components/backup/restore-wizard";
import { ImportWizard } from "@/components/backup/import-wizard";
import { ExportWizard } from "@/components/backup/export-wizard";
import { BackupHistoryTable } from "@/components/backup/backup-history-table";
import { BackupSkeleton } from "@/components/backup/backup-skeleton";
import { BackupError } from "@/components/backup/backup-error";
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
      setCreateError(err instanceof Error ? err.message : "Could not create the restore point.");
    } finally {
      setCreating(false);
    }
  };
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteBackup(id);
      await refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not remove the restore point.");
    } finally {
      setDeletingId(null);
    }
  };
  if (loading && !data) return <BackupSkeleton />;
  if (error) return <BackupError onRetry={refetch} />;
  return (
    <PageContent>
      <PageHeader
        title="Protect your Hifz record"
        description="An exported file is the copy you can carry to another device."
      />
      <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
        <ExportWizard onExported={refetch} />
        <aside className="border-l-2 pl-5">
          <h2 className="eyebrow">Your record stays here</h2>
          <p className="text-muted-foreground mt-3 text-sm">
            PHOS stores your record in this browser. An exported file survives clearing browser
            data. Restore points stay inside the browser.
          </p>
          <dl className="mt-5">
            <dt className="text-muted-foreground text-sm">Last exported file</dt>
            <dd className="mt-1 font-medium">{data?.lastExport ?? "No export date recorded"}</dd>
          </dl>
        </aside>
      </div>
      <div className="folio-section">
        <ImportWizard onImported={refetch} />
      </div>
      <div className="folio-section">
        <h2 className="mb-6 font-serif text-2xl">Restore points on this device</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <BackupStatusCard
            status={data?.status}
            lastBackup={data?.lastBackup}
            lastExport={data?.lastExport}
            onCreate={() => void handleCreate()}
            creating={creating}
            error={createError}
          />
          <RestoreWizard entries={data?.history} onRestored={refetch} />
        </div>
      </div>
      <BackupHistoryTable
        entries={data?.history}
        onDelete={(id) => void handleDelete(id)}
        deletingId={deletingId}
      />
      {deleteError && (
        <p role="alert" className="text-destructive">
          {deleteError}
        </p>
      )}
    </PageContent>
  );
}
