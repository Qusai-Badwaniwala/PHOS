import { cn } from "@/lib/utils";
import React from "react";
import { ErrorState } from "@/components/shared/error-state";

interface SessionErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function SessionError({ onRetry, className }: SessionErrorProps) {
  return (
    <div className={cn("py-12", className)}>
      <ErrorState
        title="Could not load session"
        description="We were unable to prepare your session. Please try again."
        retryLabel="Retry"
        onRetry={onRetry}
      />
    </div>
  );
}
