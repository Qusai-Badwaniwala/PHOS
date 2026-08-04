import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";

interface BackupEmptyProps {
  className?: string;
}

export function BackupEmpty({ className }: BackupEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <EmptyState
        title="Backup not available"
        description="Backup functionality will be enabled once your data is initialized."
      />
    </div>
  );
}
