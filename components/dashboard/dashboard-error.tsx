import { cn } from "@/lib/utils";
import React from "react";
import { ErrorState } from "@/components/shared/error-state";

interface DashboardErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function DashboardError({ onRetry, className }: DashboardErrorProps) {
  return (
    <div className={cn("py-12", className)}>
      <ErrorState
        title="Could not load dashboard"
        description="We were unable to retrieve your dashboard data. This may be temporary."
        retryLabel="Retry"
        onRetry={onRetry}
      />
    </div>
  );
}
