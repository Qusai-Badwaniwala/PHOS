"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Database, Download, Clock } from "lucide-react";
import type { BackupStatus } from "@/types/dto";

interface BackupStatusCardProps {
  lastBackup?: string;
  /** Export date in this record; older snapshots can have no export metadata. */
  lastExport?: string;
  status?: BackupStatus;
  onCreate: () => void;
  creating?: boolean;
  error?: string | null;
  className?: string;
}

export function BackupStatusCard({
  lastBackup,
  lastExport,
  status = "never",
  onCreate,
  creating = false,
  error,
  className,
}: BackupStatusCardProps) {
  return (
    <ContentCard className={cn(className)}>
      <div className="mb-4 flex items-center gap-2">
        <Database className="text-muted-foreground h-5 w-5" aria-hidden="true" />
        <h3 className="font-semibold">Restore points</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Status</span>
          {status === "up_to_date" && <StatusBadge status="success">Up to date</StatusBadge>}
          {status === "outdated" && <StatusBadge status="warning">Outdated</StatusBadge>}
          {status === "never" && <StatusBadge status="neutral">None yet</StatusBadge>}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Last restore point</span>
          <span className="flex items-center gap-1 text-sm font-medium">
            {lastBackup ? (
              <>
                <Clock className="text-muted-foreground h-3.5 w-3.5" />
                {lastBackup}
              </>
            ) : (
              "—"
            )}
          </span>
        </div>

        {/*
          The export date sits beside the restore-point date on purpose.
          They were reported as one thing, which let the screen say "up
          to date" to somebody whose only copy was inside the browser
          about to be cleared.
        */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Last exported file</span>
          <span className="flex items-center gap-1 text-sm font-medium">
            {lastExport ? (
              <>
                <Clock className="text-muted-foreground h-3.5 w-3.5" />
                {lastExport}
              </>
            ) : (
              <span className="text-muted-foreground">Not recorded</span>
            )}
          </span>
        </div>

        <p className="bg-muted text-muted-foreground rounded-md p-3 text-xs leading-relaxed">
          A restore point is kept inside this browser, so it can undo an accidental reset — but it
          is erased along with everything else if this browser&apos;s data is cleared. Only an
          exported file survives that.
        </p>

        <Button variant="secondary" className="w-full" onClick={onCreate} disabled={creating}>
          <Download className="mr-2 h-4 w-4" />
          {creating ? "Creating restore point…" : "Create restore point"}
        </Button>

        {creating && (
          <p aria-live="polite" className="text-muted-foreground text-xs">
            Copying and verifying the database…
          </p>
        )}

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    </ContentCard>
  );
}
