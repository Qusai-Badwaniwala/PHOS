import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyProps {
  className?: string;
}

export function AnalyticsEmpty({ className }: AnalyticsEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <EmptyState
        title="Analytics not available"
        description="Complete more sessions to unlock meaningful insights about your memorization journey."
      />
      <div className="flex justify-center gap-2">
        <Button asChild>
          <Link href="/session">Start a Session</Link>
        </Button>
      </div>
    </div>
  );
}
