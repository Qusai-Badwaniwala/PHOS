import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HistoryEmptyProps {
  className?: string;
}

export function HistoryEmpty({ className }: HistoryEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <EmptyState
        title="No history yet"
        description="Complete sessions and revisions to build your activity history."
      />
      <div className="flex justify-center gap-2">
        <Button asChild>
          <Link href="/session">Start Session</Link>
        </Button>
      </div>
    </div>
  );
}
