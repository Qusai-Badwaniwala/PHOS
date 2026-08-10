import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

interface BackupEmptyProps {
  className?: string;
}

export function BackupEmpty({ className }: BackupEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/*
        The page keeps its own title in the empty state.

        Every empty component returned *before* its page rendered
        `PageHeader`, so an empty screen lost its heading entirely: the
        outline went straight from the `TopNav` h1 to the empty state's
        h3, skipping a rank, and the user was left on a page that no
        longer said what it was. The empty state is the one moment a
        screen most needs to identify itself.
      */}
      <PageHeader
        title="Backup & Restore"
        description="Protect your progress. Your data belongs entirely to you."
      />

      <EmptyState
        title="Backup not available"
        description="Backup functionality will be enabled once your data is initialized."
      />
    </div>
  );
}
