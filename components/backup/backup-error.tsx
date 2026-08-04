import { cn } from "@/lib/utils";
import React from "react";
import { ErrorState } from "@/components/shared/error-state";

interface BackupErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function BackupError({ onRetry, className }: BackupErrorProps) {
  return (
    <div className={cn("py-12", className)}>
      <ErrorState
        title="Could not load backup information"
        description="We were unable to retrieve your backup status. Please try again."
        retryLabel="Retry"
        onRetry={onRetry}
      />
    </div>
  );
}
